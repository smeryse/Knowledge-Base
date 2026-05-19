import asyncio
import re
import os
import tempfile
from datetime import datetime

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from config import BOT_TOKEN, VAULT_PATH, ADMIN_ID, ACTIVE_VAULT
from obsidian import VaultManager, KitchenManager
from receipt_api import ReceiptAPI
from barcode_scanner import process_barcode, extract_barcode
from ai_normalize import AINormalizer

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
vault = VaultManager(ACTIVE_VAULT)
kitchen = KitchenManager(ACTIVE_VAULT)
receipt_api = ReceiptAPI()
ai_norm = AINormalizer()

# Pending store changes: user_id -> receipt_path
pending_store_changes = {}

# Pending receipt data for deferred commit (store asked before creation)
pending_receipt_data = {}

# Pending receipt cancellations: user_id -> {receipt, items, pantry}
pending_cancellations = {}

# EAN scanning sessions: user_id -> {store, items, message_id, chat_id}
ean_sessions = {}

# Pending QR scan (after /qr command)
pending_qr = set()

def get_month_key():
    return datetime.now().strftime("%Y-%m")

# Dev mode removed — always production
def dev_text(text):
    return text


# ============== QR SCANNING ==============

async def process_receipt_preview(message: types.Message, qr_text: str):
    processing_msg = await message.answer("⏳ Получаю чек из API...")
    
    receipt_json = receipt_api.fetch_by_qr(qr_text)
    if not receipt_json:
        await processing_msg.edit_text("❌ Не удалось получить чек.")
        return
    
    meta = receipt_api.parse_meta(receipt_json)
    meta['qr_data'] = qr_text
    items = receipt_api.parse_items(receipt_json)
    
    if not items:
        await processing_msg.edit_text("❌ Чек получен, но позиций нет.")
        return
    
    lines = ["🔍 PREVIEW — ничего не записано!"]
    lines.append(f"\n🏪 {meta.get('store', '?')}")
    lines.append(f"📅 {meta.get('date', meta.get('date_time', '?'))}")
    lines.append(f"💰 {meta.get('total', 0)/100:.2f}₽")
    lines.append(f"\n📦 {len(items)} позиций:")
    for i, item in enumerate(items, 1):
        qty = item.get('quantity', 1)
        price = item.get('price', 0) / 100
        lines.append(f"{i}. {item.get('name', '?')} — {price:.2f}₽ x{qty}")
    
    text = "\n".join(lines)
    if len(text) > 4000:
        text = text[:3900] + "\n\n... (сообщение обрезано)"
    
    await processing_msg.edit_text(text)


async def process_receipt_qr(message: types.Message, qr_text: str):
    processing_msg = await message.answer("⏳ Получаю чек из API...")
    
    receipt_json = receipt_api.fetch_by_qr(qr_text)
    if not receipt_json:
        await processing_msg.edit_text("❌ Не удалось получить чек. Проверь QR-строку.")
        return
    
    meta = receipt_api.parse_meta(receipt_json)
    meta['qr_data'] = qr_text
    items = receipt_api.parse_items(receipt_json)
    
    if not items:
        await processing_msg.edit_text("❌ Чек получен, но позиций нет.")
        return
    
    await processing_msg.edit_text(f"📝 Найдено {len(items)} поз. Ищу в базе...")
    
    try:
        prepared = kitchen.prepare_items(items, ai_norm)
        
        for entry in prepared:
            entry['add_to_pantry'] = True
        
        pending_receipt_data[message.from_user.id] = {
            'meta': meta,
            'items': prepared
        }
        
        text = _render_qr_preview(pending_receipt_data[message.from_user.id])
        await processing_msg.edit_text(
            text,
            reply_markup=_build_qr_keyboard(prepared)
        )
        
    except RuntimeError as e:
        await processing_msg.edit_text(
            f"❌ Ошибка нормализации товаров:\n{e}\n\n"
            f"Чек НЕ сохранён. Проверь API-ключ OpenRouter и попробуй снова."
        )
    except Exception as e:
        await processing_msg.edit_text(f"❌ Ошибка сохранения: {e}")
        raise


@dp.message(Command("qr"))
async def cmd_qr(message: types.Message):
    pending_qr.add(message.from_user.id)
    await message.answer(
        "📸 Отправь фото QR-кода чека."
        + "\n\nИли вставь текст QR-строки (начинается с t=...)"
    )


# ============== EAN SCANNING ==============

