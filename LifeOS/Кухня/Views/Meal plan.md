---
tags:
  - еда
  - meal-plan
aliases:
  - Meal Plans
---

# План питания

← [[Кухня]] | [[Review|Review]] | [[Recipes|Recipes]] | [[Pantry|Pantry]] | [[Shopping list|Shopping list]] | [[Recipes log|Recipes log]] | [[Receipts|Чеки]] | [[Views/Views|Views]]

## Месячные планы

```dataview
TABLE month as "Месяц", recipe_count as "Рецептов", slot_count as "Слотов", cooking_days as "Дни готовки"
FROM "LifeOS/Кухня/Meal Plans"
WHERE type = "meal-plan"
SORT month DESC, file.mtime DESC
```
