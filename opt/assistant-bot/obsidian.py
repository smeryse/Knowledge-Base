 
import subprocess
 
import json
import os
import re
import yaml
from datetime import datetime
import random
import string

class VaultManager:
    def __init__(self, vault_path):
        self.vault_path = vault_path
        self.kosh_path = os.path.join(vault_path, "LifeOS", "Кошелек")
    
    def _transactions_path(self):
        return os.path.join(self.kosh_path, "Transactions")
    
    def _categories_path(self):
        return os.path.join(self.kosh_path, "Categories")
    
    def _cashback_path(self):
        return os.path.join(self.kosh_path, "Cashback Programs")
    
    def _budgets_path(self):
        return os.path.join(self.kosh_path, "Budgets")
    
    def _generate_id(self):
        return "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    
    def _parse_yaml_file(self, path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        match = re.match(r'---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
        if match:
            try:
                return yaml.safe_load(match.group(1)) or {}
            except:
                return {}
        return {}
    
    def get_categories(self):
        cats = []
        cats_dir = self._categories_path()
        if not os.path.exists(cats_dir):
            return cats
        for f in os.listdir(cats_dir):
            if f.endswith('.md'):
                data = self._parse_yaml_file(os.path.join(cats_dir, f))
                if data.get('type') == 'category':
                    cats.append(data)
        return cats
    
    def get_base_categories(self):
        return [c for c in self.get_categories() if c.get('bucket_type') == 'base']
    
    def get_overflow_categories(self):
        return [c for c in self.get_categories() if c.get('bucket_type') == 'overflow' and c.get('title') != 'Нераспределенные']
    
    def get_cashback_programs(self):
        programs = []
        cb_dir = self._cashback_path()
        if not os.path.exists(cb_dir):
            return programs
        for f in os.listdir(cb_dir):
            if f.endswith('.md'):
                data = self._parse_yaml_file(os.path.join(cb_dir, f))
                if data.get('type') == 'cashback_program':
                    programs.append(data)
        return programs
    
    def get_cashback_percent(self, bank, category):
        for prog in self.get_cashback_programs():
            if prog.get('bank') == bank:
                for cat in prog.get('categories', []):
                    if cat.get('name') == category:
                        return cat.get('percent', 0)
        return 0
    
    def get_transactions(self, month_key=None, direction=None):
        trans = []
        t_dir = self._transactions_path()
        if not os.path.exists(t_dir):
            return trans
        for f in os.listdir(t_dir):
            if f.endswith('.md'):
                data = self._parse_yaml_file(os.path.join(t_dir, f))
                if data.get('type') == 'transaction':
                    if month_key and not f.startswith(month_key):
                        continue
                    if direction and data.get('direction') != direction:
                        continue
                    trans.append(data)
        return trans
    
    def get_monthly_stats(self, month_key):
        trans = self.get_transactions(month_key=month_key)
        income = sum(t['amount'] for t in trans if t.get('direction') == 'income')
        expense = sum(t.get('net_amount', t['amount']) for t in trans if t.get('direction') == 'expense')
        
        base_spent = {}
        for t in trans:
            if t.get('direction') == 'expense':
                cat = t.get('category', 'Unknown')
                base_spent[cat] = base_spent.get(cat, 0) + t.get('net_amount', t['amount'])
        
        return {
            'income': income,
            'expense': expense,
            'balance': income - expense,
            'base_spent': base_spent
        }
    
    def calculate_overflow(self, month_key):
        stats = self.get_monthly_stats(month_key)
        income = stats['income']
        base_cats = sorted(self.get_base_categories(), key=lambda x: x.get('priority', 99))
        
        base_total = 0
        base_used = 0
        for cat in base_cats:
            limit = cat.get('base_limit', 0)
            spent = stats['base_spent'].get(cat['title'], 0)
            base_total += limit
            base_used += min(spent, limit)
        
        overflow_pool = max(0, income - base_total)
        
        overflow_cats = sorted(self.get_overflow_categories(), key=lambda x: x.get('priority', 99))
        total_weight = sum(c.get('weight', 0) for c in overflow_cats if c.get('weight', 0) > 0)
        
        distribution = {}
        remaining = overflow_pool
        
        for cat in overflow_cats:
            weight = cat.get('weight', 0)
            if weight <= 0:
                continue
            share = (weight / total_weight) * overflow_pool if total_weight > 0 else 0
            cap = cat.get('cap', 0)
            if cap > 0:
                share = min(share, cap)
            distribution[cat['title']] = round(share)
            remaining -= share
        
        if remaining > 0:
            no_cap = [c for c in overflow_cats if c.get('cap', 0) == 0 and c.get('weight', 0) > 0]
            if no_cap:
                highest = max(no_cap, key=lambda x: x.get('weight', 0))
                distribution[highest['title']] = distribution.get(highest['title'], 0) + round(remaining)
            else:
                distribution['Нераспределенные'] = round(remaining)
        
        return {
            'income': income,
            'base_limit': base_total,
            'base_used': base_used,
            'overflow_pool': round(overflow_pool),
            'distribution': distribution
        }
    
    def add_transaction(self, amount, direction, category, account=None, store=None, note=None):
        t_dir = self._transactions_path()
        os.makedirs(t_dir, exist_ok=True)
        
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H-%M")
        tx_id = self._generate_id()
        filename = f"{date_str}--{time_str}--{tx_id}.md"
        filepath = os.path.join(t_dir, filename)
        
        cashback_percent = 0
        cashback_amount = 0
        net_amount = amount
        
        if direction == 'expense' and account:
            cashback_percent = self.get_cashback_percent(account, category)
            if cashback_percent > 0:
                cashback_amount = round(amount * cashback_percent / 100)
                net_amount = amount - cashback_amount
        
        tx_data = {
            'type': 'transaction',
            'direction': direction,
            'amount': amount,
            'net_amount': net_amount,
            'category': category,
            'account': account or 'Наличные',
            'date': date_str,
            'time': time_str,
            'store': store or '',
            'note': note or '',
            'cashback_percent': cashback_percent,
            'cashback_amount': cashback_amount,
            'cashback_status': 'pending' if cashback_amount > 0 else 'none',
            'id': tx_id
        }
        
        content = f"""---
type: transaction
direction: {direction}
amount: {amount}
net_amount: {net_amount}
category: {category}
account: {account or 'Наличные'}
date: {date_str}
time: {time_str}
store: {store or ''}
note: {note or ''}
cashback_percent: {cashback_percent}
cashback_amount: {cashback_amount}
cashback_status: {'pending' if cashback_amount > 0 else 'none'}
id: {tx_id}
---

# {direction.upper()} {amount}₽ — {category}

"""
        
        if cashback_amount > 0:
            content += f"Кешбэк: {cashback_amount}₽ ({cashback_percent}%) ожидает начисления\n"
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        self._git_commit(f"{direction}: {amount} -> {category}")
        return tx_data
    
    def _git_commit(self, message):
        vp = self.vault_path
        try:
            # Stage all changes
            r1 = subprocess.run(['git', 'add', '-A'], cwd=vp, capture_output=True, text=True)
            if r1.returncode != 0:
                print(f"[GIT] add failed: {r1.stderr}")
                return
            
            # Check if there's anything to commit
            r2 = subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=vp, capture_output=True)
            if r2.returncode == 0:
                return  # nothing to commit
            
            # Commit
            r3 = subprocess.run(['git', 'commit', '-m', message], cwd=vp, capture_output=True, text=True)
            if r3.returncode != 0:
                print(f"[GIT] commit failed: {r3.stderr}")
                return
            
            # Pull with rebase to avoid merge commits
            r4 = subprocess.run(['git', 'pull', 'origin', 'HEAD', '--rebase'], cwd=vp, capture_output=True, text=True)
            if r4.returncode != 0:
                print(f"[GIT] pull rebase failed: {r4.stderr}")
                # Try abort and push anyway
                subprocess.run(['git', 'rebase', '--abort'], cwd=vp, capture_output=True)
            
            # Push
            r5 = subprocess.run(['git', 'push', 'origin', 'HEAD'], cwd=vp, capture_output=True, text=True)
            if r5.returncode != 0:
                print(f"[GIT] push failed: {r5.stderr}")
            else:
                print(f"[GIT] committed and pushed: {message}")
        except Exception as e:
            print(f"[GIT] exception: {e}")

class KitchenManager:
    def __init__(self, vault_path):
        self.vault_path = vault_path
        self.kitchen_path = os.path.join(vault_path, "LifeOS", "Кухня")
        self.products_path = os.path.join(self.kitchen_path, "Products")
        self.stores_path = os.path.join(self.kitchen_path, "Stores")
        self.categories_path = os.path.join(self.kitchen_path, "Categories")
        self.receipts_path = os.path.join(self.kitchen_path, "Receipts")
        self.pantry_path = os.path.join(self.kitchen_path, "Pantry")
        self.mapping_path = os.path.join(self.kitchen_path, "System", "receipt-product-mapping.json")
        self.store_cache_path = os.path.join(self.kitchen_path, "System", "store-cache.json")
        
        for p in [self.products_path, self.stores_path, self.categories_path,
                  self.receipts_path, self.pantry_path]:
            os.makedirs(p, exist_ok=True)
        
        # Product cache
        self._products_cache = None
        self._products_cache_mtime = 0
    
    def _get_products_mtime(self):
        mtime = 0
        if not os.path.exists(self.products_path):
            return 0
        for f in os.listdir(self.products_path):
            if f.endswith('.md'):
                p = os.path.join(self.products_path, f)
                try:
                    mtime = max(mtime, os.path.getmtime(p))
                except Exception:
                    pass
        return mtime
    
    def _load_all_products_cached(self):
        mtime = self._get_products_mtime()
        if self._products_cache is not None and mtime == self._products_cache_mtime:
            return self._products_cache
        self._products_cache = self._load_all_products()
        self._products_cache_mtime = mtime
        return self._products_cache
    
    def _slugify(self, text):
        text = text.lower().replace(" ", "-").replace("/", "-")
        text = re.sub(r"[^a-zа-яё0-9-]", "", text)
        text = re.sub(r"-+", "-", text).strip("-")
        return text or "item"
    
    def _unique_path(self, folder, base_name):
        slug = self._slugify(base_name)
        candidate = os.path.join(folder, f"{slug}.md")
        i = 2
        while os.path.exists(candidate):
            candidate = os.path.join(folder, f"{slug}-{i}.md")
            i += 1
        return candidate
    
    def _make_relative(self, path):
        if path.startswith(self.vault_path + os.sep):
            return path[len(self.vault_path) + 1:]
        return path
    
    def _make_absolute(self, rel_path):
        if rel_path.startswith(os.sep):
            return rel_path
        return os.path.join(self.vault_path, rel_path)
    
    def _parse_yaml_file(self, path):
        """Parse YAML frontmatter from a markdown file."""
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        match = re.match(r'---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
        if match:
            try:
                return yaml.safe_load(match.group(1)) or {}
            except:
                return {}
        return {}
    
    def _write_note(self, path, frontmatter, body=""):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        content = f"---\n{yaml.dump(frontmatter, allow_unicode=True, sort_keys=False)}---\n\n{body}"
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def _rewrite_frontmatter(self, path, frontmatter):
        """Rewrite frontmatter in an existing note, preserving body."""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        new_fm = yaml.dump(frontmatter, allow_unicode=True, sort_keys=False)
        new_content = re.sub(
            r'^---\n.*?\n---\s*\n',
            f'---\n{new_fm}---\n\n',
            content,
            count=1,
            flags=re.DOTALL
        )
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
    
    def _wikilink(self, rel_path, alias=""):
        clean = rel_path.replace('.md', '').strip()
        alias = alias.strip()
        return f"[[{clean}|{alias}]]" if alias else f"[[{clean}]]"
    
    def _wikilink_table(self, rel_path, alias=""):
        clean = rel_path.replace('.md', '').strip()
        alias = alias.strip()
        return f"[[{clean}\\|{alias}]]" if alias else f"[[{clean}]]"
    
    def _load_mapping(self):
        if os.path.exists(self.mapping_path):
            with open(self.mapping_path, 'r', encoding='utf-8') as f:
                try:
                    mapping = json.load(f)
                    return {k: self._make_absolute(v) for k, v in mapping.items()}
                except json.JSONDecodeError:
                    return {}
        return {}
    
    def _save_mapping(self, mapping):
        rel_mapping = {k: self._make_relative(v) for k, v in mapping.items()}
        with open(self.mapping_path, 'w', encoding='utf-8') as f:
            json.dump(rel_mapping, f, ensure_ascii=False, indent=2)
    
    # ==================== Alias-based product resolution ====================
    
    def _load_all_products(self):
        products = []
        if not os.path.exists(self.products_path):
            return products
        for f in os.listdir(self.products_path):
            if f.endswith('.md'):
                path = os.path.join(self.products_path, f)
                fm = self._parse_yaml_file(path)
                products.append({'path': path, 'fm': fm})
        return products
    
    def _find_by_alias(self, raw_name, products):
        query = raw_name.strip().lower()
        # 1) Exact alias/title match
        for p in products:
            fm = p['fm']
            aliases = fm.get('aliases', [])
            if isinstance(aliases, str):
                aliases = [aliases]
            all_names = [str(a).strip().lower() for a in aliases] + [str(fm.get('title', '')).strip().lower()]
            if query in all_names:
                return p
        # 2) Substring match (raw_name inside any alias/title)
        for p in products:
            fm = p['fm']
            aliases = fm.get('aliases', [])
            if isinstance(aliases, str):
                aliases = [aliases]
            all_text = ' '.join([str(fm.get('title', ''))] + [str(a) for a in aliases]).lower()
            if query in all_text:
                return p
        return None
    
    def _maybe_update_barcode(self, product, barcode):
        if not barcode:
            return
        fm = product['fm']
        existing = str(fm.get('barcode', '')).strip()
        if not existing:
            fm['barcode'] = barcode
            self._rewrite_frontmatter(product['path'], fm)
    
    def _find_or_create_category(self, title):
        if not title:
            title = "Прочее"
        slug = self._slugify(title)
        path = os.path.join(self.categories_path, f"{slug}.md")
        if os.path.exists(path):
            rel = self._make_relative(path).replace('.md', '')
            return path, self._wikilink(rel, title)
        
        fm = {
            'type': 'category',
            'title': title,
            'aliases': [title],
            'created': datetime.now().strftime('%Y-%m-%d'),
            'tags': ['category']
        }
        self._write_note(path, fm, body=f"# {title}\n\n## Заметки\n\n>")
        rel = self._make_relative(path).replace('.md', '')
        return path, self._wikilink(rel, title)
    
    def _short_name(self, text, max_words=4):
        words = text.replace('-', ' ').split()
        short = ' '.join(words[:max_words])
        return short.strip()

    def _create_products_from_llm(self, llm_results, price_map=None):
        created = {}
        for data in llm_results:
            raw_name = data.get('raw_name')
            if not raw_name:
                raise RuntimeError(f"LLM result missing 'raw_name': {json.dumps(data, ensure_ascii=False)[:200]}")
            norm = data['normalized_name']
            cat_title = data.get('category', 'Прочее')
            _, cat_wiki = self._find_or_create_category(cat_title)
            
            aliases = data.get('aliases', [])
            if not isinstance(aliases, list):
                aliases = []
            if norm not in aliases:
                aliases.append(norm)
            if raw_name not in aliases:
                aliases.append(raw_name)
            
            # Price from receipt (per unit, rubles)
            price_raw = price_map.get(raw_name, 0) if price_map else 0
            price_val = round(price_raw / 100, 2) if price_raw else ''
            
            fm = {
                'type': 'product',
                'title': norm,
                'barcode': str(data.get('barcode', '')).strip(),
                'aliases': aliases,
                'category': cat_wiki,
                'brand': data.get('brand', ''),
                'base_unit': str(data.get('base_unit', 'шт')).strip() or 'шт',
                'typical_pack_size': data.get('pack_size'),
                'typical_pack_unit': data.get('pack_unit'),
                'perishable': bool(data.get('perishable', False)),
                'default_shelf_life_days': '',
                'price': price_val,
                'image': '',
                'created': datetime.now().strftime('%Y-%m-%d'),
                'tags': ['product']
            }
            
            path = self._unique_path(self.products_path, norm)
            self._write_note(path, fm, body="")
            
            product_obj = {'path': path, 'fm': fm}
            created[raw_name] = product_obj
            
            mapping = self._load_mapping()
            mapping[raw_name.strip().lower()] = self._make_relative(path)
            self._save_mapping(mapping)
        
        return created
    
    # ==================== Store resolution ====================
    
    def _load_known_stores(self):
        stores = []
        if not os.path.exists(self.stores_path):
            return stores
        for f in os.listdir(self.stores_path):
            if f.endswith('.md'):
                fm = self._parse_yaml_file(os.path.join(self.stores_path, f))
                title = fm.get('title', '')
                if title:
                    stores.append(title)
                aliases = fm.get('aliases', [])
                if isinstance(aliases, str):
                    aliases = [aliases]
                for a in aliases:
                    a = str(a).strip()
                    if a and a not in stores:
                        stores.append(a)
        return stores
    
    def _load_store_cache(self):
        if os.path.exists(self.store_cache_path):
            with open(self.store_cache_path, 'r', encoding='utf-8') as f:
                try:
                    return json.load(f)
                except json.JSONDecodeError:
                    return {}
        return {}
    
    def _save_store_cache(self, cache):
        os.makedirs(os.path.dirname(self.store_cache_path), exist_ok=True)
        with open(self.store_cache_path, 'w', encoding='utf-8') as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    
    def save_store_mapping(self, raw_name, chosen_name):
        """Save mapping from API raw store name to user-chosen store name."""
        if not raw_name or not chosen_name:
            return
        cache = self._load_store_cache()
        cache[raw_name.strip()] = {'name': chosen_name.strip(), 'method': 'user'}
        self._save_store_cache(cache)
    
    def _match_store_exact(self, raw_name, known_stores):
        raw = raw_name.strip().lower()
        # 1) Exact match
        for name in known_stores:
            if name.strip().lower() == raw:
                return name
        # 2) Longest substring match (prefer more specific names like "Озон Фреш" over "Озон")
        best_match = None
        best_len = 0
        for name in known_stores:
            nlower = name.strip().lower()
            if nlower in raw and len(nlower) > best_len:
                best_match = name
                best_len = len(nlower)
        return best_match
    
    def resolve_store(self, raw_name):
        if not raw_name:
            return None, "Неизвестный магазин", 'unknown'
        
        raw_clean = raw_name.strip()
        cache = self._load_store_cache()
        
        # 1) Cache hit (includes user mappings)
        if raw_clean in cache:
            cached = cache[raw_clean]
            path, name = self.find_or_create_store(cached['name'])
            return path, name, cached.get('method', 'exact')
        
        # 2) Load known stores
        known = self._load_known_stores()
        
        # 3) Exact substring match (with longest match priority)
        match = self._match_store_exact(raw_clean, known)
        if match:
            cache[raw_clean] = {'name': match, 'method': 'exact'}
            self._save_store_cache(cache)
            path, _ = self.find_or_create_store(match)
            return path, match, 'exact'
        
        # 4) Not found — do NOT create placeholder store; ask user
        return None, raw_clean, 'unknown'
    
    def find_or_create_store(self, store_name):
        store_name = store_name.strip() or "Неизвестный магазин"
        slug = self._slugify(store_name)
        path = os.path.join(self.stores_path, f"{slug}.md")
        
        if os.path.exists(path):
            fm = self._parse_yaml_file(path)
            actual_name = fm.get('title', store_name)
            return path, actual_name
        
        fm = {
            'type': 'store',
            'title': store_name,
            'aliases': [store_name],
            'created': datetime.now().strftime('%Y-%m-%d'),
            'tags': ['store']
        }
        self._write_note(path, fm, body=f"# {store_name}\n\n## Заметки\n\n>")
        return path, store_name
    
    def update_receipt_store(self, receipt_path, new_store_name):
        store_path, store_name = self.find_or_create_store(new_store_name)
        rel_store = self._make_relative(store_path).replace('.md', '')
        store_wiki = self._wikilink(rel_store, store_name)
        
        # Update frontmatter
        fm = self._parse_yaml_file(receipt_path)
        fm['store'] = store_wiki
        self._rewrite_frontmatter(receipt_path, fm)
        
        # Update receipt title in body
        with open(receipt_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        date_str = fm.get('date', '')
        old_title_match = re.search(rf'^# Чек {re.escape(date_str)} .*$', content, re.MULTILINE)
        if old_title_match:
            new_title = f"# Чек {date_str} {store_name}"
            content = content.replace(old_title_match.group(0), new_title)
            with open(receipt_path, 'w', encoding='utf-8') as f:
                f.write(content)
        
        self._git_commit(f"Изменён магазин: {store_name}")
        return store_path, store_name
    
    # ==================== Receipt flow ====================
    
    def create_receipt(self, date_str, store_path, store_name, total_sum, qr_data=''):
        title = f"{date_str} {store_name}"
        path = self._unique_path(self.receipts_path, title)
        
        rel_store = self._make_relative(store_path).replace('.md', '')
        
        fm = {
            'type': 'receipt',
            'date': date_str,
            'store': self._wikilink(rel_store, store_name),
            'total': total_sum / 100,
            'receipt_image': '',
            'qr_data': qr_data,
            'created': datetime.now().strftime('%Y-%m-%d'),
            'tags': ['receipt']
        }
        body = f"# Чек {title}\n\n## Позиции\n\n| Товар | Кол-во | Фасовка | Цена | В запас |\n| ----- | ------ | ------- | ---- | ------- |\n"
        self._write_note(path, fm, body)
        return path
    

    def add_pantry_item(self, product_path, product_name, qty, unit, receipt_path=None):
        short = self._short_name(product_name)
        path = self._unique_path(self.pantry_path, short)
        
        rel_product = self._make_relative(product_path).replace('.md', '')
        receipt_link = ''
        if receipt_path:
            receipt_rel = self._make_relative(receipt_path).replace('.md', '')
            receipt_link = self._wikilink(receipt_rel, f"{product_name} - покупка")
        
        fm = {
            'type': 'pantry-item',
            'product': self._wikilink(rel_product, product_name),
            'source_receipt': receipt_link,
            'qty_current': qty,
            'unit': unit,
            'manufactured_on': '',
            'created': datetime.now().strftime('%Y-%m-%d'),
            'tags': ['pantry-item']
        }
        body = f"# {product_name} - запас\n\n## Заметки\n\n>"
        self._write_note(path, fm, body)
        return path
    
    def update_receipt_table(self, receipt_path, product_path, product_name, qty, price_total, pantry_path=None):
        with open(receipt_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        rel_product = self._make_relative(product_path).replace('.md', '')
        
        if pantry_path and os.path.exists(pantry_path):
            rel_pantry = self._make_relative(pantry_path).replace('.md', '')
            pantry_cell = self._wikilink_table(rel_pantry, "Да")
        else:
            pantry_cell = "Нет"
        
        row = f"| {self._wikilink_table(rel_product, product_name)} | {qty} | - шт | {price_total/100:.2f} | {pantry_cell} |"
        
        if "## Заметки" in content:
            content = content.replace("## Заметки", f"{row}\n## Заметки")
        else:
            content += f"\n{row}\n"
        
        with open(receipt_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def prepare_items(self, items, ai_norm):
        """
        Phase 1: Resolve products locally + LLM for unknowns.
        Creates new product files if needed.
        Returns list of resolved entries: {item, product, name, is_new}
        """
        products = self._load_all_products_cached()
        resolved = []
        unknown = []
        
        for item in items:
            raw = item.get('raw_name', '')
            if not raw:
                raise RuntimeError(f"Item missing raw_name: {json.dumps(item, ensure_ascii=False)[:200]}")
            found = self._find_by_alias(raw, products)
            if found:
                self._maybe_update_barcode(found, item.get('barcode', ''))
                resolved.append({'item': item, 'product': found, 'name': found['fm'].get('title', raw), 'is_new': False})
            else:
                unknown.append(item)
        
        if unknown:
            llm_results = ai_norm.normalize_unknown_batch(unknown)
            price_map = {item['raw_name']: item.get('price', 0) for item in unknown}
            new_products = self._create_products_from_llm(llm_results, price_map)
            for item in unknown:
                raw = item.get('raw_name', '')
                prod = new_products.get(raw)
                if prod:
                    resolved.append({'item': item, 'product': prod, 'name': prod['fm'].get('title', raw), 'is_new': True})
                else:
                    raise RuntimeError(f"LLM did not return product for: {raw}")
        
        return resolved
    
    def commit_receipt(self, receipt_meta, prepared_items, store_hint=None):
        """
        Phase 2: Create receipt file + pantry. Pantry items link back to receipt.
        store_hint overrides receipt_meta['store'] if provided.
        Returns dict with detailed breakdown.
        """
        date_str = receipt_meta.get("dateTime", "")[:10] if receipt_meta.get("dateTime") else datetime.now().strftime('%Y-%m-%d')
        raw_store = store_hint if store_hint is not None else receipt_meta.get("store", "")
        total = receipt_meta.get("totalSum", 0)
        qr_data = receipt_meta.get("qr_data", "")
        
        store_path, store_name, store_method = self.resolve_store(raw_store)
        
        # Remember user mapping: API raw name -> chosen store
        api_raw = receipt_meta.get("store", "")
        if api_raw and store_hint and api_raw.strip() != store_name.strip():
            self.save_store_mapping(api_raw, store_name)
        
        if not store_path:
            store_path, store_name = self.find_or_create_store(store_name)
        
        receipt_path = self.create_receipt(date_str, store_path, store_name, total, qr_data)
        receipt_title = f"{date_str} {store_name}"
        
        pantry_names = []
        pantry_paths = []
        all_items = []
        
        for entry in prepared_items:
            item = entry['item']
            prod = entry['product']
            name = entry['name']
            qty = float(item.get('quantity', 1))
            price_total = int(item.get('sum', 0))
            unit = item.get('unit', 'шт')
            
            if entry.get('add_to_pantry', True):
                pantry_path = self.add_pantry_item(prod['path'], name, qty, unit, receipt_path)
                pantry_paths.append(pantry_path)
                pantry_names.append(name)
            else:
                pantry_path = None
            
            all_items.append({'name': name, 'is_new': entry.get('is_new', False)})
            
            self.update_receipt_table(receipt_path, prod['path'], name, qty, price_total, pantry_path=pantry_path)
        
        self._git_commit(f"Чек: {store_name} {date_str}, {len(prepared_items)} поз.")
        
        return {
            'receipt_path': receipt_path,
            'pantry_paths': pantry_paths,
            'store_name': store_name,
            'store_method': store_method,
            'date_str': date_str,
            'total': total,
            'items_count': len(prepared_items),
            'all_items': all_items,
            'new_count': sum(1 for x in all_items if x['is_new']),
            'known_count': sum(1 for x in all_items if not x['is_new']),
            'pantry_count': len(pantry_names),
            'pantry_names': pantry_names
        }
    
    def import_receipt(self, receipt_meta, items, ai_norm):
        """
        Full atomic receipt import (backward compatible).
        """
        prepared = self.prepare_items(items, ai_norm)
        return self.commit_receipt(receipt_meta, prepared)
    
    def cancel_receipt(self, receipt_path):
        """Delete receipt and all linked pantry records. Preserve products and stores."""
        # Find all pantry items that link to this receipt
        receipt_rel = self._make_relative(receipt_path).replace('.md', '')
        receipt_wiki = self._wikilink(receipt_rel, '')
        
        if os.path.exists(self.pantry_path):
            for fname in os.listdir(self.pantry_path):
                if not fname.endswith('.md'):
                    continue
                ppath = os.path.join(self.pantry_path, fname)
                fm = self._parse_yaml_file(ppath)
                src = str(fm.get('source_receipt', ''))
                # Match by path (with or without .md)
                if receipt_rel in src or receipt_path in src:
                    os.remove(ppath)
        
        if os.path.exists(receipt_path):
            os.remove(receipt_path)
        self._git_commit(f"Отмена чека: удалён {os.path.basename(receipt_path)}")
    
    def _git_commit(self, message):
        vp = self.vault_path
        try:
            # Stage all changes
            r1 = subprocess.run(['git', 'add', '-A'], cwd=vp, capture_output=True, text=True)
            if r1.returncode != 0:
                print(f"[GIT] add failed: {r1.stderr}")
                return
            
            # Check if there's anything to commit
            r2 = subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=vp, capture_output=True)
            if r2.returncode == 0:
                return  # nothing to commit
            
            # Commit
            r3 = subprocess.run(['git', 'commit', '-m', message], cwd=vp, capture_output=True, text=True)
            if r3.returncode != 0:
                print(f"[GIT] commit failed: {r3.stderr}")
                return
            
            # Pull with rebase to avoid merge commits
            r4 = subprocess.run(['git', 'pull', 'origin', 'HEAD', '--rebase'], cwd=vp, capture_output=True, text=True)
            if r4.returncode != 0:
                print(f"[GIT] pull rebase failed: {r4.stderr}")
                # Try abort and push anyway
                subprocess.run(['git', 'rebase', '--abort'], cwd=vp, capture_output=True)
            
            # Push
            r5 = subprocess.run(['git', 'push', 'origin', 'HEAD'], cwd=vp, capture_output=True, text=True)
            if r5.returncode != 0:
                print(f"[GIT] push failed: {r5.stderr}")
            else:
                print(f"[GIT] committed and pushed: {message}")
        except Exception as e:
            print(f"[GIT] exception: {e}")

