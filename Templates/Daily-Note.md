## Расписание

<%*
    // Дата начала семестра
    const semesterStart = new Date("2026-02-02");
    
    // Получаем дату из имени файла
    const fileName = tp.file.title;
    let currentDate = new Date();
    
    const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
        currentDate = new Date(dateMatch[1]);
    }
    
    // Вычисляем номер недели
    const diffTime = currentDate.getTime() - semesterStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;
    const weekType = weekNumber % 2 === 1 ? "I" : "II";
    
    // День недели
    const dayOfWeek = currentDate.getDay();
    const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    
    // Загружаем расписание
    const scheduleFile = app.vault.getAbstractFileByPath("Study/schedule.json");
    if (!scheduleFile) {
        tR += "❌ Файл расписания не найден";
    } else {
        const scheduleContent = await app.vault.read(scheduleFile);
        const schedule = JSON.parse(scheduleContent);
        const daySchedule = schedule.days[dayOfWeek.toString()];
        
        if (!daySchedule || daySchedule.classes.length === 0) {
            tR += `*${dayNames[dayOfWeek]} — нет занятий*\n\n**Неделя:** ${weekType} (неделя ${weekNumber})`;
        } else {
            const todayClasses = daySchedule.classes.filter(cls => {
                if (!cls.week) return true;
                return cls.week === weekType;
            });
            
            if (todayClasses.length === 0) {
                tR += `*${dayNames[dayOfWeek]} — нет занятий на этой неделе*\n\n**Неделя:** ${weekType} (неделя ${weekNumber})`;
            } else {
                tR += `**${dayNames[dayOfWeek]}** | **Неделя:** ${weekType} (неделя ${weekNumber})\n\n`;
                tR += `| Время | Тип | Предмет | Преподаватель | Аудитория |\n`;
                tR += `|-------|-----|---------|---------------|-----------|\n`;
                
                for (const cls of todayClasses) {
                    tR += `| ${cls.time} | ${cls.type} | ${cls.subject} | ${cls.teacher} | ${cls.room} |\n`;
                }
            }
        }
    }
%>
## Задачи


## 🔥 Активные проекты

```dataview
TABLE status, priority, points, due
FROM "Projects"
WHERE contains(status, "active") OR status = "active"
SORT priority ASC
```

```dataviewjs
const file = dv.current().file.path;
const content = await dv.io.load(file);

const taskRegex = /-\s?\[([xX ])\].*?\(\+(\d+)\)/g;
let completed = 0, total = 0;

for (const match of content.matchAll(taskRegex)) {
    total += parseInt(match[2]);
    if (match[1].toLowerCase() === 'x') completed += parseInt(match[2]);
}

const width = 50;
const filled = Math.round((completed / total) * width);
const percent = Math.round((completed / total) * 100);
const bar = '█'.repeat(filled) + '░'.repeat(width - filled);

dv.paragraph(`**Прогресс:** \` ${bar} \` **${completed}/${total}** (${percent}%)`);
```

> [!NOTE] Заметки
> 
