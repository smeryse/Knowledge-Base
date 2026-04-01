## Задачи и монетки

```dataviewjs
// Ищем файлы в Completed (отдельные задачи-файлы с frontmatter points)
const completedPages = dv.pages().where(p => p.file.path.startsWith("Tasks/02-Completed/"));
const earnedFromFiles = completedPages.points.sum() ?? 0;

// Ищем покупки в Rewards (отдельные файлы с frontmatter spent)
const shopPages = dv.pages().where(p => p.file.path.startsWith("Tasks/Rewards/"));
const spentFromFiles = shopPages.spent.sum() ?? 0;

// Ищем inline-задачи в Daily Note по паттерну "(+N)" и "(-N)"
let earnedFromInline = 0;
let spentFromInline = 0;

for (let page of dv.pages().where(p => p.file.path.startsWith("Tasks/00-Daily/"))) {
  try {
    const content = await dv.io.load(page.file.path);
    if (content && typeof content === "string") {
      // Заработано: (+100) — только выполненные [x]
      const earnedMatches = [...content.matchAll(/- \[x\].*?\(\+(\d+)\)/g)];
      earnedMatches.forEach(m => earnedFromInline += parseInt(m[1]));
      
      // Потрачено: (-80) — только выполненные [x]
      const spentMatches = [...content.matchAll(/- \[x\].*?\(-(\d+)\)/g)];
      spentMatches.forEach(m => spentFromInline += parseInt(m[1]));
    }
  } catch (e) {
    // Игнорируем ошибки чтения
  }
}

const earned = earnedFromFiles + earnedFromInline;
const spent = spentFromFiles + spentFromInline;
const balance = earned - spent;

dv.table(
  ["Показатель", "Значение"],
  [
    ["**Всего заработано**", earned],
    ["**Всего потрачено**", spent],
    ["**Текущий баланс**", balance]
  ]
);
```

```dataviewjs
// Собираем данные по дням
const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const earnedData = [0, 0, 0, 0, 0, 0, 0];
const spentData = [0, 0, 0, 0, 0, 0, 0];

// Обработка Daily Note
for (let page of dv.pages().where(p => p.file.path.startsWith("Tasks/00-Daily/"))) {
  try {
    const content = await dv.io.load(page.file.path);
    if (content && typeof content === "string") {
      const dateMatch = page.file.name.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const date = new Date(dateMatch[1]);
        const dayIndex = (date.getDay() + 6) % 7;
        
        // Только выполненные [x]
        const earnedMatches = [...content.matchAll(/- \[x\].*?\(\+(\d+)\)/g)];
        earnedMatches.forEach(m => earnedData[dayIndex] += parseInt(m[1]));
        
        const spentMatches = [...content.matchAll(/- \[x\].*?\(-(\d+)\)/g)];
        spentMatches.forEach(m => spentData[dayIndex] += parseInt(m[1]));
      }
    }
  } catch (e) {}
}

// Выводим график
const chartConfig = `type: line
labels:
  - ${daysOfWeek.join('\n  - ')}
series:
  - label: Заработано
    data: [${earnedData.join(', ')}]
    fill: false
  - label: Потрачено
    data: [${spentData.join(', ')}]
    fill: false
xOptions:
  display: true
  title: День недели
yOptions:
  display: true
  title: Баллы`;

dv.span('```chart\n' + chartConfig + '\n```');
```


---

## Файлы 

```dataviewjs
const files = dv.pages().file;
const folders = files.map(f => f.folder).distinct().length;
const tags = dv.pages().file.tags.distinct().length;

dv.table(
    ["Показатель", "Значение"],
    [
        ["**Всего файлов**", files.length],
        ["**Всего папок**", folders],
        ["**Всего тегов**", tags]
    ]
);
```

