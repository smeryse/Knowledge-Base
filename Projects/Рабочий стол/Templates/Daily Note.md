---
date: <% tp.date.now("YYYY-MM-DD") %>
---
<%*
const fileName = tp.file.title;
const isDailyNote = /^\d{4}-\d{2}-\d{2}$/.test(fileName);
if (!isDailyNote) return;

// === РАСПИСАНИЕ ===
const semesterStart = new Date("2026-02-02");
const currentDate = new Date(fileName);
const diffDays = Math.floor((currentDate - semesterStart) / (1000 * 60 * 60 * 24));
const weekNumber = Math.floor(diffDays / 7) + 1;
const weekType = weekNumber % 2 === 1 ? "I" : "II";
const dayOfWeek = currentDate.getDay();
const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

const scheduleFile = app.vault.getAbstractFileByPath("Study/schedule.json");
if (scheduleFile) {
    const schedule = JSON.parse(await app.vault.read(scheduleFile));
    const daySchedule = schedule.days[dayOfWeek.toString()];
    
    if (daySchedule && daySchedule.classes.length > 0) {
        const todayClasses = daySchedule.classes.filter(c => !c.week || c.week === weekType);
        tR += `**${dayNames[dayOfWeek]}** | **Неделя:** ${weekType} (неделя ${weekNumber})\n\n`;
        tR += `| Время | Тип | Предмет | Преподаватель | Аудитория |\n|-------|-----|---------|---------------|-----------|\n`;
        for (const cls of todayClasses) {
            tR += `| ${cls.time} | ${cls.type} | ${cls.subject} | ${cls.teacher} | ${cls.room} |\n`;
        }
    } else {
        tR += `*${dayNames[dayOfWeek]} — нет занятий* | **Неделя:** ${weekType}`;
    }
}
%>

---
## Задачи на сегодня

## Перенесенные задачи

---
## Привычки

<%*
try {
    let habitsFile = app.vault.getAbstractFileByPath("Projects/Рабочий стол/Habits/List.md");
    if (!habitsFile) {
        habitsFile = app.vault.getFiles().find(f => f.path === "Projects/Рабочий стол/Habits/List.md");
    }
    if (habitsFile) {
        const habitsContent = await app.vault.read(habitsFile);
        const habitLines = habitsContent.split('\n').filter(line => line.trim().startsWith('- ['));
        const resetLines = habitLines.map(line => line.replace(/^(\s*-\s*)\[[xX ]\]/, '$1[ ]'));
        tR += resetLines.join('\n') + '\n';
    } else {
        tR += '*Привычки: файл List.md не найден*\n';
    }
} catch (e) {
    tR += '*Привычки: ошибка загрузки — ' + e.message + '*\n';
}
%>

```dataviewjs
const file = dv.current().file.path;
const content = await dv.io.load(file);
const afterHabits = content.split('## Привычки')[1] || '';
const nextHeader = afterHabits.search(/^## /m);
const habitsPart = nextHeader > -1 ? afterHabits.slice(0, nextHeader) : afterHabits;

const taskRegex = /-\s?\[([xX ])\].*?\(\+(\d+)\)/g;
let hCompleted = 0, hTotal = 0;

for (const match of habitsPart.matchAll(taskRegex)) {
    hTotal += parseInt(match[2]);
    if (match[1].toLowerCase() === 'x') hCompleted += parseInt(match[2]);
}

const width = 25;
const filled = hTotal > 0 ? Math.round((hCompleted / hTotal) * width) : 0;
const percent = hTotal > 0 ? Math.round((hCompleted / hTotal) * 100) : 0;
const bar = '█'.repeat(filled) + '░'.repeat(width - filled);

dv.paragraph(`**Привычки:** \` ${bar} \` **${hCompleted}/${hTotal}** (${percent}%)`);
```

---
## Общий прогресс

```dataviewjs
const file = dv.current().file.path;
const content = await dv.io.load(file);

const taskRegex = /-\s?\[([xX ])\].*?\(\+(\d+)\)/g;
const rubleRegex = /-\s?\[([xX ])\].*?\(\+(\d+)р\)/g;
let completed = 0, total = 0;

for (const match of content.matchAll(taskRegex)) {
    total += parseInt(match[2]);
    if (match[1].toLowerCase() === 'x') completed += parseInt(match[2]);
}

// 5% от заработанных рублей → баллы
for (const match of content.matchAll(rubleRegex)) {
    const rublePoints = Math.round(parseInt(match[2]) * 0.05);
    total += rublePoints;
    if (match[1].toLowerCase() === 'x') completed += rublePoints;
}

const width = 50;
const filled = Math.round((completed / total) * width);
const percent = Math.round((completed / total) * 100);
const bar = '█'.repeat(filled) + '░'.repeat(width - filled);

dv.paragraph(`**Прогресс:** \` ${bar} \` **${completed}/${total}** (${percent}%)`);
```


---
## Траты

---
## Накопления
