import io
import json
import os
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus
from urllib.request import Request, urlopen

try:
    from PIL import Image
    from pyzbar.pyzbar import decode
    _HAS_PYZBAR = True
except Exception:
    _HAS_PYZBAR = False

import requests

# NOTE: server vault uses LifeOS/ paths
VAULT_ROOT = Path("/opt/assistant-bot/vault")
PRODUCTS_DIR = VAULT_ROOT / "LifeOS" / "Кухня" / "Products"

# O(1) product index
_products_index = None
_products_index_mtime = 0

CATEGORIES_ALLOWED = {
    "молочка", "яйца", "сладости", "напитки", "крупы", "мясо",
    "заморозка", "соусы", "овощи", "фрукты", "хлеб", "чай", "кофе",
    "уход", "быт", "прочее",
}

DEFAULT_OPENROUTER_MODEL = "deepseek/deepseek-chat"
DEFAULT_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def _normalize_unit(u: str) -> str:
    m = {
        "g": "г", "gr": "г", "гр": "г", "гр.": "г",
        "kg": "кг", "ml": "мл", "l": "л",
        "pcs": "шт", "pc": "шт", "шт": "шт", "штука": "шт", "штук": "шт", "eggs": "шт"
    }
    return m.get(str(u).strip().lower(), str(u).strip().lower() or "шт")


def _normalize_title(title: str) -> str:
    t = str(title).strip()
    t = re.sub(r'\s+', ' ', t)
    t = re.sub(r'\bКУР\.\b', 'куриное', t, flags=re.I)
    t = re.sub(r'\bШТ\.?\b', 'шт', t, flags=re.I)
    if t == t.upper():
        t = t.lower()
    return t[0].upper() + t[1:] if t else ""


def _strip_html(value: str) -> str:
    text = re.sub(r'<script[\s\S]*?</script>', ' ', value, flags=re.I)
    text = re.sub(r'<style[\s\S]*?</style>', ' ', text, flags=re.I)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&')
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def _parse_quantity(qty: str) -> Dict[str, Any]:
    m = re.search(r'(\d+(?:[.,]\d+)?)\s*(kg|g|гр|гр\.|l|ml|л|мл|pcs|шт)', str(qty or ""), re.I)
    if not m:
        return {"typical_pack_size": "", "typical_pack_unit": ""}
    return {
        "typical_pack_size": float(m.group(1).replace(',', '.')),
        "typical_pack_unit": _normalize_unit(m.group(2))
    }


def _build_barcode_variants(barcode: str) -> List[Dict[str, str]]:
    clean = re.sub(r'\D', '', str(barcode))
    variants = [{"code": clean, "reason": "original"}]
    if len(clean) == 14:
        variants.append({"code": clean[1:], "reason": "gtin14-drop-leading-digit"})
    if len(clean) == 13 and clean.startswith("0"):
        variants.append({"code": clean[1:], "reason": "ean13-drop-leading-zero"})
    return variants


def _http_get_json(url: str, timeout: int = 15) -> Optional[Dict]:
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception:
        return None


def _http_get_text(url: str, timeout: int = 15) -> Optional[str]:
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=timeout) as resp:
            return resp.read().decode('utf-8')
    except Exception:
        return None


def _lookup_openfoodfacts(code: str) -> Optional[Dict]:
    data = _http_get_json(f"https://world.openfoodfacts.org/api/v2/product/{code}.json")
    if not data or not data.get("product"):
        return None
    p = data["product"]
    title = p.get("product_name_ru") or p.get("product_name") or p.get("generic_name_ru") or p.get("generic_name") or ""
    if not title:
        return None
    q = _parse_quantity(p.get("quantity", ""))
    cat = ""
    if p.get("categories_tags"):
        cat = re.sub(r'^(en:|ru:)', '', p["categories_tags"][0])
    return {
        "source": "openfoodfacts",
        "title": title,
        "barcode": code,
        "brand": (p.get("brands") or "").split(",")[0].strip(),
        "category": cat,
        "description": p.get("generic_name_ru") or p.get("generic_name") or "",
        "typical_pack_size": q["typical_pack_size"],
        "typical_pack_unit": q["typical_pack_unit"],
        "perishable": True,
        "default_shelf_life_days": ""
    }


