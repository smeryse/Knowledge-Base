---
aliases:
  - TODO
---
# 1
- Исправить назначенные хоткей обсидиан
- Разобрать  [[LifeOS/Кухня/Recipes/Паста болоньезе.md]]
- [[Study/Study-Tasks.md]]
- переписать wikilink. так как в скрипте некоректный синтаксис
 - понять зачем у заметок с type=pantry-item нужно поле source_receipt_item
- H. Binary в git
- Сделать LFS хранилище для книг и подкастов
- Добавить автоматическое добавление товара barcode resolver + openrouter на выходе 
- Исправить конфликт структур [[LifeOS/Кухня/Pantry/перец-черный-горошком-20.md]] и [[LifeOS/Кухня/Pantry/2026-04-27-заменитель-сахара-novasweet.md]] - наладить единую структуру сроков годности. Убрать мусорное поле локации
- Сделать base для всех

# 2 UI/UX и сумбурность
- Единый хаб LifeOS/Навигация.md — embed'ами
- Убрать даты из имён файлов в Pantry/Cooking Log (сейчас 2026-05-03-капуста...md). Дата уже есть в created/file.cday, а имя файла должно быть просто капуста-белокочанная.md. Это сократит длину путей и упростит поиск.
- (под вопросом) Цветовая маркировка проектов — CSS snippet, который красит ссылки [[LifeOS/Кухня/...]] в зелёный, [[LifeOS/Кошелек/...]] в синий. Визуально мозг разделяет домены.
- Bookmarks / Starred — закрепить 5-6 главных заметок в боковой панели (без плагинов, стандартный Obsidian bookmarks).
# 3
- почасовая система баллов. 
- исправить наследие когда система добавления денег была через (+100р). 
- Перевести систему с чеками на .base систему (вместо таблиц)
- Создать новый акк (Квота кончилась)

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

