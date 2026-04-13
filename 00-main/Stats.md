## Баллы

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

for (let page of dv.pages().where(p => p.file.path.startsWith("Tasks/Daily/"))) {
  try {
    const content = await dv.io.load(page.file.path);
    if (content && typeof content === "string") {
      // Заработано: (+100) — только выполненные [x]
      const earnedMatches = [...content.matchAll(/- \[x\].*?\(\+(\d+)\)/g)];
      earnedMatches.forEach(m => earnedFromInline += parseInt(m[1]));

      // Потрачено: (-80) — только выполненные [x]
      const spentMatches = [...content.matchAll(/- \[x\].*?\(-(\d+)\)/g)];
      spentMatches.forEach(m => spentFromInline += parseInt(m[1]));

      // 5% от заработанных рублей → баллы
      const rubleMatches = [...content.matchAll(/- \[x\].*?\(\+(\d+)р\)/g)];
      rubleMatches.forEach(m => earnedFromInline += Math.round(parseInt(m[1]) * 0.05));
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
// 📊 Гистограмма: Заработано vs Потрачено (по дням недели)
// Показывает только ТЕКУЩУЮ неделю (Пн-Вс)

const today = new Date();
const dayOfWeek = (today.getDay() + 6) % 7;
const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek);
const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek + 6);

const weekLabel = `${monday.toLocaleDateString('ru-RU', {day:'2-digit', month:'short'})} — ${sunday.toLocaleDateString('ru-RU', {day:'2-digit', month:'short'})}`;

const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const earnedData = [0, 0, 0, 0, 0, 0, 0];
const spentData = [0, 0, 0, 0, 0, 0, 0];

const pad = n => String(n).padStart(2, '0');
const weekStart = `${monday.getFullYear()}-${pad(monday.getMonth()+1)}-${pad(monday.getDate())}`;
const weekEnd = `${sunday.getFullYear()}-${pad(sunday.getMonth()+1)}-${pad(sunday.getDate())}`;

for (let page of dv.pages().where(p => p.file.path.startsWith("Tasks/Daily/"))) {
  try {
    const content = await dv.io.load(page.file.path);
    if (content && typeof content === "string") {
      // Извлекаем дату из имени файла, а не из page.file.name
      const dateMatch = page.file.name.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const dateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        if (dateStr >= weekStart && dateStr <= weekEnd) {
          // Создаём дату локально, без timezone-проблем
          const year = parseInt(dateMatch[1]);
          const month = parseInt(dateMatch[2]) - 1;
          const day = parseInt(dateMatch[3]);
          const date = new Date(year, month, day);
          const dayIndex = (date.getDay() + 6) % 7;
          const earnedMatches = [...content.matchAll(/- \[x\].*?\(\+(\d+)\)/g)];
          earnedMatches.forEach(m => earnedData[dayIndex] += parseInt(m[1]));
          // 5% от рублей → баллы
          const rubleMatches = [...content.matchAll(/- \[x\].*?\(\+(\d+)р\)/g)];
          rubleMatches.forEach(m => earnedData[dayIndex] += Math.round(parseInt(m[1]) * 0.05));
          const spentMatches = [...content.matchAll(/- \[x\].*?\(-(\d+)\)/g)];
          spentMatches.forEach(m => spentData[dayIndex] += parseInt(m[1]));
        }
      }
    }
  } catch (e) {}
}

const totalEarned = earnedData.reduce((a,b) => a+b, 0);
const totalSpent = spentData.reduce((a,b) => a+b, 0);

dv.paragraph(`**📅 Неделя:** ${weekLabel} | **Заработано:** ${totalEarned} | **Потрачено:** ${totalSpent}`);

