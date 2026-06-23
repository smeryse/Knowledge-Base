# ⚙️ Настройка Obsidian для Tasks System

## ✅ Настройки применены автоматически

Следующие файлы конфигурации уже созданы:

| Файл | Назначение |
|------|------------|
| `.obsidian/daily-notes.json` | Папка и шаблон для Daily Notes |
| `.obsidian/templates.json` | Папка с шаблонами |
| `.obsidian/tasks.json` | Настройки плагина Tasks |
| `.obsidian/graph.json` | Исключения для графа (задачи не засоряют) |

---

## 🔄 Что нужно сделать вручную

### 1. Перезагрузи Obsidian
**Command Palette → Reload app** или закрой и открой снова

### 2. Проверь настройки Daily Notes
**Settings → Daily Notes** — убедись, что:
- **Folder:** `Tasks/00-Daily`
- **Template:** `Tasks/Templates/Daily-Note-Dataview`

### 3. Включи плагины (если не включены)
**Settings → Community plugins**

| Плагин | Статус |
|--------|--------|
| Dataview | ✅ Включён |
| Tasks | ✅ Включён |
| Calendar | ✅ Включён |
| Obsidian Charts | ✅ Включён |

### 4. Проверь работу
1. Нажми на иконку **Daily Note** в левой панели
2. Должна открыться/создаться заметка в `Tasks/00-Daily/`
3. Шаблон должен примениться автоматически

---

## 🗓️ Если используешь Full Calendar

**Settings → Full Calendar**

| Параметр | Значение |
|----------|----------|
| **Default folder for new notes** | `Tasks/00-Daily` |
| **Template for new notes** | `Tasks/Templates/Daily-Note-Dataview` |

---

## 🎯 Как это работает теперь

1. **Кнопка Daily Note** → создаёт заметку в `Tasks/00-Daily/` с шаблоном
2. **Full Calendar** → при создании заметки из календаря тоже применяет шаблон
3. **Граф знаний** → завершённые задачи скрыты, не засоряют связи

Готово! 🎉
