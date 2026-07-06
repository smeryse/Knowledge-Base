module.exports = async (params) => {
    const activeFile = params.app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice("Нет активного файла");
        return;
    }
    const wikilink = `[[${activeFile.basename}]]`;
    const { clipboard } = window.require("electron");
    clipboard.writeText(wikilink);
    new Notice(`Скопировано: ${wikilink}`);
};