def _build_store_keyboard():
    stores = kitchen._load_known_stores()
    buttons = []
    for s in stores[:10]:
        buttons.append([InlineKeyboardButton(text=s, callback_data=f"ean_store|{s}")])
    buttons.append([InlineKeyboardButton(text="➕ Новый магазин", callback_data="ean_store|__new__")])
    buttons.append([InlineKeyboardButton(text="❌ Отмена", callback_data="ean_cancel")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def _build_price_keyboard(add_to_pantry=True, selected_price=None):
    prices = ["29", "39", "49", "59", "69", "79", "89", "99", "129", "149", "199", "249", "299", "399", "499"]
    rows = []
    row = []
    for i, p in enumerate(prices):
        text = f"{p}₽"
        if selected_price is not None and float(p) == selected_price:
            text = f"✅ {p}₽"
        row.append(InlineKeyboardButton(text=text, callback_data=f"ean_price|{p}"))
        if (i + 1) % 5 == 0:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    pantry_text = "🚫 Не на склад" if add_to_pantry else "✅ На склад"
    rows.append([
        InlineKeyboardButton(text=pantry_text, callback_data="ean_pantry_toggle"),
    ])
    rows.append([
        InlineKeyboardButton(text="⌨️ Своя цена", callback_data="ean_custom_price"),
        InlineKeyboardButton(text="🚫 Без цены", callback_data="ean_price|skip"),
    ])
    rows.append([
        InlineKeyboardButton(text="✅ Добавить в чек", callback_data="ean_commit_item"),
        InlineKeyboardButton(text="❌ Отменить товар", callback_data="ean_cancel_item"),
    ])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def _build_ean_control_keyboard():
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ Завершить сканирование", callback_data="ean_finish"),
        ],
        [
            InlineKeyboardButton(text="❌ Отменить сканирование", callback_data="ean_cancel"),
        ]
    ])


def _render_ean_receipt(session: dict) -> str:
    lines = [f"🏪 {session['store']}\n"]
    if not session["items"]:
        lines.append("📦 Пока нет товаров. Присылай фото штрихкодов.")
        return "\n".join(lines)
    
    total = 0.0
    pantry_count = sum(1 for item in session["items"] if item.get("add_to_pantry", True))
    lines.append(f"📦 {len(session['items'])} позиций (🗄 на склад: {pantry_count}, пропуск: {len(session['items']) - pantry_count}):\n")
    for i, item in enumerate(session["items"], 1):
        price_str = ""
        if item.get("price") is not None:
            price_str = f" — {item['price']:.0f}₽"
            total += item["price"]
        flag = "🆕" if item.get("is_new") else ""
        pantry_icon = "🗄" if item.get("add_to_pantry", True) else "🚫"
        lines.append(f"{i}. {item['name']}{price_str} {flag} {pantry_icon}")
    
    lines.append(f"\n💰 Итого: {total:.0f}₽")
    lines.append("\nПрисылай следующий штрихкод или нажми ✅ Завершить")
    return "\n".join(lines)


def _build_qr_keyboard(items: list) -> InlineKeyboardMarkup:
    rows = []
    row = []
    for i, entry in enumerate(items):
        name = entry.get('name', '?')
        pantry = entry.get('add_to_pantry', True)
        icon = "🗄" if pantry else "🚫"
        short = name[:20] + "…" if len(name) > 20 else name
        btn = InlineKeyboardButton(text=f"{icon} {i+1}. {short}", callback_data=f"qr_pantry|{i}")
        row.append(btn)
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([
        InlineKeyboardButton(text="✅ Сохранить чек", callback_data="qr_confirm"),
        InlineKeyboardButton(text="❌ Отменить", callback_data="qr_cancel"),
    ])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def _render_qr_preview(pending: dict) -> str:
    meta = pending['meta']
    items = pending['items']
    lines = [
        f"🏪 {meta.get('store', '?')}",
        f"📅 {meta.get('date', meta.get('date_time', '?'))}",
        f"💰 {meta.get('total', 0)/100:.2f}₽",
        "",
        f"📦 {len(items)} позиций. Нажми на товар, чтобы переключить склад:",
    ]
    pantry_count = sum(1 for e in items if e.get('add_to_pantry', True))
    for i, entry in enumerate(items, 1):
        name = entry.get('name', '?')
        pantry = entry.get('add_to_pantry', True)
        icon = "🗄" if pantry else "🚫"
        flag = " 🆕" if entry.get('is_new') else ""
        item_data = entry.get('item', {})
        qty = item_data.get('quantity', 1)
        price = item_data.get('sum', 0) / 100
        lines.append(f"{icon} {i}. {name}{flag} — {price:.2f}₽ x{qty}")
    lines.append(f"\n🗄 На склад: {pantry_count}, пропуск: {len(items) - pantry_count}")
    return "\n".join(lines)


def parse_input(text):
    amount_match = re.search(r'(\d+(?:\.\d+)?)', text)
    if not amount_match:
        return None, None, None
    amount = float(amount_match.group(1))
    remaining = text.replace(amount_match.group(0), '').strip().lower()
    words = remaining.split()
    banks = ['альфа', 'альфа-банк', 'тбанк', 'тинькофф', 'сбер', 'втб', 'озон', 'яндекс', 'псб', 'фора']
    category = None
    account = None
    for word in words:
        for bank in banks:
            if bank in word:
                account = bank.title()
                break
        else:
            if word and word not in ['руб', 'р', '₽', 'у']:
                category = word.title()
    return amount, category, account

@dp.message(Command("start"))
async def cmd_start(message: types.Message):

    await message.answer(

        "👋 Личный Помощник\n\n"
        "📊 Финансы:\n"
        "/balance — баланс\n"
        "/stats — статистика\n"
        "1000 продукты — добавить расход\n\n"
        "🛒 Чеки:\n"
        "/qr — сканировать QR чек\n"
        "/ean — добавить товары по штрихкоду\n"
        "/preview — предпросмотр чека (без записи)\n\n"
        "📸 Или просто отправь текст QR-строки"
    )