```dataviewjs
const files = app.vault.getMarkdownFiles();
const activity = {};
const today = new Date();
const daysToShow = 215;

for (let i = daysToShow - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    activity[dateStr] = 0;
}

for (const file of files) {
    const stat = app.metadataCache.getFileCache(file.path);
    let dateStr;

    if (stat?.frontmatter?.date) {
        dateStr = String(stat.frontmatter.date).split('T')[0];
    }

    if (!dateStr || !activity.hasOwnProperty(dateStr)) {
        const mtime = new Date(file.stat.mtime);
        dateStr = mtime.toISOString().split('T')[0];
    }

    if (activity.hasOwnProperty(dateStr)) {
        activity[dateStr]++;
    }
}

const maxCount = Math.max(...Object.values(activity), 1);
const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function getColor(count) {
    if (count === 0) return '#242424';
    const ratio = count / maxCount;
    if (ratio > 0.8) return '#C084FC';
    if (ratio > 0.6) return '#9333EA';
    if (ratio > 0.4) return '#6B21A8';
    if (ratio > 0.2) return '#2E1065';
    return '#2E1065';
}

let html = '<div style="overflow-x: auto; font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center;">';
html += '<div style="display: flex; justify-content: center; margin-bottom: 8px;">';
html += '<div style="width: 50px;"></div>';
html += '<div style="display: flex; gap: 3px;">';

let currentMonth = -1;
for (let i = daysToShow - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const month = date.getMonth();
    if (month !== currentMonth) {
        html += `<span style="font-size: 10px; color: #8b949e; min-width: 30px;">${months[month]}</span>`;
        currentMonth = month;
    }
}
html += '</div></div>';

html += '<div style="display: flex; justify-content: center; align-items: flex-start;">';
html += '<div style="display: flex; flex-direction: column; gap: 3px; margin-right: 8px;">';
days.forEach(day => {
    html += `<div style="height: 10px; font-size: 9px; color: #8b949e; line-height: 10px;">${day}</div>`;
});
html += '</div>';

html += '<div style="display: grid; grid-template-rows: repeat(7, 1fr); gap: 3px;">';
const weeks = {};
for (let i = daysToShow - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const weekDay = date.getDay();
    const weekNum = Math.floor((daysToShow - i) / 7);

    if (!weeks[weekNum]) weeks[weekNum] = {};
    weeks[weekNum][weekDay] = { date: dateStr, count: activity[dateStr] };
}

for (let day = 1; day <= 7; day++) {
    html += '<div style="display: flex; gap: 3px;">';
    for (let week = 0; week < Object.keys(weeks).length; week++) {
        const cell = weeks[week][day];
        const count = cell ? cell.count : 0;
        const date = cell ? cell.date : '';
        const color = getColor(count);
        html += `<div style="width: 10px; height: 10px; background: ${color}; border-radius: 2px;" title="${date}: ${count} файлов"></div>`;
    }
    html += '</div>';
}

html += '</div></div></div>';

html += '<div style="display: flex; justify-content: center; align-items: center; gap: 4px; margin-top: 8px; font-size: 11px; color: #8b949e;">';
html += '<span>Меньше</span>';
html += '<div style="width: 10px; height: 10px; background: #161220; border-radius: 2px;"></div>';
html += '<div style="width: 10px; height: 10px; background: #2E1065; border-radius: 2px;"></div>';
html += '<div style="width: 10px; height: 10px; background: #6B21A8; border-radius: 2px;"></div>';
html += '<div style="width: 10px; height: 10px; background: #9333EA; border-radius: 2px;"></div>';
html += '<div style="width: 10px; height: 10px; background: #C084FC; border-radius: 2px;"></div>';
html += '<span>Больше</span>';
html += '</div>';

dv.paragraph(html);
```

```dataviewjs
const data = [
    { label: "Archive", value: 27 },
    { label: "Linux", value: 12 },
    { label: "AI", value: 6 },
    { label: "DJ", value: 5 },
    { label: "Obsidian", value: 4 },
    { label: "OpSec", value: 3 },
    { label: "Music", value: 3 },
    { label: "Прочее", value: 10 }
];

const colors = ["#161220", "#2E1065", "#6B21A8", "#9333EA", "#C084FC", "#A855F7", "#7C3AED", "#5B21B6"];
const total = data.reduce((sum, d) => sum + d.value, 0);

const width = 300;
const height = 300;
const centerX = width / 2;
const centerY = height / 2;
const radius = 100;
const innerRadius = 50;
const gapAngle = 0.05;

function polarToCartesian(cx, cy, r, angle) {
    return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
    };
}

function createArc(cx, cy, outerR, innerR, startAngle, endAngle, color) {
    const start1 = polarToCartesian(cx, cy, outerR, startAngle);
    const end1 = polarToCartesian(cx, cy, outerR, endAngle);
    const start2 = polarToCartesian(cx, cy, innerR, startAngle);
    const end2 = polarToCartesian(cx, cy, innerR, endAngle);

    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    const d = [
        `M ${start1.x} ${start1.y}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${end1.x} ${end1.y}`,
        `L ${end2.x} ${end2.y}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${start2.x} ${start2.y}`,
        'Z'
    ].join(' ');

    return `<path d="${d}" fill="${color}" stroke="#1F2223" stroke-width="2"/>`;
}

let currentAngle = -Math.PI / 2;
let svg = `<svg viewBox="0 0 ${width} ${height}" style="max-width: 300px; display: block; margin: 0 auto;">`;

data.forEach((d, i) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI - gapAngle;
    svg += createArc(centerX, centerY, radius, innerRadius, currentAngle, currentAngle + sliceAngle, colors[i % colors.length]);
    currentAngle += sliceAngle + gapAngle;
});

svg += '</svg>';

// Легенда
let legend = '<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 16px;">';
data.forEach((d, i) => {
    legend += `<div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #8b949e;">`;
    legend += `<div style="width: 12px; height: 12px; background: ${colors[i % colors.length]}; border-radius: 2px;"></div>`;
    legend += `${d.label} (${d.value})`;
    legend += `</div>`;
});
legend += '</div>';

dv.paragraph(svg + legend);
```

```dataviewjs
const tags = {};
for (const file of dv.pages().file) {
    if (file.tags) {
        for (const tag of file.tags) {
            const cleanTag = tag.replace('#', '');
            tags[cleanTag] = (tags[cleanTag] || 0) + 1;
        }
    }
}

const sorted = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 15);

dv.table(['Тег', 'Файлов'], sorted.map(([tag, count]) => [`#${tag}`, count]));
```

```dataviewjs
const folders = {};
for (const file of dv.pages().file) {
    const folder = file.folder;
    folders[folder] = (folders[folder] || 0) + 1;
}

const sorted = Object.entries(folders).sort((a, b) => b[1] - a[1]);

dv.table(['Папка', 'Файлов'], sorted);
```

```dataviewjs
const files = dv.pages().file.sort(f => f.mtime, 'desc').slice(0, 10);

const rows = files.map(f => [
    f.link,
    f.mtime ? f.mtime.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
]);

dv.table(['Файл', 'Изменён'], rows);
```
