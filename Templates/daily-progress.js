<%*
// Скрипт для Templater - обновляет прогресс-бар задач
const file = app.workspace.getActiveFile();
const content = await app.vault.read(file);

// Парсим задачи с баллами
const taskRegex = /-\s?\[([xX ])\].*?\(\+(\d+)\)/g;
const rubleRegex = /-\s?\[([xX ])\].*?\(\+(\d+)р\)/g;
let completed = 0;
let total = 0;

for (const match of content.matchAll(taskRegex)) {
    const isCompleted = match[1].toLowerCase() === 'x';
    const points = parseInt(match[2]);
    total += points;
    if (isCompleted) completed += points;
}

// 5% от заработанных рублей → баллы
for (const match of content.matchAll(rubleRegex)) {
    const isCompleted = match[1].toLowerCase() === 'x';
    const rublePoints = Math.round(parseInt(match[2]) * 0.05);
    total += rublePoints;
    if (isCompleted) completed += rublePoints;
}

// Создаём прогресс-бар
const width = 50;
const filled = total > 0 ? Math.round((completed / total) * width) : 0;
const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
const progressBar = `**Прогресс:** \` ${bar} \` **${completed}/${total}** (${percent}%)`;

// Удаляем старый прогресс-бар и вставляем новый
let newContent = content.replace(/\n\*\*Прогресс:\*\*.*?\n/g, '\n');
newContent = newContent.replace(/(## Заметки)/, `\n${progressBar}\n\n$1`);

await app.vault.modify(file, newContent);
tR = `✅ Прогресс: ${completed}/${total} (${percent}%)`;
%>