@dp.message(Command("preview"))
async def cmd_preview(message: types.Message):

    await message.answer(

        "🔍 Preview mode\n\n"
        "Отправь QR-строку или фото QR-кода.\n"
        "Бот покажет данные чека, но НИЧЕГО не запишет в хранилище.\n\n"
        "Отлично подходит для тестирования!"
    )

@dp.message(Command("balance"))
async def cmd_balance(message: types.Message):
    month_key = get_month_key()
    stats = vault.get_monthly_stats(month_key)
    overflow = vault.calculate_overflow(month_key)
    base_cats = vault.get_base_categories()
    lines = [f"💰 Баланс: {stats['balance']:.0f}₽"]
    lines.append(f"📈 Доход: {stats['income']:.0f}₽")
    lines.append(f"📉 Расход: {stats['expense']:.0f}₽\n")
    lines.append("⚡ Base buckets:")
    for cat in sorted(base_cats, key=lambda x: x.get('priority', 99)):
        title = cat['title']
        limit = cat.get('base_limit', 0)
        spent = stats['base_spent'].get(title, 0)
        remaining = max(0, limit - spent)
        pct = (spent / limit * 100) if limit > 0 else 0
        lines.append(f"  {title}: {spent:.0f}/{limit:.0f}₽ ({pct:.0f}%) — ост: {remaining:.0f}₽")
    lines.append(f"\n🎁 Overflow: {overflow['overflow_pool']:.0f}₽")
    for cat, amount in overflow['distribution'].items():
        lines.append(f"  {cat}: {amount}₽")
    await message.answer("\n".join(lines))


@dp.message(Command("stats"))
async def cmd_stats(message: types.Message):
    month_key = get_month_key()
    stats = vault.get_monthly_stats(month_key)
    await message.answer(
        f"📊 {month_key}\n"
        f"Доход: {stats['income']:.0f}₽\n"
        f"Расход: {stats['expense']:.0f}₽\n"
        f"Баланс: {stats['balance']:.0f}₽"
    )

@dp.message(Command("ean"))
async def cmd_ean(message: types.Message):
    await message.answer(
        "🛒 Сканирование товаров по штрихкоду"
        + "\n\nВыбери магазин:",
        reply_markup=_build_store_keyboard()
    )


