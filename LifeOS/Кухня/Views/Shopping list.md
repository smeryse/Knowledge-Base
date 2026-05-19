---
tags:
  - еда
  - shopping
aliases:
  - Что купить
  - Список покупок
---

# Покупки

← [[Кухня]] | [[Review|Review]] | [[Recipes|Recipes]] | [[Pantry|Pantry]] | [[Recipes log|Recipes log]] | [[LifeOS/Кухня/Views/Meal plan|Meal plan]] | [[Receipts|Чеки]] | [[Views/Views|Views]]

## Активные покупки

```dataview
TABLE product as "Товар", target_qty as "Нужно", unit as "Ед.", reason as "Зачем"
FROM "LifeOS/Кухня/Shopping List"
WHERE type = "shopping-item" AND status != "done" AND status != "cancelled"
SORT file.mtime DESC
```

---

## Под план на месяц

- список рассчитан под `[[Meal Plans/План питания - 2026-05|План питания - 2026-05]]`;
- свежие овощи и молочку лучше докупать частями в течение месяца.
