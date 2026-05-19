---
tags:
  - еда
  - recipes
aliases:
  - База рецептов
---

# Рецепты

← [[Кухня]] | [[Review|Review]] | [[Pantry|Pantry]] | [[Shopping list|Shopping list]] | [[Recipes log|Recipes log]] | [[LifeOS/Кухня/Views/Meal plan|Meal plan]] | [[Receipts|Чеки]] | [[Views/Views|Views]]

## Активные рецепты

```dataview
TABLE dish_type as "Тип", servings as "Порций", total_time_min as "Мин", source as "Источник"
FROM "LifeOS/Кухня/Recipes"
WHERE type = "recipe" AND recipe_status != "archived"
SORT file.mtime DESC
```

---

## Неполные карточки

```dataview
TABLE servings as "Порций", total_time_min as "Мин", source as "Источник", products as "Продукты"
FROM "LifeOS/Кухня/Recipes"
WHERE type = "recipe" AND (!products OR length(products) = 0 OR !total_time_min)
SORT file.name ASC
```

---

## Как добавлять

1. Создай заметку в `LifeOS/Кухня/Recipes/`.
2. Примени шаблон `LifeOS/Кухня/Templates/Recipe.md`.
3. В `products` добавь ссылки на карточки товаров из `Products/`.
4. В таблице `Ингредиенты` укажи количества и единицы, а в `Шаги` сам процесс.
