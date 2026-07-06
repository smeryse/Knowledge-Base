# Серверная архитектура weaselcloud

```text
IP: 45.148.127.9
OS: Ubuntu 24.04
SSH: порт 22, вход только по ключу (юзер smeryse)
```

## Сетевые сервисы

| Порт | Сервис | Назначение |
|---|---|---|
| 22 | SSH | Доступ к серверу |
| 80 | Caddy | HTTP редирект на HTTPS |
| 443 | HAProxy | TCP-роутер (VLESS/REALITY + forward proxy) |
| 8080 | Nginx | Default page |
| 9090 | Nginx | Reverse proxy на openedu.kubsu.ru |
| 3000 | Caddy | Admin API |
| 5000 | Flask (отключён) | WebChat (бывший) |
| 8444 | Caddy | Forward proxy (basic auth) |
| 8443 | Xray | VLESS+REALITY (www.microsoft.com) |
| 2053 | Xray | gRPC |
| 11111 | Xray | Metrics |
| 39261 | X-UI | Панель управления VPN |
| 2012-2022 | mita | Прокси-туннель |

## Пользователи системы

| Юзер | Назначение |
|---|---|
| `smeryse` | Администратор (sudo без пароля) |
| `assistant-bot` | Запуск Assistant Bot |
| `dl-bot` | Запуск DL Bot |
| `mita` | Служебный (mita proxy) |
| `haproxy` | Служебный (HAProxy) |

## Боты

| Бот | Сервис | Юзер | Токен в |
|---|---|---|---|
| Assistant Bot | `assistant-bot.service` | `assistant-bot` | `/etc/secrets/assistant-bot.env` |
| DL Bot | `dl-bot.service` | `dl-bot` | `/etc/secrets/dl-bot.env` |
| X-UI Bot | встроен в X-UI | root | `/etc/x-ui/x-ui.db` |

## Обновление токенов

1. Зайти на сервер: `ssh smeryse@weaselcloud`
2. Отредактировать файл: `sudo nano /etc/secrets/имя_бота.env`
3. Перезапустить бота: `sudo systemctl restart имя_бота`

## Просмотр логов

```bash
sudo journalctl -u assistant-bot -n 50   # последние 50 строк
sudo journalctl -u dl-bot -f             # следить в реальном времени
```

## Важно

- Токены во всех env-файлах доступны только root
- Сервисы запущены от своих пользователей (не root)
- Root SSH отключён
- HAProxy решает куда направлять трафик по SNI (www.microsoft.com → Xray, smeryse.online → Caddy)