@dp.message(F.photo)
async def handle_photo(message: types.Message):
    user_id = message.from_user.id
    
    # Check if user is in QR mode
    if user_id in pending_qr:
        pending_qr.discard(user_id)
        processing_msg = await message.answer("📸 Получаю фото...")
        
        try:
            photo = message.photo[-1]
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                tmp_path = tmp.name
            await bot.download(photo.file_id, destination=tmp_path)
            
            try:
                from PIL import Image
                from pyzbar.pyzbar import decode
                img = Image.open(tmp_path)
                decoded = decode(img)
                
                if not decoded:
                    await processing_msg.edit_text("❌ QR-код не найден на фото.")
                    os.unlink(tmp_path)
                    return
                
                qr_data = decoded[0].data.decode('utf-8')
                os.unlink(tmp_path)
                
                await processing_msg.edit_text("✅ QR распознан! Обрабатываю чек...")
                await process_receipt_qr(message, qr_data)
            except ImportError:
                await processing_msg.edit_text("❌ Модуль распознавания QR не установлен.")
                os.unlink(tmp_path)
        except Exception as e:
            await message.answer(f"❌ Ошибка обработки фото: {e}")
        return
    
    # Check if user is in EAN scanning session
    session = ean_sessions.get(user_id)
    if not session:
        await message.answer(
            "❌ Не понимаю, что с этим фото делать.\n"
            "Используй /qr для сканирования чека\n"
            "Или /ean для добавления товаров по штрихкоду"
        )
        return
    
    # Process EAN photo
    if session.get("pending_item"):
        await message.answer("❌ Сначала заверши текущий товар (укажи цену или отмени), потом сканируй следующий.")
        try:
            await message.delete()
        except Exception:
            pass
        return
    
    processing_msg = await message.answer("🔍 Распознаю штрихкод...")
    
    try:
        photo = message.photo[-1]
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            tmp_path = tmp.name
        await bot.download(photo.file_id, destination=tmp_path)
        
        with open(tmp_path, 'rb') as fimg:
            image_bytes = fimg.read()
        
        barcode = extract_barcode(image_bytes)
        
        os.unlink(tmp_path)
        
        if not barcode:
            await processing_msg.edit_text("❌ Штрихкод не распознан. Попробуй другое фото.")
            return
        
        # Step 1: local database
        await processing_msg.edit_text(f"🔍 Штрихкод: {barcode}\n📂 Поиск в базе...")
        from barcode_scanner import find_product_by_barcode, fetch_candidates, openrouter_normalize, create_product_note, find_product_by_title
        existing = find_product_by_barcode(barcode)
        
        if existing:
            n = existing["frontmatter"]
            name = n.get("title", "Неизвестно")
            result = {
                "status": "existing",
                "barcode": barcode,
                "file_path": existing["path"],
                "normalized": n,
                "is_new": False,
                "message": "Product with this barcode already exists in database."
            }
        else:
            # Step 2: internet lookup
            await processing_msg.edit_text(f"🔍 Штрихкод: {barcode}\n🌐 Поиск в интернете...")
            candidates = fetch_candidates(barcode)
            
            if candidates:
                # Step 3: LLM normalization
                await processing_msg.edit_text(f"🔍 Штрихкод: {barcode}\n🤖 Нормализация...")
                normalized = openrouter_normalize(barcode, candidates, ai_norm.openrouter_key)
                
                if normalized:
                    dup = find_product_by_title(normalized["title"])
                    if dup:
                        n = dup["frontmatter"]
                        name = n.get("title", "Неизвестно")
                        result = {
                            "status": "existing",
                            "barcode": barcode,
                            "file_path": dup["path"],
                            "normalized": n,
                            "is_new": False,
                            "message": "Similar product title already exists."
                        }
                    else:
                        path = create_product_note(normalized)
                        n = normalized
                        name = n.get("title", "Неизвестно")
                        result = {
                            "status": "created",
                            "barcode": barcode,
                            "candidates_count": len(candidates),
                            "normalized": n,
                            "file_path": str(path),
                            "is_new": True
                        }
                else:
                    # Fallback: use first raw candidate
                    dup = find_product_by_title(candidates[0]["title"])
                    if dup:
                        n = dup["frontmatter"]
                        name = n.get("title", "Неизвестно")
                        result = {
                            "status": "existing",
                            "barcode": barcode,
                            "file_path": dup["path"],
                            "normalized": n,
                            "is_new": False,
                            "message": "Similar product title already exists."
                        }
                    else:
                        path = create_product_note(candidates[0])
                        n = candidates[0]
                        name = n.get("title", "Неизвестно")
                        result = {
                            "status": "created_fallback",
                            "barcode": barcode,
                            "candidates_count": len(candidates),
                            "normalized": n,
                            "file_path": str(path),
                            "message": "LLM normalization unavailable; used first raw candidate.",
                            "is_new": True
                        }
            else:
                # No candidates at all
                blank = {
                    "title": "Неизвестный товар",
                    "barcode": barcode,
                    "brand": "",
                    "category": "прочее",
                    "base_unit": "шт",
                    "typical_pack_size": "",
                    "typical_pack_unit": "",
                    "perishable": False,
                    "default_shelf_life_days": ""
                }
                path = create_product_note(blank)
                n = blank
                name = "Неизвестный товар"
                result = {
                    "status": "created_blank",
                    "barcode": barcode,
                    "file_path": str(path),
                    "normalized": blank,
                    "message": "No internet candidates found. Created blank product note for manual fill.",
                    "is_new": True
                }
        
        await processing_msg.delete()
        
        # Delete user's photo to keep chat clean
        try:
            await message.delete()
        except Exception:
            pass
        
        # Add item to session (price pending)
        item = {
            "barcode": barcode,
            "name": name,
            "price": None,
            "is_new": result.get("is_new", True),
            "add_to_pantry": True,
            "product_path": result.get("file_path", ""),
        }
        session["pending_item"] = item
        
        # Update receipt message
        await _update_ean_message(session)
        
        # Send product info and hint, then price keyboard
        info_msg = await message.answer(
            f"📦 {name}\n"
            f"{'🆕 Новый товар' if item['is_new'] else '🗄 Товар из базы'}\n\n"
            f"Если нужной цены нет — напиши свою в чат или нажми ⌨️ Своя цена"
        )
        session["last_info_msg_id"] = info_msg.message_id
        
        # Ask for price
        price_msg_id = await _ask_price(message.chat.id, session["message_id"], name, item.get("add_to_pantry", True))
        session["last_price_msg_id"] = price_msg_id
        
    except Exception as e:
        await processing_msg.edit_text(f"❌ Ошибка: {e}")


