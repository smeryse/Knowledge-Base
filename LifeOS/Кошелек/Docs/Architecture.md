---
tags:
  - финансы
  - архитектура
  - кошелек
aliases:
  - Архитектура Кошелька
  - Architecture
---

# Архитектура проекта «Кошелек»

> Проект учета личных финансов через Telegram-бота + Obsidian vault.
> 
> Цель: осознанные траты в моменте + бюджетное планирование.

---

## 1. Общая концепция

Вместо 8 банковских приложений — один бот в Telegram. Ты пишешь трату сразу после покупки («350 продукты»), а бот:
- записывает её в Obsidian
- показывает сколько осталось от бюджета
- коммитит изменения в GitHub
- Obsidian на ноутбуке получает обновления через `git pull`

**Ключевой принцип**: фиксация траты за 3 секунды, анализ в Obsidian в любой момент.

---

## 2. Компоненты системы

```
┌────────────────┐     HTTP    ┌─────────────────────┐
│  Telegram      │◄───────────►│  Бот (Python)       │
│  (пользователь)│  getUpdates │  Сервер weaselcloud │
└────────────────┘             └────────┬────────────┘
                                        │
                                        │ читает/пишет
                                        ▼
                             ┌────────────────────────┐
                             │  Obsidian vault        │
                             │  /opt/finance-bot/vault│
                             │  (Markdown файлы)      │
                             └────────┬───────────────┘
                                      │
                                      │ git add/commit/push
                                      ▼
                             ┌────────────────────────┐
                             │  GitHub                │
                             │  smeryse/Knowledge-Base│
                             └────────┬───────────────┘
                                      │ git pull
                                      ▼
                             ┌──────────────────────┐
                             │  Obsidian (ноутбук)  │
                             │  Локальный vault     │
                             └──────────────────────┘
```

### 2.1 Telegram-бот

**Где**: сервер `weaselcloud`, systemd-сервис `finance-bot`
**Язык**: Python 3.12 + aiogram 3
**Путь**: `/opt/finance-bot/`

**Файлы**:
- `bot.py` — обработка команд, inline-кнопок, парсинг сообщений
- `obsidian.py` — работа с Markdown-файлами vault
- `config.py` — конфигурация (токен, путь к vault)

**Запуск**: `systemctl start finance-bot`
**Логи**: `journalctl -u finance-bot -f`

### 2.2 Obsidian vault на сервере

**Путь**: `/opt/finance-bot/vault/`
**Клонирован**: из `git@github.com:smeryse/Knowledge-Base.git`
**Обновление**: бот делает `git pull → commit → push` после каждой транзакции

Это та же самая папка `LifeOS/Кошелек/`, что и на ноутбуке, но на сервере.

### 2.3 Obsidian vault на ноутбуке

**Локальная копия** того же репозитория.
**Синхронизация**: ручной `git pull` или автоматический через Obsidian Git плагин.

---

## 3. Структура данных

### 3.1 Папки = таблицы БД

Каждая папка — это таблица, каждый `.md` файл — одна запись.

| Папка | Описание | Кто создаёт |
|---|---|---|
| `Accounts/` | Счета, карты, наличные | Вручную через шаблон |
| `Categories/` | Категории расходов/доходов | Вручную через шаблон |
| `Cashback/` | Программы кешбека банков | Вручную через шаблон |
| `Budgets/` | Месячные бюджеты (план/факт) | Вручную через шаблон |
| `Savings/` | Цели накоплений | Вручную через шаблон |
| `Recurring/` | Регулярные платежи | Вручную через шаблон |
| `Monthly/` | **Транзакции месяца** (факт) | Бот пишет автоматически |
| `Templates/` | Templater-шаблоны для ручного создания | Разработчик |

### 3.2 Формат записи

Каждый файл — Markdown с YAML frontmatter:

```yaml
---
type: account
title: Альфа-Банк Карта
account_type: карта
balance: 0
currency: RUB
bank: Альфа-Банк
---

# Альфа-Банк Карта

Описание...
```

Поле `type` определяет сущность: `account`, `category`, `budget`, `savings_goal`, `recurring`, `cashback`, `monthly_dashboard`.

