module.exports = async function foodScan(tp) {
    const ROOT = "Projects/Кухня";
    const DIRS = {
        products: `${ROOT}/Products`,
        stores: `${ROOT}/Stores`,
        pantry: `${ROOT}/Pantry`,
        shopping: `${ROOT}/Shopping List`
    };
    const RESOLVER_CONFIG_PATH = `${ROOT}/resolver-config.json`;

    const today = tp.date.now("YYYY-MM-DD");

    function notice(message, timeout = 5000) {
        new Notice(message, timeout);
    }

    function lower(value) {
        return String(value || "").trim().toLowerCase();
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
            штук: "шт",
            eggs: "шт"
        };
        return map[lower(unit)] || lower(unit || "шт");
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

    function deriveProductDefaults(title, seed = {}) {
        const source = lower(`${title} ${seed.description || ""} ${seed.category || ""}`);
        const next = { ...seed };

        if (!next.category || next.category === "прочее") {
            if (/яйц/.test(source)) next.category = "яйца";
            else if (/молок|кефир|йогурт|творог|сметан/.test(source)) next.category = "молочка";
            else if (/ваф|печень|конфет|шоколад/.test(source)) next.category = "сладости";
        }

        if (!next.brand && /щедрый год/.test(source)) {
            next.brand = "Щедрый год";
        }

        if (!next.base_unit || next.base_unit === "шт") {
            if (/яйц/.test(source)) next.base_unit = "шт";
        }

        if (!next.typical_pack_unit || next.typical_pack_unit === "шт") {
            if (/яйц/.test(source)) next.typical_pack_unit = "шт";
        }

        if (next.perishable === undefined || next.perishable === null) {
            if (/яйц|молок|кефир|йогурт|творог|сыр|мяс|куриц/.test(source)) {
                next.perishable = true;
            }
        }

        if ((!next.default_shelf_life_days || next.default_shelf_life_days === "") && /яйц/.test(source)) {
            next.default_shelf_life_days = "25";
        }

        if (next.price === undefined || next.price === null) {
            next.price = "";
        }

        return next;
    }

    function cleanBarcode(value) {
        return String(value || "").replace(/\D/g, "");
    }

    function looksLikeBarcode(value) {
        return cleanBarcode(value).length >= 8;
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
            typical_pack_unit: lower(quantityMatch[2]).replace("гр.", "гр")
        };
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

    async function pickStore() {
        const stores = await loadFolder(DIRS.stores);
        const labels = stores.map(store => store.title);
        labels.unshift("+ Новый магазин");

        const selected = await tp.system.suggester(labels, labels, false, "Из какого магазина товар?");
        if (!selected) return null;

        if (selected !== "+ Новый магазин") {
            return stores.find(store => store.title === selected);
        }

        const title = (await tp.system.prompt("Название нового магазина"))?.trim();
        if (!title) return null;

        const file = await createNote(DIRS.stores, title, [
            "---",
            "type: store",
            `title: ${quoteYaml(title)}`,
            "aliases:",
            `  - ${quoteYaml(title)}`,
            `created: ${today}`,
            "tags:",
            "  - еда",
            "  - store",
            "---",
            "",
            `# ${title}`,
            "",
            "## Заметки",
            "",
            ">"
        ].join("\n"));
        return await readFrontmatter(file);
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
                const offUrl = `https://world.openfoodfacts.org/api/v2/product/${clean}.json`;
                let offData = null;
                try {
                    offData = await httpGetJson(offUrl);
                } catch (error) {}

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

                try {
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
                } catch (error) {}

                try {
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
                } catch (error) {}

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
            '{"title":"","barcode":"","brand":"","category":"","base_unit":"шт|г|кг|мл|л","typical_pack_size":"","typical_pack_unit":"шт|г|кг|мл|л","perishable":false,"default_shelf_life_days":"","confidence":0}',
            "Rules:",
            "- Prefer Russian product title when possible.",
            "- Do not invent facts absent from candidates.",
            "- Keep barcode exact.",
            "- category must be one of: молочка, яйца, сладости, напитки, крупы, мясо, заморозка, соусы, овощи, фрукты, хлеб, чай, кофе, уход, быт, прочее.",
            "- brand should be filled when it is explicit in title, snippet, description or source fields; otherwise empty string.",
            "- title should be human-friendly Russian, not all caps, and should keep meaningful distinctions like fat %, flavor, size, class or grade.",
            "- do not include store names, prices, dates, promo text or review text in title.",
            "- base_unit and typical_pack_unit must be one of: шт, г, кг, мл, л.",
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
                base_unit: normalizeUnit(parsed.base_unit || parsed.typical_pack_unit || "шт"),
                typical_pack_size: parsed.typical_pack_size || "",
                typical_pack_unit: normalizeUnit(parsed.typical_pack_unit || parsed.base_unit || "шт"),
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
        if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
        if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
            return raw.slice(1, -1);
        }
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
            `category: ${quoteYaml(data.category || "прочее")}`,
            `brand: ${quoteYaml(data.brand || "")}`,
            `store: ${data.storePath ? quoteYaml(wikilink(data.storePath, data.storeTitle || "")) : ""}`,
            `base_unit: ${data.base_unit || "шт"}`,
            `typical_pack_size: ${data.typical_pack_size || ""}`,
            `typical_pack_unit: ${data.typical_pack_unit || ""}`,
            `perishable: ${Boolean(data.perishable)}`,
            `default_shelf_life_days: ${data.default_shelf_life_days || ""}`,
            `price: ${data.price || ""}`,
            `image: ${data.image ? quoteYaml(`[[${data.image}]]`) : ""}`,
            `created: ${today}`,
            "tags:",
            "  - еда",
            "  - product",
            "---"
        ].join("\n");
    }

    function buildPantryContent(data) {
        return [
            "---",
            "type: pantry-item",
            `product: ${wikilink(data.productPath, data.productTitle)}`,
            "source_receipt_item: ",
            `qty_current: ${data.qtyCurrent}`,
            `unit: ${data.unit}`,
            `manufactured_on: ${data.manufacturedOn || ""}`,
            `created: ${today}`,
            "tags:",
            "  - еда",
            "  - pantry-item",
            "---",
            "",
            `# ${data.productTitle} - запас`,
            "",
            "## Заметки",
            "",
            ">"
        ].join("\n");
    }

    function buildShoppingContent(data) {
        return [
            "---",
            "type: shopping-item",
            `product: ${wikilink(data.productPath, data.productTitle)}`,
            `target_qty: ${data.targetQty}`,
            `unit: ${data.unit}`,
            "status: active",
            "preferred_store: ",
            "max_target_price: ",
            `reason: ${quoteYaml(data.reason || "добавлено сканером")}`,
            `created: ${today}`,
            "tags:",
            "  - еда",
            "  - shopping-item",
            "---",
            "",
            `# ${data.productTitle}`,
            "",
            "## Заметки",
            "",
            ">"
        ].join("\n");
    }

    async function createProduct(rawInput, seed = {}) {
        const defaults = deriveProductDefaults(seed.title || rawInput, seed);
        const barcode = cleanBarcode(defaults.barcode || (looksLikeBarcode(rawInput) ? rawInput : (await tp.system.prompt("Штрихкод", ""))?.trim() || ""));
        const titleInput = (await tp.system.prompt("Название нового товара", normalizeProductTitle(defaults.title || (looksLikeBarcode(rawInput) ? "" : rawInput))))?.trim();
        if (!titleInput) return null;
        const title = normalizeProductTitle(titleInput);
        const category = (await tp.system.prompt(`Категория для '${title}'`, defaults.category || "прочее"))?.trim() || "прочее";
        const brand = (await tp.system.prompt(`Бренд для '${title}'`, defaults.brand || ""))?.trim() || "";
        const store = await pickStore();
        const baseUnit = normalizeUnit((await tp.system.prompt(`Базовая единица для '${title}'`, defaults.base_unit || "шт"))?.trim() || "шт");
        const typicalPackSize = (await tp.system.prompt(`Типичная фасовка числами для '${title}'`, String(defaults.typical_pack_size || "")))?.trim() || "";
        const typicalPackUnit = normalizeUnit((await tp.system.prompt(`Типичная единица фасовки для '${title}'`, defaults.typical_pack_unit || ""))?.trim() || "");
        const perishable = ["д", "да", "y", "yes"].includes(lower(await tp.system.prompt(`Скоропортящийся? (д/н) для '${title}'`, defaults.perishable ? "д" : "н")));
        const shelfLife = perishable ? ((await tp.system.prompt(`Типичный срок годности в днях для '${title}'`, defaults.default_shelf_life_days || "7"))?.trim() || "") : "";
        const price = (await tp.system.prompt(`Обычная цена для '${title}'`, String(defaults.price || "")))?.trim() || "";
        const image = (await tp.system.prompt(`Картинка для '${title}' (путь или ссылка)`, String(defaults.image || "")))?.trim() || "";
        const file = await createNote(DIRS.products, title, buildProductContent({
            title,
            barcode,
            category,
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
        notice(`Добавлен новый товар: ${title}`);
        return await readFrontmatter(file);
    }

    const rawInput = (await tp.system.prompt("Штрихкод или название товара"))?.trim();
    if (!rawInput) {
        return "# Сканирование отменено\n";
    }

    const products = await loadFolder(DIRS.products);
    const barcode = cleanBarcode(rawInput);
    let product = null;

    if (looksLikeBarcode(rawInput)) {
        product = products.find(entry => cleanBarcode(entry.barcode) === barcode) || null;
    }

    if (!product && !looksLikeBarcode(rawInput)) {
        const normalized = lower(rawInput);
        product = products.find(entry => lower(entry.title) === normalized)
            || products.find(entry => lower(entry.title).includes(normalized))
            || null;
    }

    if (!product) {
        let seed = {};
        if (looksLikeBarcode(rawInput)) {
            const suggestion = await fetchBarcodeSuggestion(rawInput);
            if (suggestion) {
                const choices = [
                    `Использовать: ${suggestion.title}`,
                    "Создать вручную",
                    "Отмена"
                ];
                const picked = await tp.system.suggester(choices, choices, false, `Найдено в интернете по штрихкоду ${suggestion.barcode}`);
                if (picked === "Отмена") {
                    return "# Сканирование отменено\n";
                }
                if (picked && picked.startsWith("Использовать:")) {
                    seed = suggestion;
                    notice(`Интернет нашёл товар: ${suggestion.title}`);
                }
            }
        }

        notice("Товар не найден в локальной базе. Сейчас будет создана новая карточка.");
        product = await createProduct(rawInput, seed);
        if (!product) {
            return "# Сканирование отменено\n\nНовый товар не был создан.";
        }
    } else {
        notice(`Найден товар: ${product.title}`);
    }

    const actions = ["Добавить в запас дома", "Добавить в список покупок", "Только открыть карточку"];
    const action = await tp.system.suggester(actions, actions, false, `Что сделать с '${product.title}'?`);
    if (!action) {
        return `# ${product.title}\n\nДействие отменено.`;
    }

    if (action === "Только открыть карточку") {
        const file = app.vault.getAbstractFileByPath(product.file.path);
        if (file) await app.workspace.getLeaf(true).openFile(file);
        return `# ${product.title}\n\n- Карточка: ${wikilink(product.file.path, product.title)}\n- Штрихкод: \`${product.barcode || ""}\``;
    }

    if (action === "Добавить в запас дома") {
        const hasPackInfo = product.typical_pack_size && product.typical_pack_unit;
        const packCount = Number((await tp.system.prompt(
            hasPackInfo ? `Сколько упаковок добавить '${product.title}'` : `Сколько добавить '${product.title}'`,
            "1"
        ))?.trim() || "1");
        const packSizeInBase = convertToBaseUnit(product.typical_pack_size, product.typical_pack_unit, product.base_unit || "шт");
        const qtyCurrent = hasPackInfo && packSizeInBase
            ? Number((packSizeInBase * packCount).toFixed(3))
            : packCount;
        let manufacturedOn = "";
        if (product.perishable) {
            const shelfLifeDays = Number(product.default_shelf_life_days || 0);
            manufacturedOn = (await tp.system.prompt(
                `Дата изготовления для '${product.title}' (YYYY-MM-DD, можно оставить пустым)`,
                today
            ))?.trim() || "";

            if (manufacturedOn && shelfLifeDays) {
                const expiresOn = window.moment(manufacturedOn).add(shelfLifeDays, "days").format("YYYY-MM-DD");
                new Notice(`Срок годности рассчитан: ${expiresOn}`, 5000);
            }
        }
        const file = await createNote(DIRS.pantry, `${today} ${product.title}`, buildPantryContent({
            productTitle: product.title,
            productPath: product.file.path,
            qtyCurrent,
            unit: product.base_unit || "шт",
            manufacturedOn
        }));
        const productFile = app.vault.getAbstractFileByPath(product.file.path);
        if (productFile) await app.workspace.getLeaf(true).openFile(productFile);
        return `# ${product.title}\n\n- Добавлено в запас: [[${file.basename}]]\n- Количество: ${qtyCurrent} ${product.base_unit || "шт"}\n- Штрихкод: \`${product.barcode || ""}\``;
    }

    const targetQty = Number((await tp.system.prompt(`Сколько купить '${product.title}'`, "1"))?.trim() || "1");
    const reason = (await tp.system.prompt(`Почему добавить '${product.title}' в список`, "добавлено сканером"))?.trim() || "добавлено сканером";
    const file = await createNote(DIRS.shopping, `${product.title}`, buildShoppingContent({
        productTitle: product.title,
        productPath: product.file.path,
        targetQty,
        unit: product.base_unit || "шт",
        reason
    }));
    const productFile = app.vault.getAbstractFileByPath(product.file.path);
    if (productFile) await app.workspace.getLeaf(true).openFile(productFile);
    return `# ${product.title}\n\n- Добавлено в покупки: [[${file.basename}]]\n- Нужно: ${targetQty} ${product.base_unit || "шт"}\n- Штрихкод: \`${product.barcode || ""}\``;
};