@dp.message()
async def handle_text(message: types.Message):
    text = message.text.strip()
    user_id = message.from_user.id
    
    # EAN custom price input
    session = ean_sessions.get(user_id)
    if session and session.get("pending_item"):
        price_text = text.replace(',', '.').replace(' ', '')
        price_match = re.search(r'^(\d+(?:\.\d+)?)$', price_text)
        if price_match:
            price = float(price_match.group(1))
            item = session["pending_item"]
            item["price"] = price
            
            # Delete user's price message
            try:
                await message.delete()
            except Exception:
                pass
            
            # Delete hint message if exists
            if session.get("last_hint_msg_id"):
                try:
                    await bot.delete_message(session["chat_id"], session["last_hint_msg_id"])
                except Exception:
                    pass
                session["last_hint_msg_id"] = None
            
            # Update price keyboard to show selected price + commit option
            if session.get("last_price_msg_id"):
                try:
                    await bot.edit_message_reply_markup(
                        chat_id=session["chat_id"],
                        message_id=session["last_price_msg_id"],
                        reply_markup=_build_price_keyboard(item.get("add_to_pantry", True), selected_price=price)
                    )
                except Exception:
                    pass
            
            # Update info message to show price is set
            if session.get("last_info_msg_id"):
                try:
                    await bot.edit_message_text(
                        f"📦 {item['name']}\n"
                        f"{'🆕 Новый товар' if item.get('is_new') else '🗄 Товар из базы'}\n"
                        f"💰 Цена: {price:.0f}₽\n\n"
                        f"Нажми ✅ Добавить в чек, или измени параметры:",
                        chat_id=session["chat_id"],
                        message_id=session["last_info_msg_id"]
                    )
                except Exception:
                    pass
            return
        else:
            await message.answer("Введи цену числом (например: 129 или 129.50), или используй кнопки выше.")
            return
    
    # Pending store input for a new receipt (QR flow)
    if user_id in pending_store_changes:
        mode = pending_store_changes.pop(user_id)
        if text.lower() == "/cancel":
            pending_receipt_data.pop(user_id, None)
            await message.answer("Отменено.")
            return
        
        if mode == "ean":
            # Store name entered manually for EAN session
            ean_sessions[user_id] = {
                "store": text,
                "items": [],
                "message_id": None,
                "chat_id": message.chat.id,
                "pending_item": None,
            }
            msg = await message.answer(
                f"🏪 Магазин: {text}\n\n"
                f"📸 Присылай фото штрихкодов товаров по одному.\n"
                f"Я буду собирать чек.",
                reply_markup=_build_ean_control_keyboard()
            )
            ean_sessions[user_id]["message_id"] = msg.message_id
            return
        
        # QR flow
        receipt_pending = pending_receipt_data.pop(user_id, None)
        if not receipt_pending:
            await message.answer("Чек уже обработан или устарел.")
            return
        try:
            result = kitchen.commit_receipt(receipt_pending['meta'], receipt_pending['items'], store_hint=text)
            
            lines = ["✅ Чек сохранён!" + "\n"]
            lines.append(f"🏪 {result['store_name']}")
            lines.append(f"📅 {result['date_str']}")
            lines.append(f"💰 {result['total']/100:.2f}₽\n")
            lines.append(f"📦 Позиций: {result['items_count']} ({result['new_count']} новых, {result['known_count']} из базы)\n")
            for i, item in enumerate(result['all_items'], 1):
                flag = "✨" if item['is_new'] else ""
                lines.append(f"{i}. {item['name']} {flag}")
            lines.append("")
            lines.append(f"🗄 В хранилище добавлено: {result['pantry_count']} поз.")
            
            msg_text = "\n".join(lines)
            if len(msg_text) > 4000:
                msg_text = msg_text[:3900] + "\n\n... (сообщение обрезано)"
            
            pending_cancellations[user_id] = {
                'receipt': result['receipt_path'],
            }
            
            cancel_kb = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="❌ Отменить чек", callback_data="cancel_receipt")]
            ])
            await message.answer(msg_text, reply_markup=cancel_kb)
        except Exception as e:
            await message.answer(f"❌ Ошибка сохранения: {e}")
        return
    
    # Check if it looks like a QR code string
    if text.startswith("t=") or "&fn=" in text or "&fp=" in text:
        if text.startswith("preview:"):
            await process_receipt_preview(message, text.replace("preview:", "", 1).strip())
        else:
            await process_receipt_qr(message, text)
        return
    
    # Existing finance logic
    amount, category, account = parse_input(text)
    if not amount:
        await message.answer(
            "Отправь сумму и категорию, например: 1000 продукты\n"
            "Или QR-строку чека (начинается с t=...)\n"
            "Или используй /qr и /ean"
        )
        return
    
    if not category:
        cats = vault.get_categories()
        expense_cats = [c for c in cats if c.get('title') not in ['Кешбэк', 'Нераспределенные']]
        buttons = []
        for cat in expense_cats[:10]:
            cb = f"tx_{cat['title']}_{amount}_{account or ''}"
            buttons.append([InlineKeyboardButton(text=cat["title"], callback_data=cb)])
        kb = InlineKeyboardMarkup(inline_keyboard=buttons)
        await message.answer(f"Категория для {amount:.0f}₽?", reply_markup=kb)
        return
    
    direction = 'expense'
    income_words = ['зарплата', 'доход', 'получил', 'мама']
    if any(w in text.lower() for w in income_words):
        direction = 'income'
    
    month_key = get_month_key()
    tx = vault.add_transaction(amount, direction, category, account)
    stats = vault.get_monthly_stats(month_key)
    overflow = vault.calculate_overflow(month_key)
    
    lines = [f"✅ Записано: {amount:.0f}₽ → {category}"]
    if account:
        lines.append(f"   Банк: {account}")
    if tx.get('cashback_amount', 0) > 0:
        lines.append(f"   🎁 Кешбэк: {tx['cashback_amount']}₽ ({tx['cashback_percent']}%) ожидает")
    lines.append(f"\n💰 Баланс: {stats['balance']:.0f}₽")
    
    base_cats = vault.get_base_categories()
    for cat in base_cats:
        if cat['title'].lower() == category.lower():
            limit = cat.get('base_limit', 0)
            spent = stats['base_spent'].get(cat['title'], 0)
            remaining = max(0, limit - spent)
            lines.append(f"\n⚡ {cat['title']}: {spent:.0f}/{limit:.0f}₽ — ост: {remaining:.0f}₽")
            break
    
    await message.answer("\n".join(lines))

@dp.callback_query(F.data.startswith("store|"))
async def handle_store_callback(call: types.CallbackQuery):
    store_name = call.data.split("|", 1)[1]
    user_id = call.from_user.id
    
    receipt_pending = pending_receipt_data.get(user_id)
    if not receipt_pending:
        await call.answer("Чек уже обработан или устарел", show_alert=True)
        return
    
    if store_name == "__new__":
        await call.message.edit_text("Введите название магазина (или /cancel):")
        pending_store_changes[user_id] = "qr"
        await call.answer()
        return
    
    await _commit_qr_receipt(call, receipt_pending, store_hint=store_name)
    await call.answer()

