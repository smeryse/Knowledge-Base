---
tags:
  - учеба
  - расписание
  - фи21-2
created: 2026-04-01
aliases:
  - Расписание
---
# 📚 Учебные материалы (ФИ21/2)

**4-й семестр, 2 курс** | **Весенний семестр 2025/2026**

---

# 📅 Динамическое расписание

```dataviewjs
// 🎓 Определение текущей недели (числитель/знаменатель)
const today = new Date();
const semesterStart = new Date('2026-02-02');

const weekNumber = Math.floor((today - semesterStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
const isNumerator = weekNumber % 2 === 1;
const weekText = isNumerator ? 'ЧИСЛИТЕЛЬ (I)' : 'ЗНАМЕНАТЕЛЬ (II)';
const weekColor = isNumerator ? '#3584e4' : '#e66100';

const schedule = {
  'Пн': [
    { time: '12:40 – 14:00', type: 'ЛК', subject: 'ВЕБ', room: '128' },
    { time: '14:10 – 15:30', type: 'ЛР', subject: 'КАСД', room: '102' },
    { time: '15:40 – 17:00', type: 'ЛР', subject: 'ОС', room: '107б' }
  ],
  'Вт': [
    { time: '14:10 – 15:30', type: 'ЛК', subject: 'ТВ', room: '128' },
    { time: '15:40 – 17:00', type: isNumerator ? 'ЛК' : 'ПР', subject: 'ЭКН', room: isNumerator ? '131' : '150' }
  ],
  'Ср': [
    { time: '11:10 – 12:30', type: 'ЛР', subject: 'ТВ', room: '105' },
    { time: '12:40 – 14:00', type: 'ЛК', subject: 'ТА', room: '129' },
    { time: '14:10 – 15:30', type: 'ЛК', subject: 'ОС', room: '129' },
    { time: '15:40 – 17:00', type: 'ЛР', subject: 'ВЕБ', room: '107б' }
  ],
  'Чт': [],
  'Пт': [
    { time: '08:00 – 09:20', type: isNumerator ? '—' : 'ЛР', subject: isNumerator ? '' : 'ФИЗИКА', room: isNumerator ? '' : '133' },
    { time: '09:30 – 10:50', type: isNumerator ? 'ЛК' : '—', subject: isNumerator ? 'ФИЗИКА' : '', room: isNumerator ? '131' : '' },
    { time: '11:10 – 12:30', type: 'ПР', subject: 'ФИЗ-РА', room: '—' },
    { time: '12:40 – 14:00', type: 'ЛР', subject: 'ВЕБ', room: '103' }
  ],
  'Сб': [
    { time: '08:00 – 09:20', type: 'ЛК', subject: 'КАСД', room: '128' },
    { time: '09:30 – 10:50', type: 'ЛР', subject: 'АНГ', room: '149' },
    { time: '11:10 – 12:30', type: 'ЛР', subject: 'КАСД', room: '102а' },
    { time: '12:40 – 14:00', type: 'ЛР', subject: 'ТА', room: '101' }
  ]
};

const timeSlots = ['08:00 – 09:20', '09:30 – 10:50', '11:10 – 12:30', '12:40 – 14:00', '14:10 – 15:30', '15:40 – 17:00'];
const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const daysFull = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

// Форматирование даты для ссылки на ежедневную заметку
function getDailyNoteLink(dayIndex) {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Вс, 1 = Пн, ...
  const targetDay = dayIndex + 1; // Пн = 1, Вт = 2, ...
  const diff = targetDay - currentDay;
  const nextOccurrence = new Date(today);
  nextOccurrence.setDate(today.getDate() + (diff >= 0 ? diff : diff + 7));
  const dateStr = nextOccurrence.toISOString().split('T')[0];
  return `[[Tasks/Daily/${dateStr}]]`;
}

dv.paragraph(`**Неделя:** <span style="color: ${weekColor}; font-weight: bold;">${weekText}</span>`);
dv.paragraph('---');

let html = '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
html += '<thead><tr style="background: var(--background-modifier-hover);">';
html += '<th style="padding: 8px; border: 1px solid var(--background-modifier-border); text-align: center;">Время</th>';
days.forEach((day, index) => {
  const link = getDailyNoteLink(index);
  html += `<th style="padding: 8px; border: 1px solid var(--background-modifier-border); text-align: center;"><a href="${link}" style="color: var(--text-normal); text-decoration: none;">${day}</a></th>`;
});
html += '</tr></thead><tbody>';

timeSlots.forEach(time => {
  html += '<tr>';
  html += `<td style="padding: 6px; border: 1px solid var(--background-modifier-border); text-align: center; font-weight: bold; font-size: 11px;">${time}</td>`;
  
  days.forEach(day => {
    const lessons = schedule[day];
    const lesson = lessons.find(l => l.time === time);
    
    if (lesson && lesson.type !== '—' && lesson.subject && lesson.subject !== '') {
      html += `<td style="padding: 6px; border: 1px solid var(--background-modifier-border); text-align: center; font-size: 11px;">`;
      html += `<strong>${lesson.type}</strong> ${lesson.subject}<br>`;
      html += `<span style="color: var(--text-muted);">${lesson.room}</span>`;
      html += '</td>';
    } else {
      html += `<td style="padding: 6px; border: 1px solid var(--background-modifier-border); text-align: center; color: var(--text-muted);">—</td>`;
    }
  });
  
  html += '</tr>';
});

html += '</tbody></table>';
dv.paragraph(html);
```

###### Условные обозначения:
- **ЛК** — Лекция | **ПР** — Практика | **ЛР** — Лабораторная
- **ВЕБ** — Программирование в компьютерных сетях
- **ОС** — Операционные системы
- **ТВ** — Теория вероятностей и статистические методы
- **ТА** — Теория алгоритмов и вычислительных процессов
- **ЭКН** — Экономика
- **ФИЗИКА** — Физические основы микроэлектроники
- **ФИЗ-РА** — Физическая культура и спорт
- **АНГ** — Иностранный язык
- **I/II** — Числитель/Знаменатель (указано в подробном расписании)

---

## 📖 Предметы
[[Study/ВЕБ/index|ВЕБ]] | [[Study/КАСД/index|КАСД]] | [[Study/ОС/index|ОС]] | [[Study/ТА/index|ТА]] | [[Study/ТВ/index|ТВ]]

---

## 📊 Дополнительно

- [[Аттестация]] — результаты сессий, аттестаций
- `schedule.json` — данные расписания для скриптов

[[00-main/Index|← На главную]]
