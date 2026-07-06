# Dashboard

```dataviewjs
const modeFile = app.vault.getAbstractFileByPath("Projects/Crew/Mode.md");
let currentRole = "?";
if (modeFile) {
    const content = await app.vault.read(modeFile);
    const match = content.match(/\*\*([^*]+)\*\*/);
    if (match) currentRole = match[1];
}
dv.paragraph(`Текущая роль: **${currentRole}**`);
```

## Открытые тикеты
```dataview
TABLE WITHOUT ID
  file.link as Тикет,
  role as Роль,
  status as Статус,
  assignee as Исполнитель,
  timebox as Таймбокс
FROM "Projects/Crew"
WHERE type = "ticket" AND status != "done"
```

## Последние прерывания
```dataview
TABLE WITHOUT ID
  file.link as Прерывание,
  role as Роль,
  task as Задача
FROM "Projects/Crew/Interrupts"
SORT file.mtime DESC
LIMIT 5
```

---

Быстрые ссылки: [[Mode]] | [[Backlog]] | [[Interrupts]]
