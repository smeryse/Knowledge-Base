

```dataviewjs
const tagsByLetter = {};

for (const file of dv.pages().file) {
    if (file.tags) {
        for (const tag of file.tags) {
            const cleanTag = tag.replace('#', '');
            const firstLetter = cleanTag[0].toLowerCase();
            
            if (!firstLetter.match(/[a-zа-яё]/)) continue; 

            if (!tagsByLetter[firstLetter]) {
                tagsByLetter[firstLetter] = new Set();
            }
            tagsByLetter[firstLetter].add(cleanTag);
        }
    }
}

const rows = Object.entries(tagsByLetter)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([letter, tagsSet]) => {
        // Сортируем теги и объединяем в одну строку через запятую
        const sortedTags = Array.from(tagsSet).sort().map(t => `#${t}`).join('');
        return [sortedTags];
    });

dv.table(['Теги'], rows);
```
