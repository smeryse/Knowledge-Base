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
const receipts = dv.pages('"Projects/Еда/Receipts"').where(p => p.type === "receipt");
const receiptItems = dv.pages('"Projects/Еда/Receipt Items"').where(p => p.type === "receipt-item");
const pantry = dv.pages('"Projects/Еда/Pantry"').where(p => p.type === "pantry-item");
const shopping = dv.pages('"Projects/Еда/Shopping List"').where(p => p.type === "shopping-item" && p.status != "done" && p.status != "cancelled");

const today = dv.date('today');
const expiringSoon = pantry.where(p => p.expires_on && dv.date(p.expires_on) <= today.plus({ days: 3 }));

dv.table(["Показатель", "Значение"], [
  ["Товаров в базе", products.length],
  ["Чеков", receipts.length],
  ["Позиций в чеках", receiptItems.length],
  ["Запасов дома", pantry.length],
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
