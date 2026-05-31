---
role: ux
status: backlog
assignee: 
acceptance:
  - "Tasks/Waiting.md удалён"
  - "Projects/Рабочий стол/ и всё внутри удалено"
  - "Tasks/.qwen-task-rules.md удалён"
  - "Tasks/update_progress.py удалён"
  - "Tasks/Board.md перенесён или удалён"
  - "Созданы Tasks/Tasks.md, Tasks/Active.md, Tasks/Inbox.md"
  - "Все текущие задачи из Waiting раскиданы: важное в Active, остальное удалено"
  - "Habits перенесены из Рабочий стол/Habits/ в Tasks/Habits/ (или удалены)"
timebox: 1h
---

# Схлопнуть систему задач до Inbox → Active → Daily

## Проблема

Система задач размазана по 5+ местам: Waiting.md, Рабочий стол/, Habits/, Board.md, .qwen-task-rules, update_progress.py. Хаос, ничего не работает.

## Решение

Удалить всё лишнее, оставить минимум:

```
Tasks/
├── Tasks.md         — точка входа
├── Active.md        — 5-10 активных задач
├── Inbox.md         — быстрый сброс
└── Daily/           — ежедневки (как есть)
```

Правила:
- Inbox → раз в неделю разобрать, важное в Active, остальное удалить
- Active — только то, что реально делается. Не больше 10
- Daily — задачи на сегодня из Active
- Habits можно перенести в Tasks/Habits/ одним файлом, если нужны
- Никаких баллов, схем, Kanban, прогресс-баров

## Что удалить
- [ ] Tasks/Waiting.md
- [ ] Projects/Рабочий стол/ (всё целиком)
- [ ] Tasks/.qwen-task-rules.md
- [ ] Tasks/update_progress.py
- [ ] Tasks/Board.md (если не нужен)

## Что создать
- [ ] Tasks/Tasks.md
- [ ] Tasks/Active.md
- [ ] Tasks/Inbox.md
