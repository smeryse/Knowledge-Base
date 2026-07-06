# {{date:YYYY-MM-DD}}

> 📅 **День недели:** {{date:dddd}}
> 🎯 **Фокус дня:**

---

## 📅 События дня (Full Calendar)

```dataview
TABLE WITHOUT ID
  startTime as "Время",
  endTime as "Конец",
  title as "Событие",
  choice(completed = true, "✅", choice(completed = false, "❌", "⏳")) as "Статус"
FROM "Calendar"
WHERE date = date(this.file.file.name)
SORT startTime ASC
```

---

## Задачи на сегодня

### 🔴 Срочные
```tasks
not done
priority is highest
```

### Из активных проектов
```tasks
not done
priority is not highest
```

### Просроченные
```tasks
not done
due before today
```

---

## Завершённые сегодня

```tasks
done today
```

---

## В ожидании

```tasks
not done
tag includes #waiting
```

---

## Расписание

| Время | Задача | Статус |
| ----- | ------ | ------ |
| 09:00 |        | [ ]    |
| 10:00 |        | [ ]    |
| 11:00 |        | [ ]    |
| 12:00 |        | [ ]    |
| 13:00 | *Обед* |        |
| 14:00 |        | [ ]    |
| 15:00 |        | [ ]    |
| 16:00 |        | [ ]    |
| 17:00 |        | [ ]    |

---

## ✅ Выполнено

| Задача | Баллы | Время |
|--------|-------|-------|
| — | — | — |

**Итого за день:** **0** баллов

---

## 📊 Итоги дня

| Показатель | Значение |
|------------|----------|
| **Заработано баллов** | |
| **Потрачено баллов** | |
| **Баланс** | |
| **Выполнено задач** | |

---

## 📝 Заметки
>

---

## 🔗 Навигация
- [[Stats|📈 Статистика]]
- [[Shop|🎁 Магазин наград]]
- [[../01-Active|📁 Активные задачи]]

---

**Теги:** #daily #{{date:YYYY-MM}}
