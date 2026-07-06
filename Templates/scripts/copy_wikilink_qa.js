module.exports = async () => {
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice("Нет активного файла");
        return;
    }
    const wikilink = `[[${activeFile.basename}]]`;
    await navigator.clipboard.writeText(wikilink);
    new Notice(`Скопировано: ${wikilink}`);
};
