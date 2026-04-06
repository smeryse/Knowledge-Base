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
## Задачи

---
## Траты

---
## Накопления