### 3.3 Транзакции (Monthly/)

Файл `Monthly/YYYY-MM.md` — единый дашборд месяца. Содержит две таблицы:

**Доходы**:
```markdown
| Дата | Источник | Сумма | Счёт | Комментарий |
|---|---|---|---|---|
| 2026-05-10 | Зарплата | 50000 | Альфа-Банк Карта |  |
```

**Расходы**:
```markdown
| Дата | Категория | Сумма | Место/Описание | Счёт | Комментарий |
|---|---|---|---|---|---|
| 2026-05-10 | Продукты | 350 | | Наличные |  |
```

Бот парсит эти таблицы, добавляет строки, пересчитывает итоги.

### 3.4 Бюджеты (Budgets/)

Файл `Budgets/YYYY-MM.md` — план на месяц. Содержит таблицу категорий с колонками **План / Факт / Остаток**.

**Важно**: `Факт` не обновляется ботом автоматически (пока). Ты либо обновляешь вручную, либо бот считает на лету при ответе в Telegram.

---

## 4. Поток данных

### 4.1 Добавление траты

```
Пользователь: "350 продукты"
    ↓
Telegram API → getUpdates
    ↓
bot.py: handle_text()
    - parse_amount() → 350
    - Остаток "продукты" = категория
    ↓
obsidian.py: add_expense()
    - Читает Monthly/2026-05.md
    - Находит таблицу "## Расходы"
    - Вставляет новую строку после separator
    - Перезаписывает файл
    ↓
_git_commit()
    - git pull origin main
    - git add -A
    - git commit -m "expense: 350 -> продукты"
    - git push origin main
    ↓
GitHub: обновлён репозиторий
    ↓
Ноутбук: git pull → новая транзакция в Obsidian
```

### 4.2 Показ баланса

```
Пользователь: "/balance"
    ↓
bot.py: cmd_balance()
    ↓
obsidian.py: get_monthly_summary()
    - Читает Monthly/2026-05.md
    - Парсит таблицы доходов и расходов
    - Считает: income, expense, balance
    ↓
Ответ: "Баланс: 49650₽\nДоходы: 50000₽\nРасходы: 350₽"
```

---

## 5. Код бота

### 5.1 Структура файлов

```
/opt/finance-bot/
├── bot.py              # Основной бот, хендлеры Telegram
├── obsidian.py         # Работа с Markdown-файлами
├── config.py           # BOT_TOKEN, VAULT_PATH
├── .venv/              # Python virtual environment
│   └── bin/python
└── vault/              # Клон Obsidian vault
    └── Projects/
        └── Кошелек/
```

### 5.2 Ключевые функции obsidian.py

```python
class VaultManager:
    # Чтение
    get_categories(cat_type="expense")  → список категорий
    get_accounts()                       → список счетов
    get_monthly_summary(month_key)       → {income, expense, balance, categories}
    
    # Запись
    add_expense(month_key, date, category, amount, account, note)  → bool
    add_income(month_key, date, source, amount, account, note)     → bool
    
    # Git
    _git_commit(message)  → pull + add + commit + push
```

### 5.3 Как бот парсит Markdown-таблицы

1. Читает файл целиком
2. Ищет секцию `## Расходы` или `## Доходы`
3. Находит separator-строку `|---|---|---|`
4. Вставляет новую строку после separator
5. Перезаписывает файл

**Важно**: парсинг линейный, не использует библиотеки типа `tabulate`. Любое изменение структуры таблицы сломает бота.

---

## 6. Git-синхронизация

### 6.1 SSH deploy key