def _lookup_goupc(code: str) -> Optional[Dict]:
    html = _http_get_text(f"https://go-upc.com/search?q={code}")
    if not html:
        return None
    tm = re.search(r'<h1 class="product-name">([\s\S]*?)</h1>', html, re.I)
    bm = re.search(r'<td class="metadata-label">Brand</td>\s*<td>([\s\S]*?)</td>', html, re.I)
    cm = re.search(r'<td class="metadata-label">Category</td>\s*<td>([\s\S]*?)</td>', html, re.I)
    dm = re.search(r'<h2>\s*Description\s*</h2>\s*<span>([\s\S]*?)</span>', html, re.I)
    title = _strip_html(tm.group(1)) if tm else ""
    if not title:
        return None
    q = _parse_quantity(title)
    return {
        "source": "go-upc",
        "title": title,
        "barcode": code,
        "brand": _strip_html(bm.group(1)) if bm else "",
        "category": _strip_html(cm.group(1)) if cm else "",
        "description": _strip_html(dm.group(1)) if dm else "",
        "typical_pack_size": q["typical_pack_size"],
        "typical_pack_unit": q["typical_pack_unit"],
        "perishable": False,
        "default_shelf_life_days": ""
    }


def _lookup_barcode_list(code: str) -> Optional[Dict]:
    html = _http_get_text(f"https://barcode-list.ru/barcode/RU/Поиск.htm?barcode={code}")
    if not html:
        return None
    tm = re.search(r'<title>([\s\S]*?)</title>', html, re.I)
    list_title = _strip_html(tm.group(1)) if tm else ""
    pat = re.compile(rf'<td[^>]*>\s*{re.escape(code)}\s*</td>\s*<td[^>]*>([\s\S]*?)</td>', re.I)
    names = [_strip_html(m.group(1)) for m in pat.finditer(html) if _strip_html(m.group(1))]
    tc = re.sub(r'\s*-\s*Штрих-код:.*$', '', list_title, flags=re.I).strip() if re.search(r'Штрих-код:', list_title, re.I) else ""
    top = names[0] if names else tc
    if not top:
        return None
    q = _parse_quantity(top)
    return {
        "source": "barcode-list",
        "title": top,
        "barcode": code,
        "brand": "Волжский пекарь" if "волжский пекарь" in top.lower() else "",
        "category": "сладости" if "ваф" in top.lower() else "прочее",
        "description": " | ".join(names[:5]),
        "typical_pack_size": q["typical_pack_size"],
        "typical_pack_unit": q["typical_pack_unit"] or "шт",
        "perishable": False,
        "default_shelf_life_days": ""
    }


def fetch_candidates(barcode: str) -> List[Dict]:
    candidates = []
    seen = set()
    for variant in _build_barcode_variants(barcode):
        code = variant["code"]
        for lookup in (_lookup_openfoodfacts, _lookup_goupc, _lookup_barcode_list):
            result = lookup(code)
            if result and result["title"] and result["title"] not in seen:
                candidates.append(result)
                seen.add(result["title"])
    return candidates


def openrouter_normalize(barcode: str, candidates: List[Dict], api_key: str, model: str = DEFAULT_OPENROUTER_MODEL) -> Optional[Dict]:
    if not candidates or not api_key:
        return None
    prompt = (
        "You normalize product lookup results into strict JSON for a personal inventory database.\n"
        "Return only one JSON object and no markdown.\n"
        "Schema:\n"
        '{"title":"","barcode":"","brand":"","category":"","base_unit":"шт|г|кг|мл|л",'
        '"typical_pack_size":"","typical_pack_unit":"шт|г|кг|мл|л","perishable":false,'
        '"default_shelf_life_days":"","confidence":0}\n'
        "Rules:\n"
        "- Prefer Russian product title when possible.\n"
        "- Do not invent facts absent from candidates.\n"
        "- Keep barcode exact.\n"
        "- category must be one of: молочка, яйца, сладости, напитки, крупы, мясо, "
        "заморозка, соусы, овощи, фрукты, хлеб, чай, кофе, уход, быт, прочее.\n"
        "- brand should be filled when it is explicit in title, snippet, description or source fields; otherwise empty string.\n"
        "- title should be human-friendly Russian, not all caps, and should keep meaningful distinctions like fat %, flavor, size, class or grade.\n"
        "- do not include store names, prices, dates, promo text or review text in title.\n"
        "- base_unit and typical_pack_unit must be one of: шт, г, кг, мл, л.\n"
        "- if quantity is explicit like 400 г, 0.9 л or 10 шт, extract it.\n"
        "- use category 'прочее' only when the product type is genuinely unclear.\n"
        "- confidence is from 0 to 1.\n"
        f"Barcode: {barcode}\n"
        f"Candidates: {json.dumps(candidates, ensure_ascii=False, indent=2)}"
    )
    try:
        r = requests.post(
            DEFAULT_OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://weaselcloud",
                "X-Title": "Obsidian Food Bot"
            },
            json={
                "model": model,
                "temperature": 0.1,
                "messages": [
                    {"role": "system", "content": "You normalize barcode lookup candidates into strict JSON for a personal inventory database. Return only a JSON object."},
                    {"role": "user", "content": prompt}
                ]
            },
            timeout=30
        )
        r.raise_for_status()
        data = r.json()
        raw = data["choices"][0]["message"]["content"]
        m = re.search(r'\{[\s\S]*\}', raw)
        if not m:
            return None
        parsed = json.loads(m.group(0))
        if not parsed.get("title"):
            return None
        return {
            "title": _normalize_title(parsed.get("title", "")),
            "barcode": re.sub(r'\D', '', str(parsed.get("barcode", barcode))),
            "brand": str(parsed.get("brand", "")).strip(),
            "category": parsed.get("category", "прочее") if parsed.get("category", "") in CATEGORIES_ALLOWED else "прочее",
            "base_unit": _normalize_unit(parsed.get("base_unit", "")),
            "typical_pack_size": parsed.get("typical_pack_size", ""),
            "typical_pack_unit": _normalize_unit(parsed.get("typical_pack_unit", "")),
            "perishable": bool(parsed.get("perishable", False)),
            "default_shelf_life_days": str(parsed.get("default_shelf_life_days", "")),
            "confidence": float(parsed.get("confidence", 0)),
            "source": "openrouter"
        }
    except Exception:
        return None


