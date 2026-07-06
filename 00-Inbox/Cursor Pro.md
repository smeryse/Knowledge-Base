---
tags:
  - cursor
  - ide
  - ai
  - machine_id
  - cli
  - bash
  - settings
  - reset
---
## Сброс настроек

Для сброса настроек Cursor Pro до значений по умолчанию используйте следующую команду:

```bash
rm -rf ~/.config/Cursor ~/.cursor ~/.cursor-viprc ~/Documents/.cursor-free-vip
```

## Сброс Machine ID

Для сброса Machine ID воспользуйтесь утилитой, выполнив следующие команды:

```bash
curl -fsSL https://raw.githubusercontent.com/yeongpin/cursor-free-vip/main/scripts/install.sh -o install.sh && chmod +x install.sh && ./install.sh
```