На сервере сгенерирован ключ:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINQSeV3er2WGI75JVfTKIqWnrURJyl1t4Co4e7z33x65 bot@smeryse.online
```

Он добавлен в GitHub репозиторий `smeryse/Knowledge-Base` → Settings → Deploy keys (write access).

### 6.2 Почему не HTTPS + токен

Первоначальный токен `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` возвращал 401 (Bad credentials). Возможно, истёк или не хватало scopes. SSH deploy key — надёжнее и не привязан к пользователю.

### 6.3 Конфликт репликации

Проблема: сервер и ноутбук могут менять файлы независимо.

Решение бота:
```bash
git config pull.rebase true
git pull origin main  # подтягивает изменения с ноутбука
git add -A
git commit -m "..."
git push origin main
```

Если конфликт — rebase автоматически наложит локальные коммиты поверх remote.

---

## 7. Известные проблемы и ограничения

### 7.1 Нет автоматического обновления Budgets

Бот пишет транзакции в `Monthly/`, но не обновляет `Budgets/YYYY-MM.md`. Чтобы видеть остаток бюджета в Obsidian, нужно либо:
- Вручную переносить факт из Monthly в Budgets
- Доработать бота (read Budgets → subtract expense → show remaining)

### 7.2 Только один бот на один токен

Если запустить второй экземпляр с тем же `BOT_TOKEN` — Telegram API возвращает `TelegramConflictError`. На сервере уже есть tiktok-бот с другим токеном, конфликтов нет.

### 7.3 Нет обработки дубликатов

Если бот перезапускается во время обработки сообщения, транзакция может записаться дважды (было при тестировании). Нужна проверка по `update_id`.

### 7.4 Нет парсинга банковских выписок

Все 8 банков (ВТБ, Озон, Яндекс, Сбер, Тбанк, ПСБ, Форабанк, Альфа) требуют ручного ввода через бота. API есть только у Тбанка, остальные — CSV или Telegram-уведомления (будущие улучшения).

### 7.5 Баланс счетов статичный

`Accounts/*.md` имеют поле `balance`, но оно не обновляется автоматически при тратах. Только отображается в `/balance`.

---

## 8. Как добавить новый функционал

### 8.1 Добавить команду боту

1. Отредактировать `bot.py` на сервере:
   ```bash
   nano /opt/finance-bot/bot.py
   ```

2. Добавить хендлер:
   ```python
   @dp.message(Command("моя_команда"))
   async def cmd_custom(message: types.Message):
       # логика
       await message.answer("Результат")
   ```

3. Перезапустить:
   ```bash
   systemctl restart finance-bot
   ```

### 8.2 Добавить новую сущность

1. Создать шаблон в `Templates/` (копировать существующий)
2. Добавить парсер в `obsidian.py` (если нужно читать)
3. Добавить команду в `bot.py` (если нужно писать)

### 8.3 Изменить структуру Monthly

**Осторожно**: бот парсит таблицы по жёстким индексам. Изменение количества колонок или их порядка сломает `add_expense()` и `get_monthly_summary()`.

Если меняешь структуру — обнови:
- `obsidian.py`: `add_expense()`, `add_income()`, `get_monthly_summary()`
- Существующие файлы `Monthly/*.md` под новый формат

---

## 9. Быстрые команды для разработчика

```bash
# Проверить статус бота
systemctl status finance-bot

# Смотреть логи в реальном времени
journalctl -u finance-bot -f

# Перезапустить бота
systemctl restart finance-bot

# Проверить синтаксис Python
/opt/finance-bot/.venv/bin/python -m py_compile /opt/finance-bot/bot.py

# Проверить git-статус vault
 cd /opt/finance-bot/vault && git status

# Ручной коммит и пуш
 cd /opt/finance-bot/vault && git add -A && git commit -m "manual" && git push origin main

# Проверить SSH-подключение к GitHub
ssh -T git@github.com

# Проверить что vault актуален
 cd /opt/finance-bot/vault && git pull origin main
```

---

## 10. Что дальше (TODO)

- [ ] Авто-обновление `Budgets/` из `Monthly/` (факт из транзакций)
- [ ] Остаток бюджета в ответе бота («Продукты: 350/10000, осталось 9650»)
- [ ] Дедупликация по `update_id` (защита от дублей при рестарте)
- [ ] Обновление баланса счетов при тратах
- [ ] API Тбанка для автоподгрузки транзакций
- [ ] Парсинг Telegram-уведомлений от банков
- [ ] CSV-импорт для остальных банков
- [ ] Уведомления при приближении к лимиту бюджета

---

*Последнее обновление: 2026-05-10*
*Автор: Finance Bot + OpenCode*
