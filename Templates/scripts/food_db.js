module.exports = async function foodDb(tp) {
    const ROOT = "Projects/Еда";
    const DIRS = {
        products: `${ROOT}/Products`,
        stores: `${ROOT}/Stores`,
        receipts: `${ROOT}/Receipts`,
        receiptItems: `${ROOT}/Receipt Items`,
        pantry: `${ROOT}/Pantry`
    };
    const RESOLVER_CONFIG_PATH = `${ROOT}/resolver-config.json`;

    const today = tp.date.now("YYYY-MM-DD");

    function notice(message, timeout = 5000) {
        new Notice(message, timeout);
    }

    function lower(value) {
        return String(value || "").trim().toLowerCase();
    }

    function normalizeCategory(value) {
        const category = lower(value);
        const allowed = new Set([
            "молочка",
            "яйца",
            "сладости",
            "напитки",
            "крупы",
            "мясо",
            "заморозка",
            "соусы",
            "овощи",
            "фрукты",
            "хлеб",
            "чай",
            "кофе",
            "уход",
            "быт",
            "прочее"
        ]);
        return allowed.has(category) ? category : "прочее";
    }

    function normalizeProductTitle(title) {
        const raw = String(title || "").trim();
        if (!raw) return "";

        let value = raw
            .replace(/\s+/g, " ")
            .replace(/\bКУР\.\b/gi, "куриное")
            .replace(/\bШТ\.?\b/gi, "шт")
            .trim();

        if (value === value.toUpperCase()) {
            value = value.toLowerCase();
        }

        value = value.charAt(0).toUpperCase() + value.slice(1);
        return value;
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

    async function loadResolverConfig() {
        const defaults = {
            enabled: true,
            provider: "lmstudio",
            endpoint: "http://127.0.0.1:1234/v1",
            model: "qwen2.5-3b-instruct",
            temperature: 0.1,
            timeout_ms: 20000
        };

        try {
            const raw = await readProjectFile(RESOLVER_CONFIG_PATH);
            if (!raw) return defaults;
            return { ...defaults, ...JSON.parse(raw) };
        } catch (error) {
            return defaults;
        }
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
                        typical_pack_unit: quantity.typical_pack_unit || "pcs",
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

            const config = await loadResolverConfig();
            const normalized = await normalizeWithLocalModel(cleanBarcode(barcode), candidates, config);
            return normalized || candidates[0];
        } catch (error) {
            return null;
        }
    }

    async function normalizeWithLocalModel(barcode, candidates, config) {
        if (!config.enabled || !config.endpoint || !config.model || candidates.length === 0) {
            return null;
        }

        const prompt = [
            "You normalize product lookup results into strict JSON for a personal inventory database.",
            "Return only one JSON object and no markdown.",
            "Schema:",
            '{"title":"","barcode":"","brand":"","category":"","base_unit":"pcs|g|kg|ml|l","typical_pack_size":"","typical_pack_unit":"pcs|g|kg|ml|l","perishable":false,"default_shelf_life_days":"","confidence":0}',
            "Rules:",
            "- Prefer Russian product title when possible.",
            "- Do not invent facts absent from candidates.",
            "- Keep barcode exact.",
            "- category must be one of: молочка, яйца, сладости, напитки, крупы, мясо, заморозка, соусы, овощи, фрукты, хлеб, чай, кофе, уход, быт, прочее.",
            "- brand should be filled when it is explicit in title, snippet, description or source fields; otherwise empty string.",
            "- title should be human-friendly Russian, not all caps, and should keep meaningful distinctions like fat %, flavor, size, class or grade.",
            "- do not include store names, prices, dates, promo text or review text in title.",
            "- base_unit and typical_pack_unit must be one of pcs,g,kg,ml,l.",
            "- if quantity is explicit like 400 г, 0.9 л or 10 шт, extract it.",
            "- use category 'прочее' only when the product type is genuinely unclear.",
            "- confidence is from 0 to 1.",
            `Barcode: ${barcode}`,
            `Candidates: ${JSON.stringify(candidates, null, 2)}`
        ].join("\n");

        try {
            let raw = "";

            if (config.provider === "ollama") {
                const response = await fetch(`${String(config.endpoint).replace(/\/$/, "")}/api/generate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: config.model,
                        prompt,
                        stream: false,
                        format: "json",
                        options: {
                            temperature: Number(config.temperature || 0.1)
                        }
                    })
                });
                const data = await response.json();
                raw = data.response || "";
            } else if (config.provider === "lmstudio") {
                const response = await fetch(`${String(config.endpoint).replace(/\/$/, "")}/chat/completions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: config.model,
                        temperature: Number(config.temperature || 0.1),
                        response_format: { type: "text" },
                        messages: [
                            {
                                role: "system",
                                content: "You normalize barcode lookup candidates into strict JSON for a personal inventory database. Return only a JSON object."
                            },
                            {
                                role: "user",
                                content: prompt
                            }
                        ]
                    })
                });
                const data = await response.json();
                raw = data.choices?.[0]?.message?.content || "";
            } else {
                return null;
            }

            const parsed = extractJsonObject(raw);
            if (!parsed || !parsed.title) return null;

            return {
                title: normalizeProductTitle(parsed.title),
                barcode: cleanBarcode(parsed.barcode || barcode),
                brand: String(parsed.brand || "").trim(),
                category: normalizeCategory(parsed.category || "прочее"),
                base_unit: normalizeUnit(parsed.base_unit || parsed.typical_pack_unit || "pcs"),
                typical_pack_size: parsed.typical_pack_size || "",
                typical_pack_unit: normalizeUnit(parsed.typical_pack_unit || parsed.base_unit || "pcs"),
                perishable: Boolean(parsed.perishable),
                default_shelf_life_days: parsed.default_shelf_life_days || "",
                confidence: Number(parsed.confidence || 0),
                source: "local-llm"
            };
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
                if (row.last_bought) score += 2;
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

    function buildProductContent(data) {
        return [
            "---",
            "type: product",
            `title: ${quoteYaml(data.title)}`,
            `barcode: ${quoteYaml(data.barcode || "")}`,
            "aliases:",
            `  - ${quoteYaml(data.title)}`,
            `category: ${quoteYaml(data.category || "прочее")}`,
            `brand: ${quoteYaml(data.brand || "")}`,
            `base_unit: ${data.base_unit || "pcs"}`,
            `typical_pack_size: ${data.typical_pack_size || ""}`,
            `typical_pack_unit: ${data.typical_pack_unit || ""}`,
            `perishable: ${Boolean(data.perishable)}`,
            `default_shelf_life_days: ${data.default_shelf_life_days || ""}`,
            `buy_again: ${data.buy_again !== false}`,
            "priority: medium",
            `last_price: ${data.last_price || ""}`,
            `best_price: ${data.best_price || ""}`,
            `best_store: ${quoteYaml(data.best_store || "")}`,
            `last_bought: ${data.last_bought || ""}`,
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
            `kind: ${data.kind || "supermarket"}`,
            `location: ${quoteYaml(data.location || "")}`,
            `is_online: ${Boolean(data.is_online)}`,
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
            g: "g",
            gr: "g",
            kg: "kg",
            ml: "ml",
            l: "l",
            pcs: "pcs",
            pc: "pcs",
            шт: "pcs",
            штука: "pcs",
            штук: "pcs"
        };
        return map[String(unit || "").trim().toLowerCase()] || String(unit || "pcs").trim().toLowerCase();
    }

    function convertToBaseUnit(packSize, packUnit, baseUnit) {
        const size = Number(packSize);
        if (!size || !packUnit || !baseUnit) return null;

        const from = normalizeUnit(packUnit);
        const to = normalizeUnit(baseUnit);

        if (from === to) return size;
        if (from === "kg" && to === "g") return size * 1000;
        if (from === "g" && to === "kg") return size / 1000;
        if (from === "l" && to === "ml") return size * 1000;
        if (from === "ml" && to === "l") return size / 1000;
        return null;
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

        const kind = (await tp.system.prompt("Тип магазина", "supermarket"))?.trim() || "supermarket";
        const location = (await tp.system.prompt("Локация / примечание", ""))?.trim() || "";
        const file = await createNote(DIRS.stores, title, buildStoreContent({ title, kind, location, is_online: false }));
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
        const category = (await tp.system.prompt(`Категория для '${finalTitle}'`, seed.category || "прочее"))?.trim() || "прочее";
        const brand = (await tp.system.prompt(`Бренд для '${finalTitle}'`, seed.brand || ""))?.trim() || "";
        const baseUnit = normalizeUnit((await tp.system.prompt(`Базовая единица для '${finalTitle}'`, seed.base_unit || "pcs"))?.trim() || "pcs");
        const typicalPackSize = (await tp.system.prompt(`Типичная фасовка числами для '${finalTitle}'`, String(seed.typical_pack_size || "")))?.trim() || "";
        const typicalPackUnit = normalizeUnit((await tp.system.prompt(`Типичная единица фасовки для '${finalTitle}'`, seed.typical_pack_unit || ""))?.trim() || "");
        const perishableAnswer = lower(await tp.system.prompt(`Скоропортящийся? (y/n) для '${finalTitle}'`, seed.perishable ? "y" : "n"));
        const perishable = perishableAnswer === "y" || perishableAnswer === "yes" || perishableAnswer === "д";
        let shelfLife = "";
        if (perishable) {
            shelfLife = (await tp.system.prompt(`Типичный срок годности в днях для '${finalTitle}'`, seed.default_shelf_life_days || "7"))?.trim() || "";
        }

        const file = await createNote(DIRS.products, finalTitle, buildProductContent({
            title: finalTitle,
            barcode,
            category,
            brand,
            base_unit: baseUnit,
            typical_pack_size: typicalPackSize,
            typical_pack_unit: typicalPackUnit,
            perishable,
            default_shelf_life_days: shelfLife
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

    async function updateProductStats(product, itemData, storeTitle, date) {
        let content = product.content;
        const priceForStats = itemData.price_per_base_unit || itemData.price_total || "";

        if (priceForStats !== "") {
            content = updateScalar(content, "last_price", priceForStats);
            content = updateScalar(content, "last_bought", date);
            const bestNow = Number(product.best_price || 0);
            if (!bestNow || Number(priceForStats) < bestNow) {
                content = updateScalar(content, "best_price", Number(priceForStats));
                content = updateScalar(content, "best_store", storeTitle);
            }
        }

        await app.vault.modify(product.file, content);
    }

    function buildReceiptItemContent(item) {
        return [
            "---",
            "type: receipt-item",
            `date: ${item.date}`,
            `receipt: [[${item.receiptTitle}]]`,
            `store: [[${item.storeTitle}]]`,
            `product: [[${item.productTitle}]]`,
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
            `product: [[${entry.productTitle}]]`,
            `source_receipt_item: [[${entry.receiptItemTitle}]]`,
            `qty_current: ${entry.qtyCurrent}`,
            `unit: ${entry.unit}`,
            `opened: false`,
            `status: fresh`,
            `purchased_on: ${entry.purchasedOn}`,
            `expires_on: ${entry.expiresOn || ""}`,
            `location: ${quoteYaml(entry.location || "")}`,
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
        return "# Чек не создан\n\nОткрой или создай заметку в `Projects/Еда/Receipts/`.";
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
        const packUnit = normalizeUnit((await tp.system.prompt(`Единица фасовки для '${product.title}'`, product.typical_pack_unit || product.base_unit || "pcs"))?.trim() || product.base_unit || "pcs");
        const priceTotal = Number((await tp.system.prompt(`Цена за позицию '${product.title}'`, String(product.last_price || "")))?.trim() || "0");
        const discountAnswer = lower(await tp.system.prompt(`Была скидка на '${product.title}'? (y/n)`, "n"));
        const discount = discountAnswer === "y" || discountAnswer === "yes" || discountAnswer === "д";
        const review = (await tp.system.prompt(`Отзыв по '${product.title}'`, ""))?.trim() || "";
        const ratingInput = (await tp.system.prompt(`Оценка 1-5 для '${product.title}'`, ""))?.trim() || "";
        const addToPantryAnswer = lower(await tp.system.prompt(`Добавить '${product.title}' в домашний запас? (y/n)`, "y"));
        const addToPantry = addToPantryAnswer === "y" || addToPantryAnswer === "yes" || addToPantryAnswer === "д";

        const packSize = packSizeInput === "" ? "" : Number(packSizeInput);
        const normalizedPack = convertToBaseUnit(packSize, packUnit, product.base_unit || packUnit);
        const totalBaseUnits = normalizedPack ? normalizedPack * qty : null;
        const pricePerBaseUnit = totalBaseUnits ? Number((priceTotal / totalBaseUnits).toFixed(4)) : null;

        const itemTitle = `${receiptDate} ${store.title} ${product.title}`;
        const receiptItemFile = await createNote(DIRS.receiptItems, itemTitle, buildReceiptItemContent({
            date: receiptDate,
            receiptTitle,
            storeTitle: store.title,
            productTitle: product.title,
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
        let expiresOn = "";
        let pantryLocation = "";

        if (addToPantry) {
            if (product.perishable) {
                const suggestedExpires = product.default_shelf_life_days
                    ? window.moment(receiptDate).add(Number(product.default_shelf_life_days), "days").format("YYYY-MM-DD")
                    : "";
                expiresOn = (await tp.system.prompt(`Срок годности для '${product.title}'`, suggestedExpires))?.trim() || "";
            }
            pantryLocation = (await tp.system.prompt(`Где лежит '${product.title}' дома`, "кухня"))?.trim() || "";

            await createNote(DIRS.pantry, `${receiptDate} ${product.title}`, buildPantryContent({
                productTitle: product.title,
                receiptItemTitle,
                qtyCurrent: qty,
                unit: product.base_unit || packUnit || "pcs",
                purchasedOn: receiptDate,
                expiresOn,
                location: pantryLocation
            }));
        }

        await updateProductStats(product, { price_total: priceTotal, price_per_base_unit: pricePerBaseUnit }, store.title, receiptDate);

        createdItems.push({
            productTitle: product.title,
            qty,
            packSize,
            packUnit,
            priceTotal,
            addToPantry,
            expiresOn
        });

        tableRows.push(`| [[${product.title}]] | ${qty} | ${packSize || "-"} ${packUnit || ""}`.trim() + ` | ${priceTotal} | ${addToPantry ? "Да" : "Нет"} |`);
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
        `store: [[${store.title}]]`,
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
        "- [[Dashboard]]",
        "- [[Что купить]]",
        "- [[Что дома]]"
    ];

    return lines.join("\n");
};
