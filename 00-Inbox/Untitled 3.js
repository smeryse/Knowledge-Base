module.exports = async function foodRecipe(tp) {
    const titleInput = await tp.system.prompt("Название рецепта", tp.file.title);
    const title = (titleInput || tp.file.title || "Новый рецепт").trim();
    if (title && title !== tp.file.title) {
        await tp.file.rename(title);
    }

    const dishType = await tp.system.suggester(
        ["горячее", "завтрак", "суп", "гарнир", "перекус", "десерт", "напиток"],
        ["горячее", "завтрак", "суп", "гарнир", "перекус", "десерт", "напиток"],
        false,
        "Тип блюда"
    );

    const servings = "1";
    const totalTime = await tp.system.prompt("Время приготовления, минут", "30");
    const source = (await tp.system.prompt("Источник", "local")) || "local";

    return [
        "---",
        "type: recipe",
        `title: ${title}`,
        "aliases: []",
        `dish_type: ${dishType || ""}`,
        `servings: ${servings}`,
        `total_time_min: ${totalTime || ""}`,
        `source: ${source}`,
        "products: []",
        "recipe_status: active",
        `created: ${tp.date.now("YYYY-MM-DD")}`,
        "tags:",
        "  - еда",
        "  - recipe",
        "---",
        "",
        `# ${title}`,
        "",
        "## Ингредиенты",
        "",
        "| Продукт | Кол-во | Ед. | Примечание |",
        "| ------- | ------ | --- | ---------- |",
        "",
        "Для автосписания указывай числовое количество и единицы `г`, `кг`, `мл`, `л` или `шт`.",
        "",
        "Все количества в рецепте указывай на 1 порцию. При готовке скрипт сам умножит их на нужное число порций.",
        "",
        "## Шаги",
        "",
        "1. ",
        "",
        "## Заметки",
        "",
        ">"
    ].join("\n");
};
