---
tags:
  - еда
  - dashboard
aliases:
  - Дашборд еды
---

# Dashboard

## Сводка

```dataviewjs
const products = dv.pages('"Projects/Еда/Products"').where(p => p.type === "product");
const recipes = dv.pages('"Projects/Еда/Recipes"').where(p => p.type === "recipe" && p.recipe_status !== "archived");
const receipts = dv.pages('"Projects/Еда/Receipts"').where(p => p.type === "receipt");
const receiptItems = dv.pages('"Projects/Еда/Receipt Items"').where(p => p.type === "receipt-item");
const pantry = dv.pages('"Projects/Еда/Pantry"').where(p => p.type === "pantry-item");
const cooking = dv.pages('"Projects/Еда/Cooking Log"').where(p => p.type === "cooking-entry");
const shopping = dv.pages('"Projects/Еда/Shopping List"').where(p => p.type === "shopping-item" && p.status != "done" && p.status != "cancelled");

const today = dv.date('today');
const expiringSoon = pantry.where(p => p.expires_on && dv.date(p.expires_on) <= today.plus({ days: 3 }));

dv.table(["Показатель", "Значение"], [
  ["Товаров в базе", products.length],
  ["Рецептов", recipes.length],
  ["Чеков", receipts.length],
  ["Позиций в чеках", receiptItems.length],
  ["Запасов дома", pantry.length],
  ["Приготовлений", cooking.length],
  ["Пунктов к покупке", shopping.length],
  ["Скоро истекают", expiringSoon.length]
]);
```

---

## Последние чеки

```dataview
TABLE date as "Дата", store as "Магазин", total as "Сумма"
FROM "Projects/Еда/Receipts"
WHERE type = "receipt"
SORT date DESC
LIMIT 10
```

---

## Срочно купить

```dataview
TABLE product as "Товар", target_qty as "Нужно", unit as "Ед.", preferred_store as "Магазин"
FROM "Projects/Еда/Shopping List"
WHERE type = "shopping-item" AND status != "done" AND status != "cancelled"
SORT file.mtime DESC
LIMIT 15
```

---

## Скоро истекает

```dataview
TABLE product as "Товар", qty_current as "Остаток", expires_on as "Годен до", location as "Где лежит"
FROM "Projects/Еда/Pantry"
WHERE type = "pantry-item" AND status != "consumed" AND status != "discarded" AND expires_on
SORT expires_on ASC
LIMIT 15
```

---

## Последние добавленные товары

```dataview
TABLE category as "Категория", brand as "Бренд", barcode as "Штрихкод"
FROM "Projects/Еда/Products"
WHERE type = "product"
SORT file.ctime DESC
LIMIT 15
```

---

## Последние рецепты

```dataview
TABLE dish_type as "Тип", servings as "Порций", total_time_min as "Мин"
FROM "Projects/Еда/Recipes"
WHERE type = "recipe" AND recipe_status != "archived"
SORT file.ctime DESC
LIMIT 10
```

---

## Последняя готовка

```dataview
TABLE date as "Дата", recipe as "Рецепт", servings_cooked as "Порций"
FROM "Projects/Еда/Cooking Log"
WHERE type = "cooking-entry"
SORT date DESC, file.mtime DESC
LIMIT 10
```