dv.span(`\`\`\`chart
type: bar
labels:
  - ${daysOfWeek.join('\n  - ')}
series:
  - label: Заработано
    data: [${earnedData.join(', ')}]
    color: "#27AE60"
  - label: Потрачено
    data: [${spentData.join(', ')}]
    color: "#E74C3C"
xOptions:
  display: true
  title: День недели
yOptions:
  display: true
  title: Баллы
  beginAtZero: true
\`\`\``);
```

---

## Рубли

```dataviewjs
// Парсим рубли из daily notes: (+N₽) заработано, (-NР) потрачено
let incomeTotal = 0;
let spentTotal = 0;

for (let page of dv.pages().where(p => p.file.path.startsWith("Tasks/Daily/"))) {
  try {
    const content = await dv.io.load(page.file.path);
    if (content && typeof content === "string") {
      // Заработано: (+5000р)
      const incomeMatches = [...content.matchAll(/- \[x\].*?\(\+(\d+)р\)/g)];
      incomeMatches.forEach(m => incomeTotal += parseInt(m[1]));
      
      // Потрачено: (-280р)
      const spentMatches = [...content.matchAll(/- \[x\].*?\(-(\d+)р\)/g)];
      spentMatches.forEach(m => spentTotal += parseInt(m[1]));
    }
  } catch (e) {}
}

// Распределение
const savings = Math.round(incomeTotal * 0.50);
const mandatory = Math.round(incomeTotal * 0.30);
const freePool = incomeTotal - savings - mandatory;
const freeRemaining = freePool - spentTotal;

dv.table(
  ["Показатель", "Сумма"],
  [
    ["**Всего заработано**", `${incomeTotal.toLocaleString()}р`],
    ["💰 Накопления (50%)", `${savings.toLocaleString()}р`],
    ["🏠 Обязательные (30%)", `${mandatory.toLocaleString()}р`],
    ["🎉 Свободные (20%)", `${freePool.toLocaleString()}р`],
    ["**Потрачено из свободных**", `-${spentTotal.toLocaleString()}р`],
    ["**Остаток свободных**", `${freeRemaining.toLocaleString()}р`]
  ]
);

// Прогресс-бар свободных
const pct = freePool > 0 ? Math.max(0, Math.round((freeRemaining / freePool) * 100)) : 0;
const barLen = 30;
const filled = Math.max(0, Math.round((pct / 100) * barLen));
const bar = freeRemaining < 0 ? '░'.repeat(barLen) : '█'.repeat(filled) + '░'.repeat(barLen - filled);
dv.paragraph(`\n**Свободные:** \`${bar}\` ${pct}%${freeRemaining < 0 ? ' ⚠️ В МИНУСЕ!' : ''}`);
```

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
// 📊 GitHub-style активность (синяя палитра)
const files = app.vault.getMarkdownFiles();
const activity = {};
const today = new Date();
const daysToShow = 365;

// Определение темы (светлая/тёмная)
const isDarkTheme = document.body.classList.contains('theme-dark');

// GNOME Blue: #3584e4
// Цвета для тёмной темы (в стиле GNOME)
const darkColors = ['#1e1e1e', '#2a4a6e', '#3d6a9e', '#3584e4', '#62a0ea', '#99c1f1'];
// Цвета для светлой темы (в стиле GNOME)
const lightColors = ['#ffffff', '#dbe4f0', '#b3c7e3', '#62a0ea', '#3584e4', '#1a5fb4'];

const colors = isDarkTheme ? darkColors : lightColors;
const textColor = isDarkTheme ? 'var(--text-normal)' : '#1a1a1a';
const mutedColor = isDarkTheme ? 'var(--text-muted)' : '#666666';

// Инициализация массива активности
for (let i = daysToShow - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    activity[dateStr] = 0;
}

// Подсчёт активности по датам (по дате модификации файла)
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

// Преобразование в массив для рендеринга
const activityArray = [];
for (let i = daysToShow - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    activityArray.push({ date, count: activity[dateStr] || 0 });
}

const maxCount = Math.max(...activityArray.map(d => d.count), 1);

function getColor(count) {
    if (count === 0) return colors[0];
    const ratio = count / maxCount;
    if (ratio > 0.8) return colors[5];
    if (ratio > 0.6) return colors[4];
    if (ratio > 0.4) return colors[3];
    if (ratio > 0.2) return colors[2];
    return colors[1];
}

// Группировка по неделям
const weeks = {};
for (let i = 0; i < activityArray.length; i++) {
    const weekNum = Math.floor(i / 7);
    const dayInWeek = i % 7;
    if (!weeks[weekNum]) weeks[weekNum] = [];
    weeks[weekNum][dayInWeek] = activityArray[i];
}

// Рендеринг HTML
let html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">`;
html += `<h4 style="margin: 0 0 16px 0; color: ${textColor}; font-size: 16px; text-align: center;">Активность</h4>`;
html += `<div style="display: flex; align-items: flex-start; gap: 4px; overflow-x: auto; padding: 8px 0; justify-content: center;">`;

