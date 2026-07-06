---
role: ux
status: backlog
assignee: 
acceptance:
  - "ПКМ по файлу показывает только нужные пункты (Open, Rename, Delete, Copy)"
  - "Пункты плагинов (Templater, Kanban и др.) скрыты"
timebox: 1h
---

# Почистить контекстное меню в Obsidian

## Проблема

При ПКМ по файлу в Obsidian много лишних пунктов от плагинов. Мешает, отвлекает.

## Решение

Два варианта:
1. В настройках каждого плагина отключить "Add file context menu options"
2. CSS snippet: `.menu-item:has(.menu-item-title:contains("Templater")) { display: none; }`

Сначала проверить настройки, если не помогает — CSS.
