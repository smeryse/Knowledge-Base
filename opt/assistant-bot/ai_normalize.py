import requests
import json
import re
from typing import List, Dict, Any
from config import OPENROUTER_API_KEY

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "deepseek/deepseek-chat"

PROMPT_TEMPLATE = """Ты — нормализатор товаров из кассового чека. Для КАЖДОГО товара из списка верни JSON-объект.

Правила:
1. normalized_name: нормализованное название. Бренд в конце через -- (если есть).
2. category: категория товара на русском (например, "Молочные продукты", "Мясо", "Бакалея"). ОДНО слово или короткая фраза.
3. brand: бренд или пустая строка.
4. perishable: true/false — портится ли быстро (молоко, мясо, овощи = true; чай, макароны, мыло = false).
5. pack_size: число — размер фасовки (например, 1, 0.5, 450). Если неизвестно — null.
6. pack_unit: единица фасовки ("л", "г", "кг", "шт", "мл"). Если неизвестно — null.
7. base_unit: базовая единица учёта запасов ("л", "кг", "шт", "г", "мл"). Обычно pack_unit или более общая (например, молоко 1 л → base_unit="л", но можно "шт"). "шт" по умолчанию.
8. aliases: массив коротких человеческих названий для поиска. Обязательно включи КОРОТКОЕ простое название без бренда/веса/процента (например, "Молоко", "Яйцо", "Сок"). Также можно добавить варианты с брендом ("Молоко Агуша").

ФОРМАТ: верни ТОЛЬКО JSON-массив, без markdown, без ```json. Каждый объект ДОЛЖЕН содержать поле raw_name с исходным названием.

Пример входа:
- МОЛОКО У/ПАСТ.1Л 3.2% АГУША
- ЯЙЦО КУР С1 ЩЕД.ГОД 10ШТ

Пример выхода:
[{"raw_name":"МОЛОКО У/ПАСТ.1Л 3.2% АГУША","normalized_name":"Молоко ультрапастеризованное 1 л 3.2% -- Агуша","category":"Молочные продукты","brand":"Агуша","perishable":true,"pack_size":1,"pack_unit":"л","base_unit":"л","aliases":["Молоко","Молоко Агуша"]},{"raw_name":"ЯЙЦО КУР С1 ЩЕД.ГОД 10ШТ","normalized_name":"Яйцо куриное С1 10 шт -- Щедрый Год","category":"Яйца","brand":"Щедрый Год","perishable":true,"pack_size":10,"pack_unit":"шт","base_unit":"шт","aliases":["Яйцо","Яйцо куриное","Яйца Щедрый Год"]}]

Теперь обработай этот список:
{items}

ТОЛЬКО JSON-массив:"""


