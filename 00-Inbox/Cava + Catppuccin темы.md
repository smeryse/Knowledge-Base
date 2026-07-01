---
tags:
  - catpucchin
  - themes
---

## Структура конфигов

`~/.config/cava/config` — основной конфиг (teal)
`~/.config/cava/themes/` — все Catppuccin флейворы:
  mocha, latte, frappe, macchiato (+ transparent)

## Использование

| Название темы  | Описание             |
| -------------- | -------------------- |
| cava teal      | кастомный teal       |
| cava mocha     | Catppuccin Mocha     |
| cava latte     | Catppuccin Latte     |
| cava frappe    | Catppuccin Frappé    |
| cava macchiato | Catppuccin Macchiato |
| cava mocha-t   | Mocha прозрачный     |
| cava latte-t   | Latte прозрачный     |
## Как это работает
В `~/.zshrc` переопределена функция `cava()`.
Она проверяет первый аргумент и подставляет нужный
`-p ~/.config/cava/themes/<flavor>`.

## Как добавить свой конфиг

1. Создать файл в `~/.config/cava/themes/<name>`
2. Добавить кейс в функцию `cava()` в `~/.zshrc`
3. `source ~/.zshrc`