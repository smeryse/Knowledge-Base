# DL Bot — Universal Media Downloader

## Подключение к серверу

```bash
ssh smeryse@weaselcloud
```

Пароль: `smeryse2026` (если запросит sudo)

## Архитектура

- **Код**: `/opt/dl-bot/bot.py`
- **Библиотеки**: python-telegram-bot, yt-dlp, spotdl, gallery-dl
- **Виртуальное окружение**: `/opt/dl-bot/.venv/`
- **Сервис**: `dl-bot.service` (systemd)
- **Юзер**: `dl-bot` (system user, не для входа)
- **Логи**: `sudo journalctl -u dl-bot -n 50`

## Что умеет

- Скачивать видео/аудио с YouTube
- Скачивать с TikTok (видео и фото)
- Скачивать с Instagram
- Поиск и скачивание музыки (Spotify)
- Конвертация аудио в голосовые сообщения

## Настройки

```bash
sudo nano /etc/secrets/dl-bot.env
```

Содержит:
- `TELEGRAM_BOT_TOKEN` — токен Telegram бота

## Управление

```bash
sudo systemctl restart dl-bot      # перезапустить
sudo systemctl stop dl-bot         # остановить
sudo systemctl start dl-bot        # запустить
sudo systemctl status dl-bot       # статус
```

## Важно

- Токен только в `/etc/secrets/dl-bot.env` (root:root, 600)
- yt-dlp и другие утилиты лежат в `.venv/bin/`
- Шебанги скриптов указывают на `/opt/dl-bot/.venv/bin/python3`