class AINormalizer:
    def __init__(self):
        self.openrouter_key = OPENROUTER_API_KEY

    def _call_openrouter(self, prompt: str) -> str:
        if not self.openrouter_key:
            raise RuntimeError("OpenRouter API key не настроен")
        try:
            resp = requests.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {self.openrouter_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://assistant-bot.local",
                    "X-Title": "Receipt Normalizer"
                },
                json={
                    "model": MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 8000
                },
                timeout=60
            )
            data = resp.json()
            if resp.status_code != 200:
                raise RuntimeError(f"OpenRouter HTTP {resp.status_code}: {data}")
            if "choices" not in data:
                raise RuntimeError(f"OpenRouter ошибка: {data.get('error', data)}")
            return data["choices"][0]["message"]["content"]
        except requests.RequestException as e:
            raise RuntimeError(f"OpenRouter сетевая ошибка: {e}")
        except (KeyError, IndexError) as e:
            raise RuntimeError(f"OpenRouter неверный формат ответа: {e}")

    def normalize_unknown_batch(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        items: [{"raw_name": str, "barcode": str, ...}]
        returns: [{"raw_name": str, "normalized_name": str, "category": str,
                   "brand": str, "perishable": bool, "pack_size": float|None,
                   "pack_unit": str|None, "base_unit": str, "aliases": [str]}]
        """
        if not items:
            return []

        lines = [f"- {i.get('raw_name', 'UNKNOWN')}" for i in items]
        prompt = PROMPT_TEMPLATE.replace("{items}", "\n".join(lines))
        raw_text = self._call_openrouter(prompt)

        # Strip possible markdown fences
        text = raw_text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)

        try:
            result = json.loads(text)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"LLM вернул невалидный JSON: {e}\nТекст:\n{text[:500]}")

        if not isinstance(result, list):
            raise RuntimeError(f"LLM вернул не массив, а {type(result).__name__}")

        if len(result) != len(items):
            raise RuntimeError(
                f"LLM вернул {len(result)} объектов, ожидалось {len(items)}"
            )

        # Validate each item has raw_name and attach barcode from input
        for i, (inp, out) in enumerate(zip(items, result)):
            if not isinstance(out, dict):
                raise RuntimeError(
                    f"LLM вернул не объект на позиции {i}: ожидался dict, получен {type(out).__name__}: {str(out)[:200]}"
                )
            if out.get("raw_name", "").strip() != inp["raw_name"].strip():
                raise RuntimeError(
                    f"LLM перепутал raw_name на позиции {i}: ожидалось '{inp['raw_name']}', получено '{out.get('raw_name')}'"
                )
            # Attach original barcode for downstream use
            out["barcode"] = inp.get("barcode", "")
            # Ensure pack_size is numeric or None
            ps = out.get("pack_size")
            if ps is not None:
                try:
                    out["pack_size"] = float(ps)
                except (ValueError, TypeError):
                    out["pack_size"] = None
            # Ensure perishable is bool
            out["perishable"] = bool(out.get("perishable", False))
            # Ensure aliases is list
            als = out.get("aliases")
            if not isinstance(als, list):
                out["aliases"] = []
            # Ensure base_unit is string
            out["base_unit"] = str(out.get("base_unit", "шт")).strip() or "шт"

        return result

    def normalize_store_name(self, raw_name: str, known_stores: List[str]) -> dict:
        if not raw_name:
            return {"name": "Неизвестный магазин", "is_new": True}
        if not known_stores:
            return {"name": raw_name, "is_new": True}

        prompt = f"""Нормализуй название магазина из кассового чека.
Известные магазины: {', '.join(known_stores)}.
Название из чека: "{raw_name}"
Правила:
1. Если это один из известных магазинов (или его вариация) — верни точное название из списка и is_new=false.
2. Если новый магазин — убери ООО, ИП, адреса, кавычки, города. Оставь только торговую марку.
3. Название должно быть в именительном падеже, с заглавной буквы.
Верни ТОЛЬКО JSON: {{"name": "...", "is_new": true/false}}"""

        try:
            resp = requests.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {self.openrouter_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://assistant-bot.local",
                    "X-Title": "Store Normalizer"
                },
                json={
                    "model": MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 500
                },
                timeout=30
            )
            data = resp.json()
            if resp.status_code != 200:
                raise RuntimeError(f"OpenRouter HTTP {resp.status_code}: {data}")
            if "choices" not in data:
                raise RuntimeError(f"OpenRouter ошибка: {data.get('error', data)}")

            raw_text = data["choices"][0]["message"]["content"]
            text = raw_text.strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\s*", "", text)
                text = re.sub(r"\s*```$", "", text)

            result = json.loads(text)
            if not isinstance(result, dict):
                raise RuntimeError("LLM вернул не объект")
            return result
        except Exception:
            # Fallback: strip legal entities and addresses
            clean = re.sub(r'\s*[«»"\'"]\s*', '', raw_name)
            clean = re.sub(r'^[Оо][Оо][Оо]\s+[«"]?', '', clean)
            clean = re.sub(r'^[Ии][Пп]\s+', '', clean)
            clean = re.sub(r',.*$', '', clean)
            clean = clean.strip()
            return {"name": clean or raw_name, "is_new": True}
