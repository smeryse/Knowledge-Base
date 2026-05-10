---
tags:
  - финансы
  - views
  - dashboard
aliases:
  - Финансовые сводки
---

# Финансовые сводки

Навигация: [[Кошелек/Кошелек|Главная]]

---

## Расходы по категориям за текущий месяц

```dataview
TABLE WITHOUT ID
  category as "Категория",
  sum(amount) as "Сумма"
FROM "Projects/Кошелек/Monthly"
WHERE contains(file.name, "2026-05")
FLATTEN rows as row
GROUP BY category
SORT sum(amount) DESC
```

## Динамика балансов по счетам

```dataview
TABLE WITHOUT ID
  link(file.name, title) as "Счёт",
  balance as "Баланс",
  currency as "Валюта"
FROM "Projects/Кошелек/Accounts"
SORT balance DESC
```

## Прогресс накоплений

```dataview
TABLE WITHOUT ID
  link(file.name, title) as "Цель",
  saved_amount as "Накоплено",
  target_amount as "Цель",
  round((saved_amount / target_amount) * 100) + "%" as "Прогресс"
FROM "Projects/Кошелек/Savings"
```

## Активные кешбек-категории

```dataview
TABLE WITHOUT ID
  bank as "Банк",
  file.link as "Программа",
  valid_from as "С",
  valid_to as "По"
FROM "Projects/Кошелек/Cashback"
WHERE valid_to >= date(today)
```

## Ближайшие платежи

```dataview
TABLE WITHOUT ID
  link(file.name, title) as "Платёж",
  amount as "Сумма",
  next_due as "Дата",
  period as "Период",
  auto_pay as "Авто"
FROM "Projects/Кошелек/Recurring"
SORT next_due ASC
LIMIT 10
```
