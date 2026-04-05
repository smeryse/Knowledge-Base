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

// === ОБРАЗ ДНЯ (автоматический) ===
const outfitsFile = app.vault.getAbstractFileByPath("Projects/Одежда/Образы.md");
if (outfitsFile) {
    const content = await app.vault.read(outfitsFile);
    const lines = content.split('\n');
    const outfits = [];
    let cat = '';
    let outfitCounter = 0;
    
    for (const line of lines) {
        if (!line.trim() || line.startsWith('#') || line.startsWith('| ---')) continue;
        const cells = line.split('|').map(c => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1);
        if (cells.length < 5) continue;
        
        // Пропускаем заголовок
        if (cells[0] === '№') continue;
        
        // Проверяем, это категория
        if (cells[0].includes('УЧЕБА') || cells[0].includes('ПРОГУЛКА') || cells[0].includes('ХОЛОДНАЯ') || cells[0].includes('ФОРМАЛЬНОЕ') || cells[0].includes('СПОРТ') || cells[0].includes('ДОМА') || cells[0].includes('СВИДАНИЕ') || cells[0].includes('КРЕАТИВ')) {
            cat = cells[0].replace(/\*\*/g, '').trim();
            continue;
        }
        
        // Пропускаем строки без situation (пустые строки между категориями)
        if (!cells[1] || cells[1] === '') continue;
        
        // Если нет номера — присваиваем следующий
        let id = cells[0];
        if (!id || isNaN(parseInt(id))) {
            outfitCounter++;
            id = outfitCounter.toString();
        } else {
            outfitCounter = parseInt(id);
        }
        
        outfits.push({ id, category: cat, situation: cells[1], top: cells[2], bottom: cells[3], shoes: cells[4], socks: cells[5], outerwear: cells[6], accessories: cells[7] });
    }
    
    const startOfYear = new Date(currentDate.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((currentDate - startOfYear) / (1000 * 60 * 60 * 24));
    const idx = (dayOfYear + dayOfWeek) % outfits.length;
    const outfit = outfits[idx] || outfits[0];
    
    if (outfit) {
        tR += `\n\n## 👔 Образ дня: ${outfit.situation || outfit.category}\n\n`;
        tR += `| Элемент | Вещи |\n|---------|------|\n`;
        if (outfit.top && outfit.top !== '—') tR += `| Верх | ${outfit.top} |\n`;
        if (outfit.bottom && outfit.bottom !== '—') tR += `| Низ | ${outfit.bottom} |\n`;
        if (outfit.shoes && outfit.shoes !== '—') tR += `| Обувь | ${outfit.shoes} |\n`;
        if (outfit.socks && outfit.socks !== '—') tR += `| Носки | ${outfit.socks} |\n`;
        if (outfit.outerwear && outfit.outerwear !== '—') tR += `| Верхняя одежда | ${outfit.outerwear} |\n`;
        if (outfit.accessories && outfit.accessories !== '—') tR += `| Аксессуары | ${outfit.accessories} |\n`;
        tR += `\n- [ ] Образ надет\n<!-- outfit-data: ${JSON.stringify(outfit)} -->\n`;
    }
}

tR += '\n---\n## Задачи\n';
%>
