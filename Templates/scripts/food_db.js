module.exports = async function foodDb(tp) {
    const ROOT = "LifeOS/Кухня";
    const DIRS = {
        products: `${ROOT}/Products`,
        stores: `${ROOT}/Stores`,
        categories: `${ROOT}/Categories`,
        receipts: `${ROOT}/Receipts`,
        receiptItems: `${ROOT}/Receipt Items`,
        pantry: `${ROOT}/Pantry`
    };
    const today = tp.date.now("YYYY-MM-DD");

    function notice(message, timeout = 5000) {
        new Notice(message, timeout);
    }

    function lower(value) {
        return String(value || "").trim().toLowerCase();
    }

    function cleanBarcode(value) {
        return String(value || "").replace(/\D/g, "");
    }

    function looksLikeBarcode(value) {
        const barcode = cleanBarcode(value);
        return barcode.length >= 8;
    }

    function buildBarcodeVariants(barcode) {
        const clean = cleanBarcode(barcode);
        const variants = [];
        const seen = new Set();

        function pushVariant(value, reason) {
            const normalized = cleanBarcode(value);
            if (!normalized || seen.has(normalized)) return;
            seen.add(normalized);
            variants.push({ code: normalized, reason });
        }

        pushVariant(clean, "original");

        if (clean.length === 14) {
            pushVariant(clean.slice(1), "gtin14-drop-leading-digit");
        }

        if (clean.length === 13 && clean.startsWith("0")) {
            pushVariant(clean.slice(1), "ean13-drop-leading-zero");
        }

        return variants;
    }

    async function readProjectFile(relativePath) {
        const file = app.vault.getAbstractFileByPath(relativePath);
        if (!file) return null;
        return await app.vault.read(file);
    }

    async function httpGetText(url) {
        if (typeof requestUrl === "function") {
            const response = await requestUrl({ url, method: "GET" });
            return response.text;
        }

        const response = await fetch(url);
        return await response.text();
    }

    async function httpGetJson(url) {
        if (typeof requestUrl === "function") {
            const response = await requestUrl({ url, method: "GET" });
            return response.json;
        }

        const response = await fetch(url);
        return await response.json();
    }

    function stripHtml(value) {
        return String(value || "")
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/\s+/g, " ")
            .trim();
    }

    function extractJsonObject(text) {
        const match = String(text || "").match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch (error) {
            return null;
        }
    }

    function parseQuantity(quantity) {
        const quantityMatch = String(quantity || "").trim().match(/(\d+(?:[\.,]\d+)?)\s*(kg|g|гр|гр\.|l|ml|л|мл|pcs|шт)/i);
        if (!quantityMatch) {
            return { typical_pack_size: "", typical_pack_unit: "" };
        }

        return {
            typical_pack_size: Number(quantityMatch[1].replace(",", ".")),
            typical_pack_unit: normalizeUnit(quantityMatch[2].replace("гр.", "гр"))
        };
    }

    function pushCandidate(candidates, candidate, dedupe) {
        const key = [candidate.source, candidate.lookup_code || candidate.barcode, candidate.title].join("|").toLowerCase();
        if (!candidate.title || dedupe.has(key)) return;
        dedupe.add(key);
        candidates.push(candidate);
    }

    function extractSearchBlocks(html, source) {
        const blocks = [];

        if (source === "duckduckgo") {
            const matches = [...String(html || "").matchAll(/result__title[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?result__snippet[^>]*>([\s\S]*?)<\/a?>/gi)];
            for (const match of matches.slice(0, 5)) {
                blocks.push({ title: stripHtml(match[1]), snippet: stripHtml(match[2]) });
            }
        }

        if (source === "bing") {
            const matches = [...String(html || "").matchAll(/<li class="b_algo"[\s\S]*?<h2><a[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>/gi)];
            for (const match of matches.slice(0, 5)) {
                blocks.push({ title: stripHtml(match[1]), snippet: stripHtml(match[2]) });
            }
        }

        return blocks.filter(block => block.title && block.snippet);
    }

    async function fetchWebSearchCandidates(originalBarcode, variant) {
        const candidates = [];
        const quoted = encodeURIComponent(`"${variant.code}"`);
        const sources = [
            { name: "duckduckgo", url: `https://duckduckgo.com/html/?q=${quoted}` },
            { name: "bing", url: `https://www.bing.com/search?q=${quoted}` }
        ];

        for (const source of sources) {
            try {
                const html = await httpGetText(source.url);
                const blocks = extractSearchBlocks(html, source.name);
                for (const block of blocks) {
                    candidates.push({
                        source: `web-search-${source.name}`,
                        lookup_code: variant.code,
                        lookup_reason: variant.reason,
                        title: block.title,
                        barcode: cleanBarcode(originalBarcode),
                        brand: "",
                        category: "",
                        description: block.snippet,
                        typical_pack_size: "",
                        typical_pack_unit: "",
                        perishable: false,
                        default_shelf_life_days: ""
                    });
                }
            } catch (error) {}
        }

        return candidates;
    }

    async function fetchBarcodeSuggestion(barcode) {
        if (!looksLikeBarcode(barcode)) return null;

        try {
            const candidates = [];
            const dedupe = new Set();

            for (const variant of buildBarcodeVariants(barcode)) {
                const clean = variant.code;
                const offData = await httpGetJson(`https://world.openfoodfacts.org/api/v2/product/${clean}.json`);

                if (offData && offData.product) {
                    const product = offData.product;
                    const title = product.product_name_ru
                        || product.product_name
                        || product.generic_name_ru
                        || product.generic_name
                        || "";

                    if (title) {
                        const quantity = parseQuantity(product.quantity || "");
                        pushCandidate(candidates, {
                            source: "openfoodfacts",
                            lookup_code: clean,
                            lookup_reason: variant.reason,
                            title,
                            barcode: cleanBarcode(barcode),
                            brand: String(product.brands || "").split(",")[0].trim(),
                            category: product.categories_tags?.[0]
                                ? String(product.categories_tags[0]).replace(/^en:/, "").replace(/^ru:/, "")
                                : (product.product_type || ""),
                            description: String(product.generic_name_ru || product.generic_name || "").trim(),
                            typical_pack_size: quantity.typical_pack_size,
                            typical_pack_unit: quantity.typical_pack_unit,
                            perishable: true,
                            default_shelf_life_days: ""
                        }, dedupe);
                    }
                }

                const goUpcHtml = await httpGetText(`https://go-upc.com/search?q=${clean}`);
                const titleMatch = goUpcHtml.match(/<h1 class="product-name">([\s\S]*?)<\/h1>/i);
                const brandMatch = goUpcHtml.match(/<td class="metadata-label">Brand<\/td>\s*<td>([\s\S]*?)<\/td>/i);
                const categoryMatch = goUpcHtml.match(/<td class="metadata-label">Category<\/td>\s*<td>([\s\S]*?)<\/td>/i);
                const descriptionMatch = goUpcHtml.match(/<h2>\s*Description\s*<\/h2>\s*<span>([\s\S]*?)<\/span>/i);
                const goTitle = stripHtml(titleMatch?.[1] || "");

                if (goTitle) {
                    const quantity = parseQuantity(goTitle);
                    pushCandidate(candidates, {
                        source: "go-upc",
                        lookup_code: clean,
                        lookup_reason: variant.reason,
                        title: goTitle,
                        barcode: cleanBarcode(barcode),
                        brand: stripHtml(brandMatch?.[1] || ""),
                        category: stripHtml(categoryMatch?.[1] || ""),
                        description: stripHtml(descriptionMatch?.[1] || ""),
                        typical_pack_size: quantity.typical_pack_size,
                        typical_pack_unit: quantity.typical_pack_unit,
                        perishable: false,
                        default_shelf_life_days: ""
                    }, dedupe);
                }

                const barcodeListHtml = await httpGetText(`https://barcode-list.ru/barcode/RU/Поиск.htm?barcode=${clean}`);
                const barcodeListTitleMatch = barcodeListHtml.match(/<title>([\s\S]*?)<\/title>/i);
                const listTitle = stripHtml(barcodeListTitleMatch?.[1] || "");
                const codePattern = new RegExp(`<td[^>]*>\\s*${clean}\\s*<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, "gi");
                const nameMatches = [...barcodeListHtml.matchAll(codePattern)]
                    .map(match => stripHtml(match[1]))
                    .filter(Boolean);
                const titleCandidate = /Штрих-код:/i.test(listTitle)
                    ? listTitle.replace(/\s*-\s*Штрих-код:.*$/i, "").trim()
                    : "";
                const topName = nameMatches[0] || titleCandidate;

                if (topName) {
                    const quantity = parseQuantity(topName);
                    pushCandidate(candidates, {
                        source: "barcode-list",
                        lookup_code: clean,
                        lookup_reason: variant.reason,
                        title: topName,
                        barcode: cleanBarcode(barcode),
                        brand: "",
                        category: "",
                        description: nameMatches.slice(0, 5).join(" | "),
                        typical_pack_size: quantity.typical_pack_size,
                        typical_pack_unit: quantity.typical_pack_unit || "шт",
                        perishable: false,
                        default_shelf_life_days: ""
                    }, dedupe);
                }

                const searchCandidates = await fetchWebSearchCandidates(barcode, variant);
                for (const candidate of searchCandidates) {
                    pushCandidate(candidates, candidate, dedupe);
                }
            }

            if (candidates.length === 0) return null;

            return candidates[0];
        } catch (error) {
            return null;
        }
    }

    function slugify(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zа-яё0-9]+/gi, "-")
            .replace(/^-+|-+$/g, "")
            .replace(/-{2,}/g, "-");
    }

    function quoteYaml(value) {
        return `"${String(value).replace(/"/g, '\\"')}"`;
    }

    function parseYamlValue(raw) {
        if (raw === "true") return true;
        if (raw === "false") return false;
        if (raw === "null") return null;
        if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
        if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
            return raw.slice(1, -1);
        }
        if (raw === "[]") return [];
        return raw;
    }

    async function readFrontmatter(file) {
        const content = await app.vault.read(file);
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        const data = {};

        if (match) {
            for (const line of match[1].split("\n")) {
                const fieldMatch = line.match(/^([A-Za-z0-9_\-]+):\s*(.*)$/);
                if (!fieldMatch) continue;
                data[fieldMatch[1]] = parseYamlValue(fieldMatch[2].trim());
            }
        }

        data.file = file;
        data.content = content;
        data.title = data.title || file.basename;
        return data;
    }

    async function loadFolder(folder) {
        const files = app.vault.getMarkdownFiles().filter(file => file.path.startsWith(`${folder}/`));
        const rows = [];
        for (const file of files) {
            rows.push(await readFrontmatter(file));
        }
        return rows;
    }

    function sortByRelevance(input, rows) {
        const query = input.trim().toLowerCase();
        return [...rows]
            .map(row => {
                const title = String(row.title || row.file.basename).toLowerCase();
                let score = 0;
                if (title === query) score += 100;
                if (title.startsWith(query)) score += 40;
                if (title.includes(query)) score += 20;
                const words = query.split(/\s+/).filter(Boolean);
                for (const word of words) {
                    if (title.includes(word)) score += 5;
                }
                return { row, score };
            })
            .filter(entry => entry.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(entry => entry.row)
            .slice(0, 12);
    }

    async function ensureUniquePath(folder, baseName) {
        const safeBase = slugify(baseName) || "item";
        let candidate = `${folder}/${safeBase}.md`;
        let index = 2;
        while (app.vault.getAbstractFileByPath(candidate)) {
            candidate = `${folder}/${safeBase}-${index}.md`;
            index += 1;
        }
        return candidate;
    }

    async function createNote(folder, baseName, content) {
        const path = await ensureUniquePath(folder, baseName);
        return await app.vault.create(path, content);
    }

    function wikilink(targetPath, alias = "") {
        const cleanPath = String(targetPath || "").replace(/\.md$/i, "").trim();
        const cleanAlias = String(alias || "").trim();
        if (!cleanPath) return cleanAlias;
        return cleanAlias ? `[[${cleanPath}|${cleanAlias}]]` : `[[${cleanPath}]]`;
    }

    function buildProductContent(data) {
        return [
            "---",
            "type: product",
            `title: ${quoteYaml(data.title)}`,
            `barcode: ${quoteYaml(data.barcode || "")}`,
            "aliases:",
            `  - ${quoteYaml(data.title)}`,
            `category: ${data.categoryPath ? wikilink(data.categoryPath, data.categoryTitle || "") : ""}`,
            `brand: ${quoteYaml(data.brand || "")}`,
            `store: ${data.storePath ? wikilink(data.storePath, data.storeTitle || "") : ""}`,
            `base_unit: ${data.base_unit || "шт"}`,
            `typical_pack_size: ${data.typical_pack_size || ""}`,
            `typical_pack_unit: ${data.typical_pack_unit || ""}`,
            `perishable: ${Boolean(data.perishable)}`,
            `default_shelf_life_days: ${data.default_shelf_life_days || ""}`,
            `price: ${data.price || ""}`,
            `image: ${data.image ? quoteYaml(data.image) : ""}`,
            `created: ${today}`,
            "tags:",
            "  - еда",
            "  - product",
            "---",
            "",
            `# ${data.title}`,
            "",
            "## Заметки",
            "",
            ">"
        ].join("\n");
    }

    function buildStoreContent(data) {
        return [
            "---",
            "type: store",
            `title: ${quoteYaml(data.title)}`,
            "aliases:",
            `  - ${quoteYaml(data.title)}`,
            `created: ${today}`,
            "tags:",
            "  - еда",
            "  - store",
            "---",
            "",
            `# ${data.title}`,
            "",
            "## Заметки",
            "",
            ">"
        ].join("\n");
    }

    function updateScalar(content, field, value) {
        const stringValue = value === "" || value === null || value === undefined
            ? ""
            : typeof value === "string"
                ? quoteYaml(value)
                : String(value);
        const pattern = new RegExp(`^${field}:.*$`, "m");
        if (pattern.test(content)) {
            return content.replace(pattern, `${field}: ${stringValue}`);
        }
        return content;
    }

    function normalizeUnit(unit) {
        const map = {
            g: "г",
            gr: "г",
            "гр": "г",
            "гр.": "г",
            kg: "кг",
            ml: "мл",
            l: "л",
            pcs: "шт",
            pc: "шт",
            шт: "шт",
            штука: "шт",
            штук: "шт"
        };
        return map[String(unit || "").trim().toLowerCase()] || String(unit || "шт").trim().toLowerCase();
    }

    function convertToBaseUnit(packSize, packUnit, baseUnit) {
        const size = Number(packSize);
        if (!size || !packUnit || !baseUnit) return null;

        const from = normalizeUnit(packUnit);
        const to = normalizeUnit(baseUnit);

        if (from === to) return size;
        if (from === "кг" && to === "г") return size * 1000;
        if (from === "г" && to === "кг") return size / 1000;
        if (from === "л" && to === "мл") return size * 1000;
        if (from === "мл" && to === "л") return size / 1000;
        return null;
    }

    async function loadCategories() {
        return await loadFolder(DIRS.categories);
    }

    function buildCategoryContent(title) {
        return [
            "---",
            "type: category",
            `title: ${quoteYaml(title)}`,
            "aliases:",
            `  - ${quoteYaml(title)}`,
            `created: ${today}`,
            "tags:",
            "  - еда",
            "  - category",
            "---",
            "",
            `# ${title}`,
            "",
            "## Заметки",
            "",
            ">"
        ].join("\n");
    }

    async function pickCategory() {
        const categories = await loadCategories();
        const labels = categories.map(c => c.title);
        labels.unshift("+ Новая категория");

        const selected = await tp.system.suggester(labels, labels, false, "Выбери категорию");
        if (!selected) return null;

        if (selected !== "+ Новая категория") {
            return categories.find(c => c.title === selected);
        }

        const title = (await tp.system.prompt("Название новой категории"))?.trim();
        if (!title) return null;

        const file = await createNote(DIRS.categories, title, buildCategoryContent(title));
        notice(`Создана категория: ${title}`);
        return await readFrontmatter(file);
    }

    async function pickStore() {
        const stores = await loadFolder(DIRS.stores);
        const labels = stores.map(store => store.title);
        labels.unshift("+ Новый магазин");

        const selected = await tp.system.suggester(labels, labels, false, "Выбери магазин");
        if (!selected) return null;

        if (selected !== "+ Новый магазин") {
            return stores.find(store => store.title === selected);
        }

        const title = (await tp.system.prompt("Название нового магазина"))?.trim();
        if (!title) return null;

        const file = await createNote(DIRS.stores, title, buildStoreContent({ title }));
        notice(`Добавлен новый магазин: ${title}`);
        return await readFrontmatter(file);
    }

    async function createProduct(title, seed = {}) {
        notice(`Товар не найден. Сейчас будет создан новый: ${title}`);
        const suggestedBarcode = cleanBarcode(seed.barcode || (looksLikeBarcode(title) ? title : ""));
        const suggestedTitle = seed.title || title;
        const finalTitle = (await tp.system.prompt("Название нового товара", suggestedTitle))?.trim();
        if (!finalTitle) return null;
        const barcode = cleanBarcode((await tp.system.prompt(`Штрихкод для '${finalTitle}'`, suggestedBarcode))?.trim() || suggestedBarcode);
        const categoryObj = await pickCategory();
        if (!categoryObj) return null;
        const brand = (await tp.system.prompt(`Бренд для '${finalTitle}'`, seed.brand || ""))?.trim() || "";
        const store = await pickStore();
        const baseUnit = normalizeUnit((await tp.system.prompt(`Базовая единица для '${finalTitle}'`, seed.base_unit || "шт"))?.trim() || "шт");
        const typicalPackSize = (await tp.system.prompt(`Типичная фасовка числами для '${finalTitle}'`, String(seed.typical_pack_size || "")))?.trim() || "";
        const typicalPackUnit = normalizeUnit((await tp.system.prompt(`Типичная единица фасовки для '${finalTitle}'`, seed.typical_pack_unit || ""))?.trim() || "");
        const perishableAnswer = lower(await tp.system.prompt(`Скоропортящийся? (д/н) для '${finalTitle}'`, seed.perishable ? "д" : "н"));
        const perishable = perishableAnswer === "д" || perishableAnswer === "да" || perishableAnswer === "y" || perishableAnswer === "yes";
        let shelfLife = "";
        if (perishable) {
            shelfLife = (await tp.system.prompt(`Типичный срок годности в днях для '${finalTitle}'`, seed.default_shelf_life_days || "7"))?.trim() || "";
        }
        const price = (await tp.system.prompt(`Обычная цена для '${finalTitle}'`, String(seed.price || "")))?.trim() || "";
        const image = (await tp.system.prompt(`Картинка для '${finalTitle}' (путь или ссылка)`, String(seed.image || "")))?.trim() || "";

        const file = await createNote(DIRS.products, finalTitle, buildProductContent({
            title: finalTitle,
            barcode,
            categoryPath: categoryObj.file.path,
            categoryTitle: categoryObj.title,
            brand,
            storePath: store?.file?.path || "",
            storeTitle: store?.title || "",
            base_unit: baseUnit,
            typical_pack_size: typicalPackSize,
            typical_pack_unit: typicalPackUnit,
            perishable,
            default_shelf_life_days: shelfLife,
            price,
            image
        }));
        return await readFrontmatter(file);
    }

    async function pickProduct() {
        const typed = (await tp.system.prompt("Товар или штрихкод (пусто = закончить ввод)"))?.trim();
        if (!typed) return null;

        const products = await loadFolder(DIRS.products);
        const barcode = cleanBarcode(typed);
        if (looksLikeBarcode(typed)) {
            const barcodeMatch = products.find(product => cleanBarcode(product.barcode) === barcode);
            if (barcodeMatch) {
                notice(`Найден товар по штрихкоду: ${barcodeMatch.title}`);
                return barcodeMatch;
            }

            const suggestion = await fetchBarcodeSuggestion(typed);
            if (suggestion) {
                const choices = [
                    `Использовать из интернета: ${suggestion.title}`,
                    `Создать новый товар: ${typed}`,
                    "Отмена"
                ];
                const picked = await tp.system.suggester(choices, choices, false, `Штрихкод ${suggestion.barcode} не найден в базе`);
                if (picked === "Отмена") return null;
                if (picked && picked.startsWith("Использовать из интернета:")) {
                    return await createProduct(suggestion.title, suggestion);
                }
            }
        }

        const matches = sortByRelevance(typed, products);
        const labels = matches.map(product => `${product.title}${product.category ? ` [${product.category}]` : ""}${product.barcode ? ` {${product.barcode}}` : ""}`);
        labels.unshift(`+ Создать новый товар: ${typed}`);

        const selected = await tp.system.suggester(labels, labels, false, `Выбор товара для '${typed}'`);
        if (!selected) return null;

        if (selected.startsWith("+ Создать новый товар:")) {
            return await createProduct(typed);
        }

        return matches[labels.indexOf(selected) - 1];
    }

    function buildReceiptItemContent(item) {
        return [
            "---",
            "type: receipt-item",
            `date: ${item.date}`,
            `receipt: ${wikilink(item.receiptPath, item.receiptTitle)}`,
            `store: ${wikilink(item.storePath, item.storeTitle)}`,
            `product: ${wikilink(item.productPath, item.productTitle)}`,
            `qty: ${item.qty}`,
            `pack_size: ${item.packSize || ""}`,
            `pack_unit: ${item.packUnit || ""}`,
            `price_total: ${item.priceTotal}`,
            `price_per_base_unit: ${item.pricePerBaseUnit ?? ""}`,
            `discount: ${Boolean(item.discount)}`,
            `rating: ${item.rating || ""}`,
            `review: ${quoteYaml(item.review || "")}`,
            `add_to_pantry: ${Boolean(item.addToPantry)}`,
            `created: ${today}`,
            "tags:",
            "  - еда",
            "  - receipt-item",
            "---",
            "",
            `# ${item.productTitle} - ${item.date}`,
            "",
            "## Заметки",
            "",
            ">"
        ].join("\n");
    }

    function buildPantryContent(entry) {
        return [
            "---",
            "type: pantry-item",
            `product: ${wikilink(entry.productPath, entry.productTitle)}`,
            `source_receipt_item: ${wikilink(entry.receiptItemPath, entry.receiptItemTitle)}`,
            `qty_current: ${entry.qtyCurrent}`,
            `unit: ${entry.unit}`,
            `manufactured_on: ${entry.manufacturedOn || ""}`,
            `created: ${today}`,
            "tags:",
            "  - еда",
            "  - pantry-item",
            "---",
            "",
            `# ${entry.productTitle} - запас`,
            "",
            "## Заметки",
            "",
            ">"
        ].join("\n");
    }

    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        notice("Нет активной заметки для создания чека");
        return "# Чек не создан\n\nОткрой или создай заметку в `LifeOS/Кухня/Receipts/`.";
    }

    const receiptDate = (await tp.system.prompt("Дата чека", today))?.trim() || today;
    const store = await pickStore();
    if (!store) {
        notice("Создание чека отменено: магазин не выбран");
        return "# Чек не создан\n\nМагазин не выбран.";
    }

    const totalInput = (await tp.system.prompt("Сумма чека", ""))?.trim() || "";
    const receiptImage = (await tp.system.prompt("Путь к фото чека / вложению", ""))?.trim() || "";
    const requestedReceiptTitle = `${receiptDate} ${store.title}`;
    const receiptPath = await ensureUniquePath(DIRS.receipts, requestedReceiptTitle);
    await app.fileManager.renameFile(activeFile, receiptPath);
    const receiptTitle = app.vault.getAbstractFileByPath(receiptPath)?.basename || requestedReceiptTitle;

    const createdItems = [];
    const tableRows = [];

    while (true) {
        const product = await pickProduct();
        if (!product) break;

        const qty = Number((await tp.system.prompt(`Количество '${product.title}'`, "1"))?.trim() || "1");
        const packSizeInput = (await tp.system.prompt(`Фасовка числами для '${product.title}'`, String(product.typical_pack_size || "")))?.trim() || "";
        const packUnit = normalizeUnit((await tp.system.prompt(`Единица фасовки для '${product.title}'`, product.typical_pack_unit || product.base_unit || "шт"))?.trim() || product.base_unit || "шт");
        const priceTotal = Number((await tp.system.prompt(`Цена за позицию '${product.title}'`, ""))?.trim() || "0");
        const discountAnswer = lower(await tp.system.prompt(`Была скидка на '${product.title}'? (д/н)`, "н"));
        const discount = discountAnswer === "д" || discountAnswer === "да" || discountAnswer === "y" || discountAnswer === "yes";
        const review = (await tp.system.prompt(`Отзыв по '${product.title}'`, ""))?.trim() || "";
        const ratingInput = (await tp.system.prompt(`Оценка 1-5 для '${product.title}'`, ""))?.trim() || "";
        const addToPantryAnswer = lower(await tp.system.prompt(`Добавить '${product.title}' в домашний запас? (д/н)`, "д"));
        const addToPantry = addToPantryAnswer === "д" || addToPantryAnswer === "да" || addToPantryAnswer === "y" || addToPantryAnswer === "yes";

        const packSize = packSizeInput === "" ? "" : Number(packSizeInput);
        const normalizedPack = convertToBaseUnit(packSize, packUnit, product.base_unit || packUnit);
        const totalBaseUnits = normalizedPack ? normalizedPack * qty : null;
        const pricePerBaseUnit = totalBaseUnits ? Number((priceTotal / totalBaseUnits).toFixed(4)) : null;

        const itemTitle = `${receiptDate} ${store.title} ${product.title}`;
        const receiptItemFile = await createNote(DIRS.receiptItems, itemTitle, buildReceiptItemContent({
            date: receiptDate,
            receiptTitle,
            receiptPath,
            storeTitle: store.title,
            storePath: store.file.path,
            productTitle: product.title,
            productPath: product.file.path,
            qty,
            packSize,
            packUnit,
            priceTotal,
            pricePerBaseUnit,
            discount,
            rating: ratingInput,
            review,
            addToPantry
        }));

        const receiptItemTitle = receiptItemFile.basename;
        let manufacturedOn = "";

        if (addToPantry) {
            if (product.perishable) {
                const shelfLifeDays = Number(product.default_shelf_life_days || 0);
                manufacturedOn = (await tp.system.prompt(
                    `Дата изготовления для '${product.title}' (YYYY-MM-DD, можно оставить пустым)`,
                    receiptDate
                ))?.trim() || "";

                if (manufacturedOn && shelfLifeDays) {
                    const expiresOn = window.moment(manufacturedOn).add(shelfLifeDays, "days").format("YYYY-MM-DD");
                    new Notice(`Срок годности рассчитан: ${expiresOn}`, 5000);
                }
            }

            await createNote(DIRS.pantry, `${receiptDate} ${product.title}`, buildPantryContent({
                productTitle: product.title,
                productPath: product.file.path,
                receiptItemTitle,
                receiptItemPath: receiptItemFile.path,
                qtyCurrent: totalBaseUnits ?? qty,
                unit: product.base_unit || packUnit || "шт",
                manufacturedOn
            }));
        }

        createdItems.push({
            productTitle: product.title,
            qty,
            packSize,
            packUnit,
            priceTotal,
            addToPantry
        });

        tableRows.push(`| ${wikilink(product.file.path, product.title)} | ${qty} | ${packSize || "-"} ${packUnit || ""}`.trim() + ` | ${priceTotal} | ${addToPantry ? "Да" : "Нет"} |`);
    }

    if (createdItems.length === 0) {
        notice("Чек создан без позиций. Можно заполнить позже вручную.");
    } else {
        notice(`Чек сохранён. Позиции: ${createdItems.length}`);
    }

    const lines = [
        "---",
        "type: receipt",
        `date: ${receiptDate}`,
        `store: ${wikilink(store.file.path, store.title)}`,
        `total: ${totalInput}`,
        `receipt_image: ${receiptImage ? quoteYaml(receiptImage) : ""}`,
        `created: ${today}`,
        "tags:",
        "  - еда",
        "  - receipt",
        "---",
        "",
        `# Чек ${receiptDate} - ${store.title}`,
        "",
        "## Позиции",
        "",
        "| Товар | Кол-во | Фасовка | Цена | В запас |",
        "| ----- | ------ | ------- | ---- | ------- |",
        ...tableRows,
        "",
        "## Заметки",
        "",
        ">",
        "",
        "## Быстрые ссылки",
        "",
        "- [[Обзор]]",
        "- [[Покупки]]",
        "- [[Запасы]]"
    ];

    return lines.join("\n");
};
