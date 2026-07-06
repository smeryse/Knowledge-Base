module.exports = async function copyWikilink(tp) {
    const title = tp.file.title;
    const wikilink = `[[${title}]]`;
    await navigator.clipboard.writeText(wikilink);
    new Notice(`Скопировано: ${wikilink}`);
};