@dp.callback_query(F.data == "cancel_receipt")
async def handle_cancel_receipt(call: types.CallbackQuery):
    user_id = call.from_user.id
    if user_id not in pending_cancellations:
        await call.answer("Чек уже обработан или устарел", show_alert=True)
        return
    info = pending_cancellations.pop(user_id)
    try:
        kitchen.cancel_receipt(info['receipt'])
        await call.message.edit_text(
            "❌ Чек отменён.\n"
            "Удалены: чек и связанные запасы.\n"
            "Сохранены: новые товары и магазины (база расширена)."
        )
    except Exception as e:
        await call.answer(f"Ошибка отмены: {e}", show_alert=True)
    await call.answer()


@dp.callback_query(F.data.startswith("qr_pantry|"))
async def handle_qr_pantry(call: types.CallbackQuery):
    user_id = call.from_user.id
    pending = pending_receipt_data.get(user_id)
    if not pending:
        await call.answer("Чек уже обработан или устарел", show_alert=True)
        return
    
    idx = int(call.data.split("|", 1)[1])
    if idx < 0 or idx >= len(pending['items']):
        await call.answer("Неверный индекс товара", show_alert=True)
        return
    
    entry = pending['items'][idx]
    entry['add_to_pantry'] = not entry.get('add_to_pantry', True)
    status = "🗄 Будет добавлено на склад" if entry['add_to_pantry'] else "🚫 Не добавляется на склад"
    
    text = _render_qr_preview(pending)
    try:
        await call.message.edit_text(text, reply_markup=_build_qr_keyboard(pending['items']))
    except Exception:
        pass
    await call.answer(status)


@dp.callback_query(F.data == "qr_confirm")
async def handle_qr_confirm(call: types.CallbackQuery):
    user_id = call.from_user.id
    pending = pending_receipt_data.get(user_id)
    if not pending:
        await call.answer("Чек уже обработан или устарел", show_alert=True)
        return
    
    meta = pending['meta']
    items = pending['items']
    
    raw_store = meta.get("store", "")
    store_path, store_name, store_method = kitchen.resolve_store(raw_store)
    
    new_count = sum(1 for e in items if e.get('is_new'))
    known_count = len(items) - new_count
    
    if store_method == 'unknown':
        lines = [
            f"📝 Подготовлено {len(items)} позиций.",
            f"✨ Новых товаров: {new_count}",
            f"🗄 Известных из базы: {known_count}",
            "",
            f"🏪 Магазин не распознан: {store_name}",
            "Выберите магазин из списка или добавьте новый:"
        ]
        stores = kitchen._load_known_stores()
        buttons = []
        for s in stores[:10]:
            buttons.append([InlineKeyboardButton(text=s, callback_data=f"store|{s}")])
        buttons.append([InlineKeyboardButton(text="➕ Новый магазин", callback_data="store|__new__")])
        try:
            await call.message.edit_text(
                "\n".join(lines),
                reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons)
            )
        except Exception:
            pass
        await call.answer()
        return
    
    await _commit_qr_receipt(call, pending, store_hint=None)


@dp.callback_query(F.data == "qr_cancel")
async def handle_qr_cancel(call: types.CallbackQuery):
    user_id = call.from_user.id
    pending_receipt_data.pop(user_id, None)
    try:
        await call.message.edit_text("❌ Чек отменён.")
    except Exception:
        pass
    await call.answer()


async def _commit_qr_receipt(call, pending: dict, store_hint=None):
    user_id = call.from_user.id
    try:
        result = kitchen.commit_receipt(pending['meta'], pending['items'], store_hint=store_hint)
        del pending_receipt_data[user_id]
        
        lines = ["✅ Чек сохранён!" + "\n"]
        lines.append(f"🏪 {result['store_name']}")
        lines.append(f"📅 {result['date_str']}")
        lines.append(f"💰 {result['total']/100:.2f}₽\n")
        lines.append(f"📦 Позиций: {result['items_count']} ({result['new_count']} новых, {result['known_count']} из базы)\n")
        for i, item in enumerate(result['all_items'], 1):
            flag = "✨" if item['is_new'] else ""
            lines.append(f"{i}. {item['name']} {flag}")
        lines.append("")
        lines.append(f"🗄 В хранилище добавлено: {result['pantry_count']} поз.")
        
        text = "\n".join(lines)
        if len(text) > 4000:
            text = text[:3900] + "\n\n... (сообщение обрезано)"
        
        pending_cancellations[user_id] = {
            'receipt': result['receipt_path'],
        }
        
        cancel_kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="❌ Отменить чек", callback_data="cancel_receipt")]
        ])
        try:
            await call.message.edit_text(text, reply_markup=cancel_kb)
        except Exception:
            await call.message.answer(text, reply_markup=cancel_kb)
    except Exception as e:
        await call.answer(f"❌ Ошибка: {e}", show_alert=True)