// Дни недели
html += `<div style="display: flex; flex-direction: column; gap: 3px; flex-shrink: 0;">`;
html += `<div style="height: 10px; font-size: 9px; color: ${mutedColor}; line-height: 10px;">Пн</div>`;
html += `<div style="height: 10px; font-size: 9px; color: ${mutedColor}; line-height: 10px;">Вт</div>`;
html += `<div style="height: 10px; font-size: 9px; color: ${mutedColor}; line-height: 10px;">Ср</div>`;
html += `<div style="height: 10px; font-size: 9px; color: ${mutedColor}; line-height: 10px;">Чт</div>`;
html += `<div style="height: 10px; font-size: 9px; color: ${mutedColor}; line-height: 10px;">Пт</div>`;
html += `<div style="height: 10px; font-size: 9px; color: ${mutedColor}; line-height: 10px;">Сб</div>`;
html += `<div style="height: 10px; font-size: 9px; color: ${mutedColor}; line-height: 10px;">Вс</div>`;
html += '</div>';

// Недели
html += '<div style="display: flex; gap: 3px; flex-shrink: 0;">';
Object.keys(weeks).forEach(weekNum => {
    html += '<div style="display: grid; grid-template-rows: repeat(7, 1fr); gap: 3px;">';
    for (let day = 0; day < 7; day++) {
        const dayData = weeks[weekNum][day];
        const color = getColor(dayData?.count || 0);
        const dateStr = dayData?.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        html += `<div style="width: 10px; height: 10px; background: ${color}; border-radius: 2px; cursor: pointer;" title="${dateStr}: ${dayData?.count || 0}"></div>`;
    }
    html += '</div>';
});
html += '</div></div>';

// Легенда
html += `<div style="display: flex; justify-content: center; align-items: center; gap: 4px; margin-top: 12px; font-size: 11px; color: ${mutedColor}; flex-wrap: wrap;">`;
html += '<span>Меньше</span>';
html += `<div style="width: 10px; height: 10px; background: ${colors[0]}; border: 1px solid ${mutedColor}; border-radius: 2px;"></div>`;
html += `<div style="width: 10px; height: 10px; background: ${colors[1]}; border-radius: 2px;"></div>`;
html += `<div style="width: 10px; height: 10px; background: ${colors[2]}; border-radius: 2px;"></div>`;
html += `<div style="width: 10px; height: 10px; background: ${colors[3]}; border-radius: 2px;"></div>`;
html += `<div style="width: 10px; height: 10px; background: ${colors[4]}; border-radius: 2px;"></div>`;
html += `<div style="width: 10px; height: 10px; background: ${colors[5]}; border-radius: 2px;"></div>`;
html += '<span>Больше</span>';
html += '</div></div>';

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

const colors = ["#0A62EE", "#2A76EF", "#4A8AF0", "#6A9EF1", "#8AB3F2", "#A9C8F3", "#C9DDF4", "#E8F2F6"];
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

    return `<path d="${d}" fill="${color}"/>`;
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
