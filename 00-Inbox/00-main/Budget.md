---
tags:
  - budget
  - finance
aliases:
  - Бюджет
---

# 💰 Бюджет

> **Распределение дохода:** 50% накопления | 30% обязательные | 20% свободные

---

## 📊 Сводка

```dataviewjs
let incomeTotal = 0;
let spentTotal = 0;

for (let page of dv.pages().where(p => p.file.path.startsWith("Tasks/Daily/"))) {
  try {
    const content = await dv.io.load(page.file.path);
    if (content && typeof content === "string") {
      const incomeMatches = [...content.matchAll(/- \[x\].*?\(\+(\d+)р\)/g)];
      incomeMatches.forEach(m => incomeTotal += parseInt(m[1]));
      const spentMatches = [...content.matchAll(/- \[x\].*?\(-(\d+)р\)/g)];
      spentMatches.forEach(m => spentTotal += parseInt(m[1]));
    }
  } catch (e) {}
}

const savings = Math.round(incomeTotal * 0.50);
const mandatory = Math.round(incomeTotal * 0.30);
const freePool = incomeTotal - savings - mandatory;
const freeRemaining = freePool - spentTotal;

dv.paragraph("**Доход:** " + incomeTotal.toLocaleString() + "р");
dv.table(["Категория", "Сумма"], [
  ["💰 Накопления (50%)", savings.toLocaleString() + "р"],
  ["🏠 Обязательные (30%)", mandatory.toLocaleString() + "р"],
  ["🎉 Свободные (20%)", freePool.toLocaleString() + "р"],
  ["Потрачено из свободных", "-" + spentTotal.toLocaleString() + "р"],
  ["Остаток свободных", freeRemaining.toLocaleString() + "р"]
]);
```

---

## 📈 Заработано vs Потрачено (по дням)

```dataviewjs
const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const earnedData = [0, 0, 0, 0, 0, 0, 0];
const spentData = [0, 0, 0, 0, 0, 0, 0];

for (let page of dv.pages().where(p => p.file.path.startsWith("Tasks/Daily/"))) {
  try {
    const content = await dv.io.load(page.file.path);
    if (content && typeof content === "string") {
      const dateMatch = page.file.name.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const date = new Date(dateMatch[1]);
        const dayIndex = (date.getDay() + 6) % 7;
        const earnedMatches = [...content.matchAll(/- \[x\].*?\(\+(\d+)р\)/g)];
        earnedMatches.forEach(m => earnedData[dayIndex] += parseInt(m[1]));
        const spentMatches = [...content.matchAll(/- \[x\].*?\(-(\d+)р\)/g)];
        spentMatches.forEach(m => spentData[dayIndex] += parseInt(m[1]));
      }
    }
  } catch (e) {}
}

dv.span("```chart\ntype: bar\nlabels:\n  - " + daysOfWeek.join("\n  - ") + "\nseries:\n  - label: Заработано\n    data: [" + earnedData.join(", ") + "]\n    color: \"#27AE60\"\n  - label: Потрачено\n    data: [" + spentData.join(", ") + "]\n    color: \"#E74C3C\"\nxOptions:\n  display: true\n  title: День недели\nyOptions:\n  display: true\n  title: Рубли\n  beginAtZero: true\n```");
```

---

## 📈 История доходов

| Дата | Источник | Сумма (р) |
|------|----------|-----------|
| —    | —        | —         |

---

## 📉 Траты из свободных

| Дата | На что | Сумма (р) | Баллы |
|------|--------|-----------|-------|
| —    | —      | —         | —     |

---

## 💡 Как пользоваться

### Записать доход:
```markdown
- [x] Работал (+5000р)
```

### Записать трату:
```markdown
- [x] Купил кофе (-20р)
```
Это спишет **20р из свободных** и **20 баллов**.

### Проверить баланс:
- **Баллы:** смотри [[Stats]]
- **Рубли:** эта страница

---

## ⚙️ Настройка распределения

Текущее: `50/30/20` (накопления/обязательные/свободные)

Чтобы изменить — поменяй коэффициенты в `Stats.md` (блок "Рубли").
