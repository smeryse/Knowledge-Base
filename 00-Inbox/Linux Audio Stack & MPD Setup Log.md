
**Дата:** 2026-03-25
**Статус:** #in_progress
**Теги:** #linux #audio #mpd #pipewire #systemd #flatpak

## 1. Архитектура звука
- **PipeWire**: Мультимедийный сервер (замена PulseAudio + JACK).
- **PulseAudio**: Легаси звуковой сервер. PipeWire эмулирует его API через `pipewire-pulse`.
- **MPD (Music Player Daemon)**: Демон, управляющий воспроизведением.
  - **Клиент**: Euphonica (подключается к MPD по сети/localhost).
  - **Декодирование**: Выполняет MPD (проверка: `mpd --version | grep flac`).
  - **Вывод**: Через плагин `type "pipewire"` (версия MPD 0.23+) или `type "pulse"`.

## 2. Конфигурация MPD (`~/.config/mpd/mpd.conf`)
| Параметр | Значение | Назначение |
|----------|----------|------------|
| `music_directory` | `/data/Media/Music` | Хранилище контента (структура: Artist/Album) |
| `playlist_directory` | `~/.config/mpd/playlists` | Списки воспроизведения |
| `db_file` | `~/.config/mpd/database` | Индекс библиотеки |
| `bind_to_address` | `localhost` | Только локальные подключения |
| `port` | `6600` | Порт сервера |
| `audio_output` | `type "pipewire"` | Вывод звука |

**Важно:**
- Пути с `~` работают только в **user-mode** systemd.
- После добавления музыки обязательно: `mpc update`.
- Права на папки: `chown -R $USER:$USER ~/.config/mpd/`.

## 3. Systemd (User Service)
- **Запуск:** `systemctl --user start mpd`
- **Статус:** `systemctl --user status mpd`
- **Логи:** `journalctl --user -u mpd.service --no-pager -n 20`
- **Ошибка "Failed to bind"**: Порт занят предыдущим процессом. Решение: `killall -9 mpd`.

## 4. Flatpak vs Native
- **Flatpak**:
  - Изоляция (песочница).
  - Большей объем (рантаймы, драйверы GL).
  - Очистка: `flatpak uninstall --unused`.
  - Доступ к файлам: Ограничен `xdg-music`. Для `/data` нужен `flatpak override --filesystem=...`.
- **Native (Build from source)**:
  - Зависимости: `vala`, `meson`, `libgtk-4-dev`, `libgstreamer...`.
  - Сборка: `meson setup build`, `ninja -C build`, `sudo ninja -C build install`.
  - Обновление: Вручную через `git pull`.

## 5. Pending Tasks
- [x] Решить: Flatpak или сборка Gapless из исходников. ✅ 2026-03-25
- [ ] Проверить теги в библиотеке FLAC (Artist/Album).
- [x] Настроить доступ Euphonica к `/data/Media/Music`. ✅ 2026-03-25