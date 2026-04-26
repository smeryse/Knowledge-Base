module.exports = async function foodScan(tp) {
    const ROOT = "Projects/Еда";
    const DIRS = {
        products: `${ROOT}/Products`,
        pantry: `${ROOT}/Pantry`,
        shopping: `${ROOT}/Shopping List`
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
        return cleanBarcode(value).length >= 8;
    }

    async function fetchBarcodeSuggestion(barcode) {
        if (!looksLikeBarcode(barcode)) return null;

        try {
            const url = `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode(barcode)}.json`;
            const response = typeof requestUrl === "function"
                ? await requestUrl({ url, method: "GET" })
                : await fetch(url);

            const data = typeof requestUrl === "function"
                ? response.json
                : await response.json();

            if (!data || !data.product) return null;

            const product = data.product;
            const title = product.product_name_ru
                || product.product_name
                || product.generic_name_ru
                || product.generic_name
                || "";

            if (!title) return null;

            const quantity = String(product.quantity || "").trim();
            const quantityMatch = quantity.match(/(\d+(?:[\.,]\d+)?)\s*(kg|g|гр|гр\.|l|ml|л|мл|pcs|шт)/i);
            const packSize = quantityMatch ? Number(quantityMatch[1].replace(",", ".")) : "";
            const packUnit = quantityMatch ? lower(quantityMatch[2]).replace("гр.", "гр") : "";

            return {
                title,
                barcode: cleanBarcode(barcode),
                brand: String(product.brands || "").split(",")[0].trim(),
                category: product.categories_tags?.[0]
                    ? String(product.categories_tags[0]).replace(/^en:/, "").replace(/^ru:/, "")
                    : "прочее",
                typical_pack_size: packSize,
                typical_pack_unit: packUnit,
                perishable: true,
                default_shelf_life_days: "",
                source: "openfoodfacts"
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
            "buy_again: true",
            "priority: medium",
            "last_price: ",
            "best_price: ",
            "best_store: \"\"",
            "last_bought: ",
            `created: ${today}`,
            "tags:",
            "  - еда",
            "  - product",
            "---",
            "",
            `# ${data.title}`,
            "",
            `Штрихкод: \`${data.barcode || ""}\``,
            "",
            "## Заметки",
            "",
            ">"
        ].join("\n");
    }

    function buildPantryContent(data) {
        return [
            "---",
            "type: pantry-item",
            `product: [[${data.productTitle}]]`,
            "source_receipt_item: ",
            `qty_current: ${data.qtyCurrent}`,
            `unit: ${data.unit}`,
            "opened: false",
            "status: fresh",
            `purchased_on: ${today}`,
            `expires_on: ${data.expiresOn || ""}`,
            `location: ${quoteYaml(data.location || "")}`,
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
            `product: [[${data.productTitle}]]`,
            `target_qty: ${data.targetQty}`,
            `unit: ${data.unit}`,
            `priority: ${data.priority}`,
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
        const barcode = cleanBarcode(seed.barcode || (looksLikeBarcode(rawInput) ? rawInput : (await tp.system.prompt("Штрихкод", ""))?.trim() || ""));
        const title = (await tp.system.prompt("Название нового товара", seed.title || (looksLikeBarcode(rawInput) ? "" : rawInput)))?.trim();
        if (!title) return null;
        const category = (await tp.system.prompt(`Категория для '${title}'`, seed.category || "прочее"))?.trim() || "прочее";
        const brand = (await tp.system.prompt(`Бренд для '${title}'`, seed.brand || ""))?.trim() || "";
        const baseUnit = lower((await tp.system.prompt(`Базовая единица для '${title}'`, seed.base_unit || "pcs"))?.trim() || "pcs");
        const typicalPackSize = (await tp.system.prompt(`Типичная фасовка числами для '${title}'`, String(seed.typical_pack_size || "")))?.trim() || "";
        const typicalPackUnit = lower((await tp.system.prompt(`Типичная единица фасовки для '${title}'`, seed.typical_pack_unit || ""))?.trim() || "");
        const perishable = ["y", "yes", "д"].includes(lower(await tp.system.prompt(`Скоропортящийся? (y/n) для '${title}'`, seed.perishable ? "y" : "n")));
        const shelfLife = perishable ? ((await tp.system.prompt(`Типичный срок годности в днях для '${title}'`, seed.default_shelf_life_days || "7"))?.trim() || "") : "";
        const file = await createNote(DIRS.products, title, buildProductContent({
            title,
            barcode,
            category,
            brand,
            base_unit: baseUnit,
            typical_pack_size: typicalPackSize,
            typical_pack_unit: typicalPackUnit,
            perishable,
            default_shelf_life_days: shelfLife
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
        return `# ${product.title}\n\n- Карточка: [[${product.title}]]\n- Штрихкод: \`${product.barcode || ""}\``;
    }

    if (action === "Добавить в запас дома") {
        const qtyCurrent = Number((await tp.system.prompt(`Сколько добавить '${product.title}'`, "1"))?.trim() || "1");
        let expiresOn = "";
        if (product.perishable) {
            const suggested = product.default_shelf_life_days
                ? window.moment(today).add(Number(product.default_shelf_life_days), "days").format("YYYY-MM-DD")
                : "";
            expiresOn = (await tp.system.prompt(`Срок годности для '${product.title}'`, suggested))?.trim() || "";
        }
        const location = (await tp.system.prompt(`Где лежит '${product.title}'`, "кухня"))?.trim() || "";
        const file = await createNote(DIRS.pantry, `${today} ${product.title}`, buildPantryContent({
            productTitle: product.title,
            qtyCurrent,
            unit: product.base_unit || "pcs",
            expiresOn,
            location
        }));
        return `# ${product.title}\n\n- Добавлено в запас: [[${file.basename}]]\n- Количество: ${qtyCurrent} ${product.base_unit || "pcs"}\n- Штрихкод: \`${product.barcode || ""}\``;
    }

    const targetQty = Number((await tp.system.prompt(`Сколько купить '${product.title}'`, "1"))?.trim() || "1");
    const priorityChoices = ["high", "medium", "low"];
    const priority = await tp.system.suggester(priorityChoices, priorityChoices, false, "Приоритет");
    const reason = (await tp.system.prompt(`Почему добавить '${product.title}' в список`, "добавлено сканером"))?.trim() || "добавлено сканером";
    const file = await createNote(DIRS.shopping, `${product.title}`, buildShoppingContent({
        productTitle: product.title,
        targetQty,
        unit: product.base_unit || "pcs",
        priority: priority || "medium",
        reason
    }));
    return `# ${product.title}\n\n- Добавлено в покупки: [[${file.basename}]]\n- Нужно: ${targetQty} ${product.base_unit || "pcs"}\n- Штрихкод: \`${product.barcode || ""}\``;
};