@dp.callback_query()
async def handle_callback(call: types.CallbackQuery):
    data = call.data
    if data.startswith("tx_"):
        parts = data.split("_", 3)
        if len(parts) >= 3:
            category = parts[1]
            amount = float(parts[2])
            account = parts[3] if len(parts) > 3 and parts[3] else None
            direction = 'expense'
            month_key = get_month_key()
            tx = vault.add_transaction(amount, direction, category, account)
            stats = vault.get_monthly_stats(month_key)
            lines = [f"✅ Записано: {amount:.0f}₽ → {category}"]
            if account:
                lines.append(f"   Банк: {account}")
            if tx.get('cashback_amount', 0) > 0:
                lines.append(f"   🎁 Кешбэк: {tx['cashback_amount']}₽ ({tx['cashback_percent']}%) ожидает")
            lines.append(f"\n💰 Баланс: {stats['balance']:.0f}₽")
            base_cats = vault.get_base_categories()
            for cat in base_cats:
                if cat['title'].lower() == category.lower():
                    limit = cat.get('base_limit', 0)
                    spent = stats['base_spent'].get(cat['title'], 0)
                    remaining = max(0, limit - spent)
                    lines.append(f"\n⚡ {cat['title']}: {spent:.0f}/{limit:.0f}₽ — ост: {remaining:.0f}₽")
                    break
            await call.message.edit_text("\n".join(lines))
    await call.answer()

async def _update_ean_message(session: dict):
    text = _render_ean_receipt(session)
    try:
        await bot.delete_message(chat_id=session["chat_id"], message_id=session["message_id"])
    except Exception:
        pass
    msg = await bot.send_message(
        chat_id=session["chat_id"],
        text=text,
        reply_markup=_build_ean_control_keyboard()
    )
    session["message_id"] = msg.message_id


async def _ask_price(chat_id: int, message_id: int, item_name: str, add_to_pantry: bool = True):
    msg = await bot.send_message(
        chat_id,
        f"💰 Укажи цену для: {item_name}",
        reply_markup=_build_price_keyboard(add_to_pantry)
    )
    return msg.message_id


@dp.callback_query(F.data.startswith("ean_store|"))
async def handle_ean_store(call: types.CallbackQuery):
    store_name = call.data.split("|", 1)[1]
    user_id = call.from_user.id
    
    if store_name == "__new__":
        await call.message.edit_text("Введи название магазина (или /cancel):")
        pending_store_changes[user_id] = "ean"
        await call.answer()
        return
    
    if store_name == "__cancel__" or store_name == "__new__":
        await call.answer()
        return
    
    # Start EAN session
    ean_sessions[user_id] = {
        "store": store_name,
        "items": [],
        "message_id": call.message.message_id,
        "chat_id": call.message.chat.id,
        "pending_item": None,
    }
    
    await call.message.edit_text(
        f"🏪 Магазин: {store_name}\n\n"
        f"📸 Присылай фото штрихкодов товаров по одному.\n"
        f"Я буду собирать чек.",
        reply_markup=_build_ean_control_keyboard()
    )
    await call.answer()


@dp.callback_query(F.data.startswith("ean_price|"))
async def handle_ean_price(call: types.CallbackQuery):
    user_id = call.from_user.id
    session = ean_sessions.get(user_id)
    if not session or not session.get("pending_item"):
        await call.answer("Сессия устарела", show_alert=True)
        return
    
    price_raw = call.data.split("|", 1)[1]
    item = session["pending_item"]
    
    if price_raw == "skip":
        item["price"] = None
        selected = None
        status = "Без цены"
    else:
        try:
            item["price"] = float(price_raw)
            selected = item["price"]
            status = f"{item['price']:.0f}₽"
        except ValueError:
            item["price"] = None
            selected = None
            status = "Без цены"
    
    # Update keyboard to show selected price + commit option
    try:
        await call.message.edit_reply_markup(
            reply_markup=_build_price_keyboard(item.get("add_to_pantry", True), selected_price=selected)
        )
    except Exception:
        pass
    await call.answer(f"Цена: {status}")


@dp.callback_query(F.data == "ean_custom_price")
async def handle_ean_custom_price(call: types.CallbackQuery):
    user_id = call.from_user.id
    session = ean_sessions.get(user_id)
    if not session or not session.get("pending_item"):
        await call.answer("Сессия устарела", show_alert=True)
        return
    await call.answer("Введи цену числом в чат")
    try:
        hint = await bot.send_message(
            session["chat_id"],
            "⌨️ Введи цену числом (например: 129 или 129.50):"
        )
        session["last_hint_msg_id"] = hint.message_id
    except Exception:
        pass


@dp.callback_query(F.data == "ean_pantry_toggle")
async def handle_ean_pantry_toggle(call: types.CallbackQuery):
    user_id = call.from_user.id
    session = ean_sessions.get(user_id)
    if not session or not session.get("pending_item"):
        await call.answer("Нет товара для настройки", show_alert=True)
        return
    
    item = session["pending_item"]
    item["add_to_pantry"] = not item.get("add_to_pantry", True)
    status = "✅ Будет добавлено на склад" if item["add_to_pantry"] else "🚫 Не добавляется на склад"
    
    # Update keyboard to reflect toggle, keeping selected price if set
    selected = item.get("price")
    try:
        await call.message.edit_reply_markup(
            reply_markup=_build_price_keyboard(item["add_to_pantry"], selected_price=selected)
        )
    except Exception:
        pass
    await call.answer(status)