def _slugify(value: str) -> str:
    v = str(value).lower()
    v = unicodedata.normalize('NFKD', v)
    v = re.sub(r'[\u0300-\u036f]', '', v)
    v = re.sub(r'[^a-zа-яё0-9]+', '-', v)
    v = v.strip('-')
    v = re.sub(r'-+', '-', v)
    return v


def _ensure_unique_path(folder: Path, basename: str) -> Path:
    safe = _slugify(basename) or "item"
    candidate = folder / f"{safe}.md"
    idx = 2
    while candidate.exists():
        candidate = folder / f"{safe}-{idx}.md"
        idx += 1
    return candidate


def _parse_frontmatter(text: str) -> Optional[Dict[str, Any]]:
    """Parse simple YAML frontmatter from markdown text."""
    m = re.match(r'^---\s*\n(.*?)\n---\s*\n', text, re.DOTALL)
    if not m:
        return None
    yaml_text = m.group(1)
    result: Dict[str, Any] = {}
    current_key = None
    current_list: List[str] = []
    for line in yaml_text.split('\n'):
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue
        list_match = re.match(r'^-\s+(.+)$', stripped)
        if list_match and current_key:
            val = list_match.group(1).strip()
            if val.startswith('"') and val.endswith('"'):
                val = val[1:-1].replace('\\"', '"')
            current_list.append(val)
            result[current_key] = current_list
            continue
        kv = re.match(r'^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$', stripped)
        if kv:
            current_key = kv.group(1)
            val = kv.group(2).strip()
            current_list = []
            if val.startswith('"') and val.endswith('"'):
                val = val[1:-1].replace('\\"', '"')
                result[current_key] = val
            elif val.startswith('[') and val.endswith(']'):
                inner = val[1:-1]
                result[current_key] = [x.strip().strip('"\'') for x in inner.split(',') if x.strip()]
            elif val.lower() == 'true':
                result[current_key] = True
            elif val.lower() == 'false':
                result[current_key] = False
            elif re.match(r'^\d+(\.\d+)?$', val):
                result[current_key] = float(val) if '.' in val else int(val)
            else:
                result[current_key] = val
    return result


def _yaml_escape(value: str) -> str:
    v = str(value).replace('\\', '\\\\').replace('"', '\\"')
    return v


def _get_products_mtime() -> float:
    mtime = 0
    if not PRODUCTS_DIR.exists():
        return 0
    for path in PRODUCTS_DIR.glob("*.md"):
        try:
            mtime = max(mtime, path.stat().st_mtime)
        except Exception:
            pass
    return mtime

def _rebuild_product_index() -> Dict[str, Dict[str, Any]]:
    global _products_index, _products_index_mtime
    index: Dict[str, Dict[str, Any]] = {}
    if not PRODUCTS_DIR.exists():
        _products_index = index
        _products_index_mtime = 0
        return index
    for path in PRODUCTS_DIR.glob("*.md"):
        try:
            text = path.read_text(encoding="utf-8")
            fm = _parse_frontmatter(text)
            if not fm:
                continue
            # by barcode
            bc = re.sub(r'\D', '', str(fm.get("barcode", "")))
            if bc:
                index[bc] = {"path": str(path), "frontmatter": fm}
            # by title
            title = str(fm.get("title", "")).strip().lower()
            if title:
                index[title] = {"path": str(path), "frontmatter": fm}
            # by aliases
            aliases = fm.get("aliases", [])
            if isinstance(aliases, str):
                aliases = [aliases]
            for a in aliases:
                a = str(a).strip().lower()
                if a:
                    index[a] = {"path": str(path), "frontmatter": fm}
        except Exception:
            continue
    _products_index = index
    _products_index_mtime = _get_products_mtime()
    return index

