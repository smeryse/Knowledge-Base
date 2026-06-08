# Assistant Bot — Личный помощник

## Подключение к серверу

```bash
ssh smeryse@weaselcloud
```

Пароль: `smeryse2026` (если запросит sudo)

## Архитектура

- **Код**: `/opt/assistant-bot/bot.py`
- **Модули**:
  - `config.py` — чтение токенов из env
  - `obsidian.py` — работа с Obsidian vault
  - `barcode_scanner.py` — сканер штрихкодов
  - `receipt_api.py` — API чеков
  - `ai_normalize.py` — AI-нормализатор
- **Виртуальное окружение**: `/opt/assistant-bot/.venv/`
- **Obsidian vault**: `/opt/assistant-bot/vault/`
- **Сервис**: `assistant-bot.service` (systemd)
- **Юзер**: `assistant-bot` (system user, не для входа)
- **Логи**: `sudo journalctl -u assistant-bot -n 50`

## Настройки

```bash
sudo nano /etc/secrets/assistant-bot.env
```

Содержит:
- `BOT_TOKEN` — токен Telegram бота
- `VAULT_PATH` — путь к vault
- `ADMIN_ID` — Telegram ID админа
- `OPENROUTER_API_KEY` — ключ OpenRouter
- `DEV_MODE` — false (боевой режим)

## Управление

```bash
sudo systemctl restart assistant-bot   # перезапустить
sudo systemctl stop assistant-bot      # остановить
sudo systemctl start assistant-bot     # запустить
sudo systemctl status assistant-bot    # статус
```

## Важно

- Токены только в `/etc/secrets/assistant-bot.env` (root:root, 600)
- Не запускать от root
- Логи HTTP запросов подавлены (токены не светятся)
