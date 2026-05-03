module.exports = async function foodCook(tp) {
    const ROOT = "Projects/Кухня";
    const DIRS = {
        recipes: `${ROOT}/Recipes`,
        pantry: `${ROOT}/Pantry`,
        products: `${ROOT}/Products`,
        cookingLog: `${ROOT}/Cooking Log`
    };
    const today = tp.date.now("YYYY-MM-DD");

    function notice(message, timeout = 5000) {
        new Notice(message, timeout);
    }

    function lower(value) {
        return String(value || "").trim().toLowerCase();
    }

    function parseYamlValue(value) {
        const raw = String(value || "").trim();
        if (!raw) return "";
        if (raw === "true") return true;
        if (raw === "false") return false;
        if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
            return raw.slice(1, -1);
        }
        if (/^-?\d+(?:[.,]\d+)?$/.test(raw)) {
            return Number(raw.replace(",", "."));
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
                data[fieldMatch[1]] = parseYamlValue(fieldMatch[2]);
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

    function normalizeUnit(unit) {
        const key = lower(unit).replace(/\./g, "");
        const map = {
            g: "г",
            gr: "г",
            "гр": "г",
            kg: "кг",
            ml: "мл",
            l: "л",
            pcs: "шт",
            pc: "шт",
            piece: "шт",
            pieces: "шт",
            "шт": "шт",
            "штук": "шт",
            "штука": "шт",
            "штучка": "шт",
            "зубчик": "шт",
            "зубчика": "шт",
            "зубчиков": "шт",
            "веточка": "шт",
            "веточки": "шт",
            "веток": "шт"
        };
        return map[key] || key;
    }

    function convertQuantity(value, fromUnit, toUnit) {
        const amount = Number(value);
        if (!Number.isFinite(amount)) return null;

        const from = normalizeUnit(fromUnit);
        const to = normalizeUnit(toUnit);

        if (!from || !to) return null;
        if (from === to) return amount;
        if (from === "кг" && to === "г") return amount * 1000;
        if (from === "г" && to === "кг") return amount / 1000;
        if (from === "л" && to === "мл") return amount * 1000;
        if (from === "мл" && to === "л") return amount / 1000;
        return null;
    }

    function quoteYaml(value) {
        const text = String(value || "");
        return JSON.stringify(text);
    }

    function extractLinkTarget(value) {
        const match = String(value || "").match(/^\[\[(.*?)(?:\|.*)?\]\]$/);
        return (match?.[1] || String(value || "")).trim();
    }

    function normalizeText(value) {
        return lower(value)
            .replace(/ё/g, "е")
            .replace(/[^a-zа-я0-9]+/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function stemToken(token) {
        let value = normalizeText(token);
        if (value.length <= 4) return value;
        value = value.replace(/(иями|ями|ами|ого|ему|ому|ыми|ими|иях|ах|ях|ов|ев|ей|ом|ем|ам|ям|ой|ий|ый|ая|яя|ое|ее|ые|ие|ых|их|ую|юю|а|я|ы|и|о|е|у|ю)$/i, "");
        return value.length >= 3 ? value : normalizeText(token);
    }

    function tokenize(value) {
        return normalizeText(value)
            .split(" ")
            .map(stemToken)
            .filter(Boolean);
    }

    function scoreMatch(ingredientName, candidateName) {
        const ingredient = normalizeText(ingredientName);
        const candidate = normalizeText(candidateName);
        if (!ingredient || !candidate) return 0;
        if (ingredient === candidate) return 100;
        if (candidate.includes(ingredient) || ingredient.includes(candidate)) return 75;

        const ingredientTokens = tokenize(ingredientName);
        const candidateTokens = tokenize(candidateName);
        if (ingredientTokens.length === 0 || candidateTokens.length === 0) return 0;

        const candidateSet = new Set(candidateTokens);
        let overlap = 0;
        for (const token of ingredientTokens) {
            if (candidateSet.has(token)) overlap += 1;
        }

        const ratio = overlap / Math.max(ingredientTokens.length, candidateTokens.length);
        return overlap * 20 + Math.round(ratio * 20);
    }

    function parseNumber(value) {
        const match = String(value || "")
            .replace(/,/g, ".")
            .match(/(\d+(?:\.\d+)?)(?:\s*[–-]\s*\d+(?:\.\d+)?)?/);
        return match ? Number(match[1]) : null;
    }

    function formatQty(value) {
        const number = Number(value || 0);
        if (!Number.isFinite(number)) return "0";
        return String(Number(number.toFixed(3)));
    }

    function parseIngredientTable(content) {
        const text = String(content || "");
        const marker = "## Ингредиенты";
        const start = text.indexOf(marker);
        if (start === -1) return [];

        const sectionStart = start + marker.length;
        const nextHeader = text.indexOf("\n## ", sectionStart);
        const sectionBody = nextHeader === -1
            ? text.slice(sectionStart)
            : text.slice(sectionStart, nextHeader);

        const rows = [];
        const lines = sectionBody
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.startsWith("|"));

        for (const line of lines) {
            if (/^\|\s*-+/.test(line) || /^\|\s*Продукт\s*\|/i.test(line)) continue;
            const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
            if (cells.length < 3) continue;
            rows.push({
                product: cells[0],
                qtyRaw: cells[1],
                unitRaw: cells[2],
                note: cells[3] || "",
                qty: parseNumber(cells[1]),
                unit: normalizeUnit(cells[2])
            });
        }

        return rows;
    }

    function buildProductsMap(products) {
        const map = new Map();
        for (const product of products) {
            map.set(normalizeText(product.title), product);
        }
        return map;
    }

    function deriveEffectiveStock(pantryItem, product) {
        const storedQty = Number(pantryItem.qty_current || 0);
        const storedUnit = normalizeUnit(pantryItem.unit || "шт");
        const packSize = Number(product?.typical_pack_size || 0);
        const packUnit = normalizeUnit(product?.typical_pack_unit || "");

        if (storedQty > 0 && storedUnit === "шт" && packSize > 0 && packUnit) {
            return {
                qty: storedQty * packSize,
                unit: packUnit,
                sourceMode: "pack"
            };
        }

        return {
            qty: storedQty,
            unit: storedUnit,
            sourceMode: "direct"
        };
    }

    function sanitizeFileName(value) {
        return String(value || "")
            .replace(/[\\/:*?"<>|#\[\]]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    async function ensureUniquePath(folder, baseName) {
        const safeBase = sanitizeFileName(baseName) || "entry";
        let candidate = `${folder}/${safeBase}.md`;
        let index = 2;
        while (app.vault.getAbstractFileByPath(candidate)) {
            candidate = `${folder}/${safeBase}-${index}.md`;
            index += 1;
        }
        return candidate;
    }

    async function pickRecipe() {
        const recipes = (await loadFolder(DIRS.recipes))
            .filter(recipe => recipe.type === "recipe" && recipe.recipe_status !== "archived")
            .sort((a, b) => a.title.localeCompare(b.title, "ru"));

        if (recipes.length === 0) {
            notice("В Recipes нет активных рецептов.");
            return null;
        }

        const labels = recipes.map(recipe => `${recipe.title}${recipe.servings ? ` (${recipe.servings} порц.)` : ""}`);
        const selected = await tp.system.suggester(labels, recipes, false, "Какой рецепт приготовлен?");
        return selected || null;
    }

    async function updatePantryFile(file, nextQty, nextUnit, nextStatus) {
        await app.fileManager.processFrontMatter(file, frontmatter => {
            frontmatter.qty_current = Number(formatQty(nextQty));
            frontmatter.unit = nextUnit || frontmatter.unit || "шт";
            frontmatter.status = nextStatus;
        });
    }

    function buildCookingContent(data) {
        const lines = [
            "---",
            "type: cooking-entry",
            `title: ${quoteYaml(data.title)}`,
            `date: ${data.date}`,
            `recipe: [[${data.recipeTitle}]]`,
            `servings_cooked: ${formatQty(data.servingsCooked)}`,
            `servings_base: ${formatQty(data.servingsBase)}`,
            `scale_factor: ${formatQty(data.scaleFactor)}`,
            "status: done",
            "tags:",
            "  - еда",
            "  - cooking-entry",
            "---",
            "",
            `# ${data.title}`,
            "",
            "## Списание",
            "",
            "| Продукт | Нужно | Списано | Статус | Источник |",
            "| ------- | ----- | ------- | ------ | -------- |"
        ];

        for (const row of data.rows) {
            lines.push(`| ${row.product} | ${row.required} | ${row.used} | ${row.status} | ${row.source} |`);
        }

        lines.push("", "## Заметки", "", "> ");
        return lines.join("\n");
    }

    const recipe = await pickRecipe();
    if (!recipe) {
        return "";
    }

    const recipeContent = recipe.content || await app.vault.read(recipe.file);
    const ingredients = parseIngredientTable(recipeContent);
    if (ingredients.length === 0) {
        notice(`В рецепте '${recipe.title}' не найдена таблица ингредиентов.`);
        return `Не удалось разобрать ингредиенты в [[${recipe.title}]].`;
    }

    const baseServings = Number(recipe.servings || 1) || 1;
    const servingsInput = await tp.system.prompt("Сколько порций приготовлено", String(baseServings));
    if (!servingsInput) return "";

    const parsedServingsCooked = Number(String(servingsInput).replace(",", "."));
    const servingsCooked = Number.isFinite(parsedServingsCooked) && parsedServingsCooked > 0
        ? parsedServingsCooked
        : baseServings;
    const scaleFactor = servingsCooked / baseServings;

    const pantryRows = (await loadFolder(DIRS.pantry))
        .filter(item => item.type === "pantry-item" && item.status !== "consumed" && item.status !== "discarded" && Number(item.qty_current || 0) > 0);
    const productRows = await loadFolder(DIRS.products);
    const productsMap = buildProductsMap(productRows);

    const pantryState = pantryRows.map(item => {
        const productTitle = extractLinkTarget(item.product || item.title || item.file.basename);
        const product = productsMap.get(normalizeText(productTitle)) || null;
        const effective = deriveEffectiveStock(item, product);
        return {
            file: item.file,
            title: productTitle,
            product,
            storedQty: Number(item.qty_current || 0),
            storedUnit: normalizeUnit(item.unit || "шт"),
            effectiveQty: Number(effective.qty || 0),
            effectiveUnit: normalizeUnit(effective.unit || item.unit || "шт"),
            sourceMode: effective.sourceMode
        };
    });

    const resultRows = [];
    const plannedChanges = [];

    for (const ingredient of ingredients) {
        const requiredQty = ingredient.qty ? ingredient.qty * scaleFactor : null;
        const supported = requiredQty && ingredient.unit && ["г", "кг", "мл", "л", "шт"].includes(ingredient.unit);

        if (!supported) {
            resultRows.push({
                product: ingredient.product,
                required: ingredient.qty ? `${formatQty(requiredQty)} ${ingredient.unit}` : `${ingredient.qtyRaw || ""} ${ingredient.unitRaw || ""}`.trim(),
                used: "0",
                status: "пропущено",
                source: "нужна ручная проверка"
            });
            continue;
        }

        const candidates = pantryState
            .map(item => {
                const convertedQty = convertQuantity(item.effectiveQty, item.effectiveUnit, ingredient.unit);
                return {
                    item,
                    availableInTargetUnit: convertedQty,
                    score: Math.max(
                        scoreMatch(ingredient.product, item.title),
                        scoreMatch(ingredient.product, item.product?.title || "")
                    )
                };
            })
            .filter(item => item.score > 0 && Number(item.availableInTargetUnit || 0) > 0)
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                if (a.item.expiresOn && b.item.expiresOn) return String(a.item.expiresOn).localeCompare(String(b.item.expiresOn));
                if (a.item.expiresOn) return -1;
                if (b.item.expiresOn) return 1;
                return a.item.title.localeCompare(b.item.title, "ru");
            });

        let remaining = requiredQty;
        const sources = [];
        let usedTotal = 0;

        for (const candidate of candidates) {
            if (remaining <= 0) break;
            const usable = Math.min(candidate.availableInTargetUnit, remaining);
            if (!(usable > 0)) continue;

            const usedInEffectiveUnit = convertQuantity(usable, ingredient.unit, candidate.item.effectiveUnit);
            if (usedInEffectiveUnit === null) continue;

            const nextEffectiveQty = Math.max(0, candidate.item.effectiveQty - usedInEffectiveUnit);
            candidate.item.effectiveQty = nextEffectiveQty;

            const nextUnit = candidate.item.effectiveUnit;
            const nextStatus = nextEffectiveQty > 0 ? "active" : "consumed";

            plannedChanges.push({
                file: candidate.item.file,
                qty: nextEffectiveQty,
                unit: nextUnit,
                status: nextStatus
            });

            usedTotal += usable;
            remaining -= usable;
            sources.push(`[[${candidate.item.file.basename}]]`);
        }

        resultRows.push({
            product: ingredient.product,
            required: `${formatQty(requiredQty)} ${ingredient.unit}`,
            used: `${formatQty(usedTotal)} ${ingredient.unit}`,
            status: remaining <= 0.0001 ? "списано" : (usedTotal > 0 ? "частично" : "не найдено"),
            source: sources.length > 0 ? sources.join(", ") : "-"
        });
    }

    const previewLines = resultRows.map(row => `${row.product}: ${row.required} -> ${row.used} (${row.status})`);
    const approved = await tp.system.suggester(
        ["Применить списание", "Отмена"],
        ["apply", "cancel"],
        false,
        `Проверка списания:\n${previewLines.join("\n")}`
    );

    if (approved !== "apply") {
        return "Списание отменено.";
    }

    const dedupedChanges = new Map();
    for (const change of plannedChanges) {
        dedupedChanges.set(change.file.path, change);
    }

    for (const change of dedupedChanges.values()) {
        await updatePantryFile(change.file, change.qty, change.unit, change.status);
    }

    const cookingTitle = `${today} - ${recipe.title}`;
    const cookingPath = await ensureUniquePath(DIRS.cookingLog, cookingTitle);
    const cookingFile = await app.vault.create(cookingPath, buildCookingContent({
        title: cookingTitle,
        date: today,
        recipeTitle: recipe.title,
        servingsCooked,
        servingsBase: baseServings,
        scaleFactor,
        rows: resultRows
    }));

    notice(`Готовка записана: ${recipe.title}`);
    return `Создана запись [[${cookingFile.basename}]] и обновлены остатки в Pantry.`;
};
