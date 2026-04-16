# Главная

> **Добро пожаловать в вашу базу знаний!**
> Главное правило этого хранилища: **Сначала созидай - потом организуй**

## Быстрые ссылки

| Файл | Описание |
|------|----------|
| [[Stats]] | Дашборд с графиками и статистикой |
| [[Balance-Lever]] | Рычаг баланса — настройка коэффициента баллов |
| [[Shop]] | Магазин наград — трата баллов |
| [[Pipeline]] | Рабочий pipeline — процесс работы |
| [[Tag Base]] | База тегов — управление тегами |

---

## Быстрый обзор

```dataviewjs
const totalFiles = dv.pages().length;
const today = new Date().toISOString().split('T')[0];
const dailyNote = dv.page(`Tasks/Daily/${today}`);
const tasksDone = dv.pages('"Tasks"').where(p => p.file.tasks?.completed).length;

dv.table(
  ["Показатель", "Значение"],
  [
    ["**Всего заметок**", totalFiles],
    ["**Ежедневная заметка**", dailyNote ? "[[Tasks/Daily/" + today + "|Открыть]]" : "Не создана"],
    ["**Выполнено задач**", tasksDone]
  ]
);
```

---

## Разделы

| Название                            | Описание                      |
| ----------------------------------- | ----------------------------- |
| [[Личный дневник]]                  | Личные записи и мысли         |
| [[Tasks/Daily\|Ежедневные заметки]] | Планирование дня              |
| [[Tasks\|Задачи]]                   | Управление задачами           |
| [[Books\|Книги]]                    | Конспекты и заметки по книгам |
| [[Study\|Учёба]]                    | Учебные материалы             |
| [[Projects\|Проекты]]               | Проектная документация        |
| [[Instructions\|Инструкции]]        | Гайды и инструкции            |

---

## Активные проекты

```dataview
TABLE file.mtime as "Обновлено"
FROM "Projects"
WHERE file.name != "Index"
SORT file.mtime DESC
LIMIT 5
```

---

## Последние заметки

```dataview
TABLE file.mtime as "Изменён"
FROM ""
WHERE !contains(file.folder, ".obsidian") AND !contains(file.folder, ".git")
SORT file.mtime DESC
LIMIT 10
```

---

**Теги:** #home #index
