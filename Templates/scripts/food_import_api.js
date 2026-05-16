module.exports = async function foodImportApi(tp) {
    const ROOT = "Projects/Кухня";
    const DIRS = {
        products: `${ROOT}/Products`,
        stores: `${ROOT}/Stores`,
        categories: `${ROOT}/Categories`,
        receipts: `${ROOT}/Receipts`,
        receiptItems: `${ROOT}/Receipt Items`,
        pantry: `${ROOT}/Pantry`
    };
    const MAPPING_PATH = `${ROOT}/System/receipt-product-mapping.json`;

    const today = tp.date.now("YYYY-MM-DD");

    function notice(message, timeout = 5000) {
        new Notice(message, timeout);
    }

    function lower(value) {
        return String(value || "").trim().toLowerCase();
    }

    function slugify(value) {
        return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-+|--+$/g, "").replace(/--+/g, "-");
    }

    function quoteYaml(value) {
        return `"${String(value).replace(/"/g, '\\"')}"`;
    }

    function parseYamlValue(raw) {
        if (raw === "true") return true;
        if (raw === "false") return false;
        if (raw === "null") return null;
        if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
        if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) return raw.slice(1, -1);
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
        for (const file of files) rows.push(await readFrontmatter(file));
        return rows;
    }

    function sortByRelevance(input, rows) {
        const query = input.trim().toLowerCase();
        return [...rows].map(row => {
            const title = String(row.title || row.file.basename).toLowerCase();
            let score = 0;
            if (title === query) score += 100;
            if (title.startsWith(query)) score += 40;
            if (title.includes(query)) score += 20;
            const words = query.split(/\s+/).filter(Boolean);
            for (const word of words) if (title.includes(word)) score += 5;
            return { row, score };
        }).filter(entry => entry.score > 0).sort((a, b) => b.score - a.score).map(entry => entry.row).slice(0, 12);
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

    async function loadMapping() {
        try {
            const file = app.vault.getAbstractFileByPath(MAPPING_PATH);
            if (!file) return {};
            return JSON.parse(await app.vault.read(file));
        } catch (e) { return {}; }
    }

    async function saveMapping(mapping) {
        const content = JSON.stringify(mapping, null, 2);
        const file = app.vault.getAbstractFileByPath(MAPPING_PATH);
        if (file) await app.vault.modify(file, content);
        else await app.vault.create(MAPPING_PATH, content);
    }

    function buildStoreContent(data) {
        return [
            "---", "type: store", `title: ${quoteYaml(data.title)}`, "aliases:", `  - ${quoteYaml(data.title)}`,
            `created: ${today}`, "tags:", "  - еда", "  - store", "---", "", `# ${data.title}`, "", "## Заметки", "", ">"
        ].join("\n");
    }

    function buildCategoryContent(title) {
        return [
            "---", "type: category", `title: ${quoteYaml(title)}`, "aliases:", `  - ${quoteYaml(title)}`,
            `created: ${today}`, "tags:", "  - еда", "  - category", "---", "", `# ${title}`, "", "## Заметки", "", ">"
        ].join("\n");
    }

    function buildProductContent(data) {
        return [
            "---", "type: product", `title: ${quoteYaml(data.title)}`, `barcode: ${quoteYaml(data.barcode || "")}`, "aliases:", `  - ${quoteYaml(data.title)}`,
            `category: ${data.categoryPath ? wikilink(data.categoryPath, data.categoryTitle || "") : ""}`,
            `brand: ${quoteYaml(data.brand || "")}`, `base_unit: ${data.base_unit || "шт"}`,
            `typical_pack_size: ${data.typical_pack_size || ""}`, `typical_pack_unit: ${data.typical_pack_unit || ""}`,
            `perishable: ${Boolean(data.perishable)}`, `default_shelf_life_days: ${data.default_shelf_life_days || ""}`, `price: ${data.price || ""}`,
            `created: ${today}`, "tags:", "  - product", "---"
        ].join("\n");
    }

    function buildReceiptItemContent(item) {
        return [
            "---", "type: receipt-item", `date: ${item.date}`, `receipt: ${wikilink(item.receiptPath, item.receiptTitle)}`,
            `product: ${wikilink(item.productPath, item.productTitle)}`,
            `qty: ${item.qty}`, `pack_size: ${item.packSize || ""}`, `pack_unit: ${item.packUnit || ""}`,
            `price_total: ${item.priceTotal}`, `price_per_base_unit: ${item.pricePerBaseUnit ?? ""}`,
            `discount: ${Boolean(item.discount)}`, `rating: ${item.rating || ""}`, `review: ${quoteYaml(item.review || "")}`,
            `add_to_pantry: ${Boolean(item.addToPantry)}`, `created: ${today}`, "tags:", "  - еда", "  - receipt-item", "---",
            "", `# ${item.productTitle} - ${item.date}`, "", "## Заметки", "", ">"
        ].join("\n");
    }

    function buildPantryContent(entry) {
        return [
            "---", "type: pantry-item", `product: ${wikilink(entry.productPath, entry.productTitle)}`,
            `source_receipt_item: ${wikilink(entry.receiptItemPath, entry.receiptItemTitle)}`, `qty_current: ${entry.qtyCurrent}`,
            `unit: ${entry.unit}`, `manufactured_on: ${entry.manufacturedOn || ""}`, `created: ${today}`,
            "tags:", "  - еда", "  - pantry-item", "---", "", `# ${entry.productTitle} - запас`, "", "## Заметки", "", ">"
        ].join("\n");
    }

    function buildReceiptContent(data, tableRows) {
        return [
            "---", "type: receipt", `date: ${data.date}`, `store: ${wikilink(data.storePath, data.storeTitle)}`,
            `total: ${data.total}`, `receipt_image: ${data.receiptImage ? quoteYaml(data.receiptImage) : ""}`, `created: ${today}`,
            "tags:", "  - еда", "  - receipt", "---", "", `# Чек ${data.date} - ${data.storeTitle}`, "", "## Позиции", "",
            "| Товар | Кол-во | Фасовка | Цена | В запас |", "| ----- | ------ | ------- | ---- | ------- |", ...tableRows,
            "", "## Заметки", "", ">", "", "## Быстрые ссылки", "", "- [[Обзор]]", "- [[Покупки]]", "- [[Запасы]]"
        ].join("\n");
    }

    async function getOrCreateStore(storeName) {
        if (!storeName) storeName = "Неизвестный магазин";
        const stores = await loadFolder(DIRS.stores);
        const existing = stores.find(s => lower(s.title) === lower(storeName));
        if (existing) {
            notice(`Магазин найден: ${existing.title}`);
            return existing;
        }
        const labels = [`Создать магазин: ${storeName}`, "Ввести другое название"];
        const selected = await tp.system.suggester(labels, [true, false], false, `Магазин "${storeName}" не найден`);
        let finalName = storeName;
        if (selected === false) {
            finalName = (await tp.system.prompt("Название магазина", storeName))?.trim();
            if (!finalName) finalName = storeName;
        }
        const file = await createNote(DIRS.stores, finalName, buildStoreContent({ title: finalName }));
        notice(`Создан магазин: ${finalName}`);
        return await readFrontmatter(file);
    }

    async function getOrCreateCategory(categoryName) {
        const name = lower(categoryName);
        const categories = await loadFolder(DIRS.categories);
        const existing = categories.find(c => lower(c.title) === name);
        if (existing) return existing;
        const file = await createNote(DIRS.categories, categoryName, buildCategoryContent(categoryName));
        notice(`Создана категория: ${categoryName}`);
        return await readFrontmatter(file);
    }

    async function findOrCreateProduct(rawName, barcode, mapping) {
        const rawKey = lower(rawName);
        if (mapping[rawKey]) {
            const file = app.vault.getAbstractFileByPath(mapping[rawKey]);
            if (file) {
                notice(`Продукт из маппинга: ${rawName}`);
                return await readFrontmatter(file);
            }
        }

        const products = await loadFolder(DIRS.products);
        const matches = sortByRelevance(rawName, products);
        if (matches.length > 0 && sortByRelevance(rawName, [matches[0]])[0]) {
            const top = matches[0];
            notice(`Найден похожий продукт: ${top.title}`);
            mapping[rawKey] = top.file.path;
            return top;
        }

        const title = String(rawName || "").trim();
        if (!title) return null;

        const categoryObj = await getOrCreateCategory("прочее");
        const file = await createNote(DIRS.products, title, buildProductContent({
            title, barcode: barcode || "", categoryPath: categoryObj.file.path, categoryTitle: categoryObj.title,
            brand: "", base_unit: "шт", typical_pack_size: "", typical_pack_unit: "",
            perishable: false, default_shelf_life_days: "", price: ""
        }));
        notice(`Создан продукт: ${title}`);
        mapping[rawKey] = file.path;
        return await readFrontmatter(file);
    }

    async function importReceiptFromProverka(tp, ticket) {
        if (!ticket || !ticket.items || ticket.items.length === 0) {
            return "# Нет позиций в чеке";
        }

        const dateTime = ticket.dateTime || "";
        const date = dateTime ? window.moment(dateTime).format("YYYY-MM-DD") : today;
        const store = await getOrCreateStore(ticket.retailPlace);
        const totalRub = (Number(ticket.totalSum || 0) / 100).toFixed(2);

        notice(`Чек: ${date}, ${store.title}, ${totalRub} ₽, ${ticket.items.length} поз.`);

        const requestedTitle = `${date} ${store.title}`;
        const receiptPath = await ensureUniquePath(DIRS.receipts, requestedTitle);
        const receiptTitle = receiptPath.split("/").pop().replace(/\.md$/, "");

        const tableRows = [];
        const mapping = await loadMapping();

        for (const item of ticket.items) {
            notice(`Обработка: ${item.name}`);
            const product = await findOrCreateProduct(item.name, item.barcode, mapping);
            if (!product) continue;

            const qty = Number(item.quantity || 1);
            const priceTotal = (Number(item.sum || 0) / 100).toFixed(2);
            const packSize = "";
            const packUnit = item.unit || "шт";

            const itemTitle = `${date} ${store.title} ${product.title}`;
            const receiptItemFile = await createNote(DIRS.receiptItems, itemTitle, buildReceiptItemContent({
                date, receiptTitle, receiptPath, storeTitle: store.title, storePath: store.file.path,
                productTitle: product.title, productPath: product.file.path, qty, packSize, packUnit, priceTotal,
                pricePerBaseUnit: "", discount: false, rating: "", review: "", addToPantry: false
            }));

            tableRows.push(`| ${wikilink(product.file.path, product.title)} | ${qty} | ${packSize || "-"} ${packUnit || ""} | ${priceTotal} | Нет |`);
        }

        await saveMapping(mapping);

        const receiptContent = buildReceiptContent({
            date, storeTitle: store.title, storePath: store.file.path,
            total: totalRub, receiptImage: ""
        }, tableRows);

        await app.vault.create(receiptPath, receiptContent);
        notice(`Чек сохранён: ${receiptTitle}`);

        return receiptContent;
    }

    return { importReceiptFromProverka };
};
