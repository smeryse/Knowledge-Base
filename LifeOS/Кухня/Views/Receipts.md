---
tags:
  - еда
  - receipts
  - dashboard
aliases:
  - Чеки
  - История чеков
  - Покупки по чекам
---

← [[Кухня]] | [[Review|Review]] | [[Recipes|Recipes]] | [[Pantry|Pantry]] | [[Shopping list|Shopping list]] | [[Recipes log|Recipes log]] | [[LifeOS/Кухня/Views/Meal plan|Meal plan]] | [[Views/Views|Views]]

---

## Все чеки

```dataview
TABLE date as "Дата", store as "Магазин", total as "Сумма"
FROM "LifeOS/Кухня/Receipts"
WHERE type = "receipt"
SORT date DESC
```

---

## Последние 10

```dataview
TABLE date as "Дата", store as "Магазин", total as "Сумма"
FROM "LifeOS/Кухня/Receipts"
WHERE type = "receipt"
SORT date DESC
LIMIT 10
```

---

## По магазинам

```dataviewjs
const receipts = dv.pages('"LifeOS/Кухня/Receipts"')
  .where(p => p.type === "receipt" && p.store);

const byStore = {};
for (const r of receipts) {
  const storeName = r.store?.display || r.store || "Неизвестный";
  byStore[storeName] = (byStore[storeName] || 0) + (r.total || 0);
}

const rows = Object.entries(byStore)
  .sort((a, b) => b[1] - a[1])
  .map(([store, total]) => [store, total.toFixed(2) + "₽"]);

dv.table(["Магазин", "Всего потрачено"], rows);
```

---

## Как добавить

- Фото QR-кода → Telegram-бот «Личный Помощник»
- Ручной ввод → шаблон `[[Templates/Новый чек]]` (Obsidian)