@dp.callback_query(F.data == "ean_commit_item")
async def handle_ean_commit_item(call: types.CallbackQuery):
    user_id = call.from_user.id
    session = ean_sessions.get(user_id)
    if not session or not session.get("pending_item"):
        await call.answer("Нет товара для добавления", show_alert=True)
        return
    
    item = session["pending_item"]
    session["items"].append(item)
    session["pending_item"] = None
    
    # Delete price keyboard message
    try:
        await call.message.delete()
    except Exception:
        pass
    session["last_price_msg_id"] = None
    
    # Delete info message about product
    if session.get("last_info_msg_id"):
        try:
            await bot.delete_message(session["chat_id"], session["last_info_msg_id"])
        except Exception:
            pass
        session["last_info_msg_id"] = None
    
    # Delete hint message if exists
    if session.get("last_hint_msg_id"):
        try:
            await bot.delete_message(session["chat_id"], session["last_hint_msg_id"])
        except Exception:
            pass
        session["last_hint_msg_id"] = None
    
    # Update receipt display
    await _update_ean_message(session)
    await call.answer("Добавлено")


@dp.callback_query(F.data == "ean_cancel_item")
async def handle_ean_cancel_item(call: types.CallbackQuery):
    user_id = call.from_user.id
    session = ean_sessions.get(user_id)
    if not session or not session.get("pending_item"):
        await call.answer("Нет товара для отмены", show_alert=True)
        return
    
    item = session["pending_item"]
    session["pending_item"] = None
    session["last_price_msg_id"] = None
    session["last_hint_msg_id"] = None
    
    # Delete info message about product
    if session.get("last_info_msg_id"):
        try:
            await bot.delete_message(session["chat_id"], session["last_info_msg_id"])
        except Exception:
            pass
        session["last_info_msg_id"] = None
    
    try:
        await call.message.delete()
    except Exception:
        pass
    
    await _update_ean_message(session)
    await call.answer(f"❌ Отменено: {item['name']}")


@dp.callback_query(F.data == "ean_finish")
async def handle_ean_finish(call: types.CallbackQuery):
    user_id = call.from_user.id
    session = ean_sessions.pop(user_id, None)
    if not session:
        await call.answer("Нет активной сессии", show_alert=True)
        return
    
    # Check if there's a pending item without price
    if session.get("pending_item"):
        await call.answer("Сначала укажи цену или отмени текущий товар", show_alert=True)
        ean_sessions[user_id] = session  # restore session
        return
    
    if not session["items"]:
        try:
            await call.message.edit_text("❌ Сканирование отменено. Товаров не было.")
        except Exception:
            pass
        await call.answer()
        return
    
    # Save to Obsidian
    try:
        from datetime import datetime as dt
        date_str = dt.now().strftime('%Y-%m-%d')
        store_path, store_name, store_method = kitchen.resolve_store(session['store'])
        if not store_path:
            store_path, store_name = kitchen.find_or_create_store(session['store'])
        total_kopeks = int(sum((item.get("price") or 0) for item in session["items"]) * 100)
        
        receipt_path = kitchen.create_receipt(date_str, store_path, store_name, total_kopeks, qr_data='')
        
        for item in session["items"]:
            if item.get("add_to_pantry", True) and item.get("product_path"):
                pantry_path = kitchen.add_pantry_item(
                    item["product_path"],
                    item["name"],
                    1,
                    "шт",
                    receipt_path
                )
            else:
                pantry_path = None
            
            price_kopeks = int((item.get("price") or 0) * 100)
            kitchen.update_receipt_table(
                receipt_path,
                item.get("product_path", ""),
                item["name"],
                1,
                price_kopeks,
                pantry_path=pantry_path
            )
        
        kitchen._git_commit(f"EAN чек: {store_name} {date_str}, {len(session['items'])} поз.")
        
        lines = [f"🏪 {session['store']}\n"]
        lines.append(f"📦 {len(session['items'])} позиций:\n")
        total = 0.0
        for i, item in enumerate(session["items"], 1):
            price_str = ""
            if item.get("price") is not None:
                price_str = f" — {item['price']:.0f}₽"
                total += item["price"]
            flag = "🆕" if item.get("is_new") else ""
            pantry_flag = "" if item.get("add_to_pantry", True) else "(не на склад)"
            lines.append(f"{i}. {item['name']}{price_str} {flag} {pantry_flag}")
        
        lines.append(f"\n💰 Итого: {total:.0f}₽")
        lines.append(f"\n✅ Чек сохранён в Obsidian!")
        lines.append(f"📝 {receipt_path}")
        
    except Exception as e:
        lines = [f"❌ Ошибка сохранения чека: {e}"]
        lines.append("\nСписок товаров:")
        for i, item in enumerate(session["items"], 1):
            price_str = f" — {item['price']:.0f}₽" if item.get("price") is not None else ""
            lines.append(f"{i}. {item['name']}{price_str}")
    
    try:
        await call.message.edit_text("\n".join(lines))
    except Exception:
        await call.message.answer("\n".join(lines))
    
    await call.answer("Сканирование завершено!")


@dp.callback_query(F.data == "ean_cancel")
async def handle_ean_cancel(call: types.CallbackQuery):
    user_id = call.from_user.id
    ean_sessions.pop(user_id, None)
    pending_qr.discard(user_id)
    try:
        await call.message.edit_text("❌ Сканирование отменено.")
    except Exception:
        pass
    await call.answer()


async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
