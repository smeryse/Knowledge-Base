---
tags:
  - еда
  - cooking
aliases:
  - Журнал готовки
---

# Готовка

← [[Кухня]] | [[Review|Review]] | [[Recipes|Recipes]] | [[Pantry|Pantry]] | [[Shopping list|Shopping list]] | [[LifeOS/Кухня/Views/Meal plan|Meal plan]] | [[Receipts|Чеки]] | [[Views/Views|Views]]

## Последние приготовления

```dataview
TABLE date as "Дата", recipe as "Рецепт", servings_cooked as "Порций", scale_factor as "Коэф."
FROM "LifeOS/Кухня/Cooking Log"
WHERE type = "cooking-entry"
SORT date DESC, file.mtime DESC
```
