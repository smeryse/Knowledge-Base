module.exports = async function foodMealPlan(tp) {
    const ROOT = "Projects/Кухня";
    const DIRS = {
        recipes: `${ROOT}/Recipes`,
        mealPlans: `${ROOT}/Meal Plans`
    };

    const now = new Date();
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

    function quoteYaml(value) {
        return JSON.stringify(String(value || ""));
    }

    function sanitizeFileName(value) {
        return String(value || "")
            .replace(/[\\/:*?"<>|#\[\]]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    async function ensureUniquePath(folder, baseName) {
        const safeBase = sanitizeFileName(baseName) || "meal-plan";
        let candidate = `${folder}/${safeBase}.md`;
        let index = 2;
        while (app.vault.getAbstractFileByPath(candidate)) {
            candidate = `${folder}/${safeBase}-${index}.md`;
            index += 1;
        }
        return candidate;
    }

    function parseMonthInput(value) {
        const raw = String(value || "").trim();
        const match = raw.match(/^(\d{4})-(\d{2})$/);
        if (!match) return null;

        const year = Number(match[1]);
        const month = Number(match[2]);
        if (month < 1 || month > 12) return null;

        return {
            year,
            month,
            key: `${year}-${String(month).padStart(2, "0")}`
        };
    }

    function monthLabel(year, month) {
        const names = [
            "январь", "февраль", "март", "апрель", "май", "июнь",
            "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"
        ];
        return `${names[month - 1]} ${year}`;
    }

    const weekdayDefinitions = [
        { key: "mon", labels: ["пн", "пон", "понедельник", "mon", "monday"], title: "понедельник", short: "пн", index: 1 },
        { key: "tue", labels: ["вт", "вторник", "tue", "tuesday"], title: "вторник", short: "вт", index: 2 },
        { key: "wed", labels: ["ср", "среда", "wed", "wednesday"], title: "среда", short: "ср", index: 3 },
        { key: "thu", labels: ["чт", "четверг", "четв", "thu", "thursday"], title: "четверг", short: "чт", index: 4 },
        { key: "fri", labels: ["пт", "пятница", "fri", "friday"], title: "пятница", short: "пт", index: 5 },
        { key: "sat", labels: ["сб", "суббота", "sat", "saturday"], title: "суббота", short: "сб", index: 6 },
        { key: "sun", labels: ["вс", "воскресенье", "sun", "sunday"], title: "воскресенье", short: "вс", index: 0 }
    ];

    function parseWeekdaysInput(value) {
        const raw = String(value || "").trim();
        if (!raw) {
            return ["thu", "sun"];
        }

        const keys = [];
        const seen = new Set();
        const parts = raw.split(/[;,]/).map(part => lower(part)).filter(Boolean);

        for (const part of parts) {
            const found = weekdayDefinitions.find(day => day.labels.includes(part));
            if (!found || seen.has(found.key)) continue;
            seen.add(found.key);
            keys.push(found.key);
        }

        return keys.length > 0 ? keys : ["thu", "sun"];
    }

    function getWeekdayDefinition(key) {
        return weekdayDefinitions.find(day => day.key === key) || weekdayDefinitions[0];
    }

    function formatWeekdays(keys) {
        return keys.map(key => getWeekdayDefinition(key).title).join(", ");
    }

    async function pickRecipes(tpInstance) {
        const recipes = (await loadFolder(DIRS.recipes))
            .filter(recipe => recipe.type === "recipe" && recipe.recipe_status !== "archived")
            .sort((a, b) => a.title.localeCompare(b.title, "ru"));

        if (recipes.length === 0) {
            notice("В Recipes нет активных рецептов.");
            return [];
        }

        const selected = [];
        const selectedPaths = new Set();

        while (true) {
            const available = recipes.filter(recipe => !selectedPaths.has(recipe.file.path));
            const labels = ["Готово"];
            const values = [null];

            for (const recipe of available) {
                labels.push(`${recipe.title}${recipe.dish_type ? ` [${recipe.dish_type}]` : ""}`);
                values.push(recipe);
            }

            const picked = await tpInstance.system.suggester(labels, values, false, "Выбери рецепт для месячного плана");
            if (!picked) {
                if (selected.length > 0) break;
                continue;
            }

            if (picked === null) {
                break;
            }

            selected.push(picked);
            selectedPaths.add(picked.file.path);

            if (available.length === 1) break;
        }

        return selected;
    }

    function buildMonthSlots(year, month, weekdayKeys) {
        const slots = [];
        const selectedIndexes = new Set(weekdayKeys.map(key => getWeekdayDefinition(key).index));
        const lastDay = new Date(year, month, 0).getDate();

        for (let day = 1; day <= lastDay; day += 1) {
            const date = new Date(year, month - 1, day);
            const weekdayIndex = date.getDay();
            if (!selectedIndexes.has(weekdayIndex)) continue;

            const weekday = weekdayDefinitions.find(item => item.index === weekdayIndex) || weekdayDefinitions[0];
            const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            slots.push({
                date: isoDate,
                weekdayKey: weekday.key,
                weekdayTitle: weekday.title,
                weekdayShort: weekday.short
            });
        }

        return slots;
    }

    function buildMealPlanContent(data) {
        const lines = [
            "---",
            "type: meal-plan",
            `title: ${quoteYaml(data.title)}`,
            `month: ${data.monthKey}`,
            "cooking_days:",
            ...data.cookingDays.map(day => `  - ${day}`),
            "recipes:",
            ...data.recipes.map(recipe => `  - [[${recipe.title}]]`),
            `recipe_count: ${data.recipes.length}`,
            `slot_count: ${data.slots.length}`,
            `created: ${today}`,
            "tags:",
            "  - еда",
            "  - meal-plan",
            "---",
            "",
            `# ${data.title}`,
            "",
            `Месяц: **${data.monthLabel}**`,
            "",
            `Дни готовки: ${data.cookingDayTitles}`,
            "",
            `Рецептов в ротации: ${data.recipes.length}`,
            "",
            "## Расписание",
            "",
            "| Дата | День | Рецепт | Тип | Статус |",
            "| ---- | ---- | ------ | --- | ------ |"
        ];

        for (const slot of data.slots) {
            lines.push(`| ${slot.date} | ${slot.weekdayShort} | [[${slot.recipe.title}]] | ${slot.recipe.dish_type || ""} | planned |`);
        }

        lines.push("", "## Заметки", "", "> ");
        return lines.join("\n");
    }

    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthInput = await tp.system.prompt("Месяц плана в формате YYYY-MM", defaultMonth);
    if (!monthInput) return "";

    const parsedMonth = parseMonthInput(monthInput);
    if (!parsedMonth) {
        notice("Неверный формат месяца. Используй YYYY-MM.");
        return "Не удалось создать план: неверный формат месяца.";
    }

    const selectedRecipes = await pickRecipes(tp);
    if (selectedRecipes.length === 0) {
        notice("Нужно выбрать хотя бы один рецепт.");
        return "План не создан: не выбраны рецепты.";
    }

    const weekdaysInput = await tp.system.prompt(
        "Дни готовки через запятую (пусто = четверг, воскресенье)",
        ""
    );

    const cookingDays = parseWeekdaysInput(weekdaysInput);
    const slots = buildMonthSlots(parsedMonth.year, parsedMonth.month, cookingDays);
    if (slots.length === 0) {
        notice("В выбранном месяце не нашлось слотов под эти дни недели.");
        return "План не создан: нет подходящих дней.";
    }

    const scheduledSlots = slots.map((slot, index) => ({
        ...slot,
        recipe: selectedRecipes[index % selectedRecipes.length]
    }));

    const title = `${parsedMonth.key} - план питания`;
    const path = await ensureUniquePath(DIRS.mealPlans, title);
    const file = await app.vault.create(path, buildMealPlanContent({
        title,
        monthKey: parsedMonth.key,
        monthLabel: monthLabel(parsedMonth.year, parsedMonth.month),
        cookingDays,
        cookingDayTitles: formatWeekdays(cookingDays),
        recipes: selectedRecipes,
        slots: scheduledSlots
    }));

    notice(`План питания создан: ${parsedMonth.key}`);
    return `Создан план [[${file.basename}]] на ${monthLabel(parsedMonth.year, parsedMonth.month)}.`;
};
