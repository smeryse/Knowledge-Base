module.exports = async function postponeTaskToTomorrow() {
    function notice(message, timeout = 5000) {
        new Notice(message, timeout);
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function getTomorrow(fileName) {
        const match = String(fileName).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;

        const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        date.setDate(date.getDate() + 1);
        return formatDate(date);
    }

    function buildDailyNote(date, taskLine) {
        return [
            "---",
            `date: ${date}`,
            "---",
            "",
            "## Задачи",
            "",
            "## Перенесенные задачи",
            taskLine,
            "",
            "---",
            "## Траты",
            "",
            "---",
            "## Накопления"
        ].join("\n");
    }

    function insertTransferredTask(content, taskLine) {
        const lines = String(content).split(/\r?\n/);
        const normalizedTask = taskLine.trim();

        if (lines.some((line) => line.trim() === normalizedTask)) {
            return { content, duplicated: true };
        }

        let sectionIndex = lines.findIndex((line) => line.trim() === "## Перенесенные задачи");

        if (sectionIndex === -1) {
            const tasksIndex = lines.findIndex((line) => /^##\s+Задачи(?:\s+на\s+сегодня)?\s*$/.test(line.trim()));

            if (tasksIndex !== -1) {
                let insertSectionIndex = tasksIndex + 1;
                while (insertSectionIndex < lines.length && lines[insertSectionIndex].trim() === "") {
                    insertSectionIndex += 1;
                }

                lines.splice(insertSectionIndex, 0, "", "## Перенесенные задачи", "");
                sectionIndex = insertSectionIndex + 1;
            } else {
                if (lines.length > 0 && lines[lines.length - 1].trim() !== "") {
                    lines.push("");
                }

                lines.push("## Перенесенные задачи", "");
                sectionIndex = lines.length - 2;
            }
        }

        let insertIndex = sectionIndex + 1;
        while (insertIndex < lines.length && lines[insertIndex].trim() === "") {
            insertIndex += 1;
        }

        lines.splice(insertIndex, 0, taskLine);
        return { content: lines.join("\n"), duplicated: false };
    }

    const editor = app.workspace.activeEditor?.editor;
    const file = app.workspace.getActiveFile();

    if (!editor || !file) {
        notice("Открой заметку с задачами в редакторе.");
        return "";
    }

    const tomorrow = getTomorrow(file.basename);
    if (!tomorrow || !file.path.startsWith("Tasks/Daily/")) {
        notice("Команда работает только в ежедневных заметках Tasks/Daily.");
        return "";
    }

    const lineNumber = editor.getCursor().line;
    const taskLine = editor.getLine(lineNumber);

    if (!/^\s*[-*]\s\[[ xX]\]\s+.+$/.test(taskLine)) {
        notice("Поставь курсор на строку с задачей.");
        return "";
    }

    if (/\[[xX]\]/.test(taskLine)) {
        notice("Выполненную задачу переносить не нужно.");
        return "";
    }

    const currentContent = await app.vault.read(file);
    const currentLines = currentContent.split(/\r?\n/);

    if (lineNumber >= currentLines.length) {
        notice("Не удалось прочитать текущую строку задачи.");
        return "";
    }

    const tomorrowPath = `Tasks/Daily/${tomorrow}.md`;
    const tomorrowFile = app.vault.getAbstractFileByPath(tomorrowPath);

    if (tomorrowFile) {
        const tomorrowContent = await app.vault.read(tomorrowFile);
        const updatedTomorrow = insertTransferredTask(tomorrowContent, taskLine);
        if (!updatedTomorrow.duplicated) {
            await app.vault.modify(tomorrowFile, updatedTomorrow.content);
        }
    } else {
        await app.vault.create(tomorrowPath, buildDailyNote(tomorrow, taskLine));
    }

    currentLines.splice(lineNumber, 1);
    await app.vault.modify(file, currentLines.join("\n"));

    notice(`Задача перенесена на ${tomorrow}.`);
    return "";
};
