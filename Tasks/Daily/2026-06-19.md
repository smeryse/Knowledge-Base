---
date: <% tp.date.now("YYYY-MM-DD") %>
---
<%*
const fileName = tp.file.title;
const isDailyNote = /^\d{4}-\d{2}-\d{2}$/.test(fileName);
if (!isDailyNote) return;

// === ДАТА И НЕДЕЛЯ ===
const semesterStart = new Date("2026-02-02");
const currentDate = new Date(fileName);
const diffDays = Math.floor((currentDate - semesterStart) / (1000 * 60 * 60 * 24));
const weekNumber = Math.floor(diffDays / 7) + 1;
const weekType = weekNumber % 2 === 1 ? "I" : "II";
const dayOfWeek = currentDate.getDay();
const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
tR += `**${dayNames[dayOfWeek]}** | **Неделя:** ${weekType} (неделя ${weekNumber})`;

// === ПРИВЫЧКИ ===
try {
    let habitsFile = app.vault.getAbstractFileByPath("Projects/Рабочий стол/Habits/List.md");
    if (!habitsFile) {
        habitsFile = app.vault.getFiles().find(f => f.path === "Projects/Рабочий стол/Habits/List.md");
    }
    if (habitsFile) {
        const habitsContent = await app.vault.read(habitsFile);
        const habitLines = habitsContent.split('\n').filter(line => line.trim().startsWith('- ['));
        
        const habits = [];
        for (const line of habitLines) {
            const keyMatch = line.match(/\[(\w+)\]/);
            const scoreMatch = line.match(/\(\+(\d+)\)/);
            if (keyMatch && scoreMatch) {
                const key = keyMatch[1];
                const name = line.replace(/^\s*-\s*\[[ x]\]\s*\[(\w+)\]\s*/, '').replace(/\s*\(\+\d+\)\s*$/, '').trim();
                habits.push({key, name, score: parseInt(scoreMatch[1])});
            }
        }
        
        const habitDir = "LifeOS/Привычки/Daily";
        if (!app.vault.getAbstractFileByPath(habitDir)) {
            await app.vault.createFolder(habitDir);
        }
        
        const habitFilePath = `${habitDir}/${fileName}.md`;
        if (!app.vault.getAbstractFileByPath(habitFilePath)) {
            const lines = ['---', `date: ${fileName}`, '---', ''];
            for (const h of habits) {
                lines.push(`- [ ] [${h.key}] ${h.name} (+${h.score})`);
            }
            await app.vault.create(habitFilePath, lines.join('\n'));
        }
    }
} catch (e) {
    tR += '/* Ошибка создания файла привычек: ' + e.message + ' */\n';
}
%>

---
## Задачи на сегодня

## Перенесенные задачи

---
## Привычки

![[LifeOS/Привычки/Daily/<% tp.file.title %>]]

```dataviewjs
const date = dv.current().file.name;
const habitText = await dv.io.load(`LifeOS/Привычки/Daily/${date}.md`);
let hCompleted = 0, hTotal = 0;
if (habitText) {
    const habitRegex = /-\s?\[([xX ])\]\s*\[(\w+)\].*?\(\+(\d+)\)/g;
    for (const match of habitText.matchAll(habitRegex)) {
        hTotal += parseInt(match[3]);
        if (match[1].toLowerCase() === 'x') hCompleted += parseInt(match[3]);
    }
}
const width = 25;
const filled = hTotal > 0 ? Math.round((hCompleted / hTotal) * width) : 0;
const percent = hTotal > 0 ? Math.round((hCompleted / hTotal) * 100) : 0;
const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
if (habitText) {
    dv.paragraph(`**Привычки:** \` ${bar} \` **${hCompleted}/${hTotal}** (${percent}%)`);
} else {
    dv.paragraph('*Файл привычек не найден — создай daily note через шаблон*');
}
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

for (const match of content.matchAll(rubleRegex)) {
    const rublePoints = Math.round(parseInt(match[2]) * 0.05);
    total += rublePoints;
    if (match[1].toLowerCase() === 'x') completed += rublePoints;
}

const date = dv.current().file.name;
const habitText = await dv.io.load(`LifeOS/Привычки/Daily/${date}.md`);
if (habitText) {
    const habitRegex = /-\s?\[([xX ])\]\s*\[(\w+)\].*?\(\+(\d+)\)/g;
    for (const match of habitText.matchAll(habitRegex)) {
        const score = parseInt(match[3]);
        total += score;
        if (match[1].toLowerCase() === 'x') completed += score;
    }
}

const width = 50;
const filled = total > 0 ? Math.round((completed / total) * width) : 0;
const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
dv.paragraph(`**Прогресс:** \` ${bar} \` **${completed}/${total}** (${percent}%)`);
```


---
## Траты

---
## Накопления