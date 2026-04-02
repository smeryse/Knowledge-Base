---
tags:
  - system
  - rewards
  - config
aliases:
  - Рычаг Баланса
  - Коэффициент
---

# ⚖️ Рычаг Бареля

> **Единая точка настройки** системы баллов. Меняй коэффициент → все награды пересчитываются автоматически.

---

## 🎚️ Настройка коэффициента

```yaml
BALANCE_MULTIPLIER: 4.0
```


## 🎁 Таблица всех наград

```dataviewjs
// ============================================
// 🎚️ НАСТРОЙКИ
// ============================================

// Базовые цены наград (в баллах)
const rewards = {
  material: [
    { name: "Халва / сладость", base: 25 },
    { name: "Кофе в вузе", base: 20 },
    { name: "Ромовая баба в вузе", base: 25 },
    { name: "Пицца / доставка", base: 70 },
    { name: "Ресторан / кафе", base: 100 },
    { name: "Покупка до 500₽", base: 180 },
    { name: "Покупка до 1000₽", base: 350 },
    { name: "Покупка до 3000₽", base: 900 },
    { name: "Книга", base: 150 },
    { name: "Подписка (месяц)", base: 150 },
    { name: "Гаджет / техника", base: 1500 }
  ],
  nonMaterial: [
    { name: "Посмотреть фильм", base: 100 },
    { name: "Серия сериала (2-3 эп.)", base: 60 },
    { name: "Видеоигра (1-2 часа)", base: 80 },
    { name: "Прогулка / хобби", base: 40 },
    { name: "Выходной от учёбы", base: 180 },
    { name: "Сон без будильника", base: 60 },
    { name: "Массаж / СПА", base: 250 },
    { name: "Спорт / тренировка", base: 50 },
    { name: "Медитация / йога", base: 40 }
  ]
};

// ============================================
// 🔧 ЧТЕНИЕ КОЭФФИЦИЕНТА
// ============================================

// Пытаемся прочитать коэффициент из frontmatter этой заметки
let multiplier = 1.0;
try {
  const file = app.vault.getAbstractFileByPath("00-main/Balance-Lever.md");
  if (file) {
    const content = await app.vault.read(file);
    const match = content.match(/BALANCE_MULTIPLIER:\s*([\d.]+)/);
    if (match) {
      multiplier = parseFloat(match[1]);
    }
  }
} catch (e) {
  console.error("Не удалось прочитать коэффициент:", e);
}

// Округление до 5
function roundTo5(num) {
  return Math.round(num / 5) * 5;
}

// ============================================
// 📊 ОТРИСОВКА ТАБЛИЦЫ
// ============================================

function renderTable(rewardsList, category) {
  let html = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">`;
  
  // Заголовок
  html += `<thead>
    <tr style="background: var(--background-modifier-hover);">
      <th style="padding: 10px; border: 1px solid var(--background-modifier-border); text-align: left;">Награда</th>
      <th style="padding: 10px; border: 1px solid var(--background-modifier-border); text-align: center;">Базовая</th>
      <th style="padding: 10px; border: 1px solid var(--background-modifier-border); text-align: center;">× ${multiplier} (текущая)</th>
    </tr>
  </thead>`;
  
  // Тело таблицы
  html += `<tbody>`;
  rewardsList.forEach(item => {
    const dynamicPrice = roundTo5(item.base * multiplier);
    html += `
    <tr>
      <td style="padding: 8px; border: 1px solid var(--background-modifier-border);">${item.name}</td>
      <td style="padding: 8px; border: 1px solid var(--background-modifier-border); text-align: center; color: var(--text-muted);">${item.base}</td>
      <td style="padding: 8px; border: 1px solid var(--background-modifier-border); text-align: center; font-weight: bold;">${dynamicPrice}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  
  return html;
}

// ============================================
// 💰 МАТЕРИАЛЬНЫЕ
// ============================================

dv.paragraph("### 💰 Материальные (требуют денег)");
dv.paragraph(renderTable(rewards.material, "material"));

// ============================================
// 🎭 НЕМАТЕРИАЛЬНЫЕ
// ============================================

dv.paragraph("### 🎭 Нематериальные (не требуют денег)");
dv.paragraph(renderTable(rewards.nonMaterial, "nonMaterial"));

// ============================================
// 📊 ИНФО
// ============================================

dv.paragraph(`
> **🎚️ Текущий коэффициент:** \`${multiplier}\`  
> **📝 Чтобы изменить:** открой заметку, измени \`BALANCE_MULTIPLIER\` в блоке YAML выше, сохрани и перезагрузи заметку.
`);
```

---

## 📐 Как работает

**Формула:**
```
Динамическая цена = Базовая цена × BALANCE_MULTIPLIER
```

**Пример для пиццы (база 70 баллов) при коэффициенте 1.5:**
```
70 × 1.5 = 105 баллов
```

---

## 🔄 Как менять коэффициент

1. Открой эту заметку
2. Найди блок вверху:
   ```yaml
   BALANCE_MULTIPLIER: 1.0
   ```
3. Измени на нужное значение (например, `1.5`)
4. **Сохраните файл** (`Ctrl+S`)
5. **Перезагрузи заметку** (закрой и открой снова, или `Ctrl+R`)
6. Таблица выше **автоматически пересчитается**!

**Рекомендация:** Меняй не чаще 1 раза в неделю. Давай системе время на адаптацию.

---

## 📊 История изменений

| Дата | Коэффициент | Причина изменения |
|------|-------------|-------------------|
| 2026-04-01 | 1.0 | Initial setup |

---

## 🤖 Для AI

> **Правило:** При оценке задач и наград всегда умножай базовые баллы на `BALANCE_MULTIPLIER`. Округляй до 5.

**Пример:**
- Награда: «Пицца» (база: 70 баллов)
- Коэффициент: 1.5
- Итог: 70 × 1.5 = **105 баллов**

---

## 📈 Когда менять коэффициент

### Понизить (↓):
	- [ ] Баллы накапливаются слишком быстро
	- [ ] Награды покупаются без усилий
	- [ ] Пропал вызов / азарт
	- [ ] Слишком много «лёгких» задач

### Повысить (↑):
	- [ ] Невозможно накопить на награды
	- [ ] Пропала мотивация выполнять задачи
	- [ ] Слишком высокие требования к себе
	- [ ] Стресс / выгорание

---

## 🎯 Целевой баланс

**Идеальный ритм:**
- 1-2 награды в неделю (средние)
- 1 крупная награда в месяц
- Баланс растёт медленно, но стабильно

Если не попадаешь в ритм → корректируй коэффициент.
