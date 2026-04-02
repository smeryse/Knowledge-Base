// Templater скрипт для получения расписания на день

module.exports = async function getSchedule() {
    // Дата начала семестра
    const semesterStart = new Date("2026-02-02");
    
    // Получаем текущую дату (или дату из имени файла)
    const fileName = tp.file.title;
    let currentDate = new Date();
    
    // Пытаемся извлечь дату из имени файла (формат YYYY-MM-DD)
    const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
        currentDate = new Date(dateMatch[1]);
    }
    
    // Вычисляем номер недели от начала семестра
    const diffTime = currentDate.getTime() - semesterStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;
    
    // Определяем тип недели: нечётная = I (числитель), чётная = II (знаменатель)
    const weekType = weekNumber % 2 === 1 ? "I" : "II";
    
    // Получаем день недели (0 = воскресенье, 1 = понедельник, ...)
    const dayOfWeek = currentDate.getDay();
    
    // Загружаем расписание из JSON
    const scheduleFile = app.vault.getAbstractFileByPath("Study/schedule.json");
    if (!scheduleFile) {
        return "❌ Файл расписания не найден";
    }
    
    const scheduleContent = await app.vault.read(scheduleFile);
    const schedule = JSON.parse(scheduleContent);
    
    // Получаем расписание на текущий день
    const daySchedule = schedule.days[dayOfWeek.toString()];
    
    if (!daySchedule || daySchedule.classes.length === 0) {
        return `*${daySchedule?.name || "Выходной"} — нет занятий*\n\n**Неделя:** ${weekType} (неделя ${weekNumber})`;
    }
    
    // Фильтруем пары по неделе
    const todayClasses = daySchedule.classes.filter(cls => {
        if (!cls.week) return true; // Пары каждую неделю
        return cls.week === weekType; // Только для текущей недели
    });
    
    if (todayClasses.length === 0) {
        return `*${daySchedule.name} — нет занятий на этой неделе*\n\n**Неделя:** ${weekType} (неделя ${weekNumber})`;
    }
    
    // Формируем вывод
    let output = `**${daySchedule.name}** | **Неделя:** ${weekType} (неделя ${weekNumber})\n\n`;
    output += `| Время | Тип | Предмет | Преподаватель | Аудитория |\n`;
    output += `|-------|-----|---------|---------------|-----------|\n`;
    
    for (const cls of todayClasses) {
        output += `| ${cls.time} | ${cls.type} | ${cls.subject} | ${cls.teacher} | ${cls.room} |\n`;
    }
    
    return output;
}