def _get_product_index() -> Dict[str, Dict[str, Any]]:
    global _products_index, _products_index_mtime
    mtime = _get_products_mtime()
    if _products_index is None or mtime > _products_index_mtime:
        return _rebuild_product_index()
    return _products_index

def find_product_by_barcode(barcode: str) -> Optional[Dict[str, Any]]:
    """O(1) lookup by barcode."""
    clean = re.sub(r'\D', '', str(barcode))
    if not clean:
        return None
    index = _get_product_index()
    return index.get(clean)

def find_product_by_title(title: str) -> Optional[Dict[str, Any]]:
    """O(1) lookup by exact title or alias."""
    key = str(title).strip().lower()
    if not key:
        return None
    index = _get_product_index()
    # exact match
    result = index.get(key)
    if result:
        return result
    # substring fallback: check if any key contains our query or vice versa
    for k, v in index.items():
        if key in k or k in key:
            return v
    return None





def create_product_note(data: Dict[str, Any]) -> Path:
    PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
    today = datetime.now().strftime("%Y-%m-%d")
    title = data["title"]
    path = _ensure_unique_path(PRODUCTS_DIR, title)
    lines = [
        "---",
        "type: product",
        f'title: "{_yaml_escape(title)}"',
        f'barcode: "{_yaml_escape(data.get("barcode", ""))}"',
        "aliases:",
        f'  - "{_yaml_escape(title)}"',
        f'category: "{_yaml_escape(data.get("category", "прочее"))}"',
        f'brand: "{_yaml_escape(data.get("brand", ""))}"',
        'store: ""',
        f'base_unit: {data.get("base_unit", "шт")}',
        f'typical_pack_size: {data.get("typical_pack_size", "")}',
        f'typical_pack_unit: {data.get("typical_pack_unit", "")}',
        f'perishable: {str(data.get("perishable", False)).lower()}',
        f'default_shelf_life_days: {data.get("default_shelf_life_days", "")}',
        'price: ""',
        'image: ""',
        f'created: {today}',
        "tags:",
        "  - еда",
        "  - product",
        "---",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def extract_barcode(image_bytes: bytes) -> Optional[str]:
    if not _HAS_PYZBAR:
        return None
    try:
        img = Image.open(io.BytesIO(image_bytes))
        decoded = decode(img)
        for d in decoded:
            if d.type in ("EAN13", "EAN8", "UPCA", "UPCE", "CODE128"):
                return d.data.decode("utf-8").strip()
    except Exception:
        pass
    return None


def process_barcode(barcode: str, openrouter_key: str) -> Dict[str, Any]:
    # Deduplication: check if product with this barcode already exists
    existing = find_product_by_barcode(barcode)
    if existing:
        return {
            "status": "existing",
            "barcode": barcode,
            "file_path": existing["path"],
            "normalized": existing["frontmatter"],
            "is_new": False,
            "message": "Product with this barcode already exists in database."
        }

    candidates = fetch_candidates(barcode)
    normalized = None
    if candidates:
        normalized = openrouter_normalize(barcode, candidates, openrouter_key)

    if normalized:
        # Double-check by title to avoid near-duplicates
        dup_by_title = find_product_by_title(normalized["title"])
        if dup_by_title and dup_by_title["path"] != (existing["path"] if existing else ""):
            return {
                "status": "existing",
                "barcode": barcode,
                "file_path": dup_by_title["path"],
                "normalized": dup_by_title["frontmatter"],
                "is_new": False,
                "message": "Similar product title already exists."
            }
        path = create_product_note(normalized)
        return {
            "status": "created",
            "barcode": barcode,
            "candidates_count": len(candidates),
            "normalized": normalized,
            "file_path": str(path),
            "is_new": True
        }
    elif candidates:
        dup_by_title = find_product_by_title(candidates[0]["title"])
        if dup_by_title:
            return {
                "status": "existing",
                "barcode": barcode,
                "file_path": dup_by_title["path"],
                "normalized": dup_by_title["frontmatter"],
                "is_new": False,
                "message": "Similar product title already exists."
            }
        path = create_product_note(candidates[0])
        return {
            "status": "created_fallback",
            "barcode": barcode,
            "candidates_count": len(candidates),
            "normalized": candidates[0],
            "file_path": str(path),
            "message": "LLM normalization unavailable; used first raw candidate.",
            "is_new": True
        }
    else:
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
        return {
            "status": "created_blank",
            "barcode": barcode,
            "file_path": str(path),
            "normalized": blank,
            "message": "No internet candidates found. Created blank product note for manual fill.",
            "is_new": True
        }
