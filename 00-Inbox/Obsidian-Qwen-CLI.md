---
tags:
  - obsidian
  - ai-tools
  - cli
  - automation
---

# Запуск Qwen Code в терминале Obsidian

## Цель
Автоматический запуск Qwen Code CLI в терминале Obsidian с контекстом базы знаний.

## Варианты настройки

### Вариант 1: Скрипт-обёртка

**Файл:** `.qwen/obsidian-chat.sh`

```bash
#!/bin/bash
cd "$(dirname "$0")/.."
qwen --include-directories "$(pwd)"
```

**Использование:**
```bash
./.qwen/obsidian-chat.sh
```

**Права:**
```bash
chmod +x .qwen/obsidian-chat.sh
```

---

### Вариант 2: Алиас в shell

Добавить в `~/.bashrc` или `~/.zshrc`:

```bash
alias qobs='cd /data/Knowledge/Knowledge_Base && qwen'
```

**Использование:**
```bash
qobs
```

---

### Вариант 3: Прямой запуск

Если терминал Obsidian открывается в корне базы знаний:

```bash
qwen
```

Qwen Code автоматически видит контекст текущей директории.

---

## Плагины Obsidian для работы с терминалом

| Плагин | Описание |
|--------|----------|
| **Obsidian Terminal** | Встроенный терминал в Obsidian |
| **Shell Commands** | Выполнение shell-команд из палитры |
| **QuickAdd** | Быстрое выполнение скриптов |

### Настройка Obsidian Terminal

1. Settings → Community plugins → Browse → установить "Terminal"
2. Открыть терминал (`Ctrl+P` → "Terminal: Open terminal")
3. Выполнить: `./.qwen/obsidian-chat.sh` или просто `qwen`

---

## Контекст папок

По умолчанию Qwen видит текущую директорию. Для указания конкретных папок:

```bash
qwen --include-directories "10-Tech,00-Inbox"
```

Или в скрипте:
```bash
qwen --include-directories "$(pwd)/10-Tech"
```

---

## Полезные команды Qwen Code

| Команда | Описание |
|---------|----------|
| `qwen` | Интерактивный режим |
| `qwen "запрос"` | Одноразовый запрос |
| `qwen -p "запрос"` | Prompt mode |
| `qwen -i "запрос"` | Prompt + интерактивный режим |
| `qwen --help` | Справка |

---

## Ссылки

- [[Obsidian Hotkeys]]
- [[CLI Tools]]
- [[AI Assistants]]

---
**Дата создания:** 2026-03-31
**Теги:** #obsidian #qwen #cli #automation
