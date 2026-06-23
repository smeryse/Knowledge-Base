---
tags:
  - linux
  - terminal
  - music
---
### 1. **cmus** — оптимальный выбор для старта
- Малый, быстрый, мощный. Поддерживает FLAC, MP3, OGG, M4A и др.
- Управление с клавиатуры, интуитивный ncurses-интерфейс.
- Установка:  
  ```bash
  sudo apt install cmus
  cmus  # запуск
  ```
- Базовые команды: `:add /путь/к/музыке`, `c` — play/pause, `x` — play, `v` — stop, `b/n` — следующий/предыдущий трек. [[2]][[3]]

### 2. **ncmpcpp** + **mpd** — для продвинутых
- ncmpcpp — клиент для MPD (Music Player Daemon). Разделение сервера и интерфейса.
- Гибкая настройка, визуализатор, поддержка плейлистов, тегов, обложек.
- Установка:  
  ```bash
  sudo apt install mpd ncmpcpp
  mpd  # запуск демона
  ncmpcpp  # запуск интерфейса
  ```
- Требует настройки `~/.config/mpd/mpd.conf` и `~/.config/ncmpcpp/config`. [[8]][[9]]

### 3. **termusic** — современный, с обложками и подкастами
- Написан на Rust. Поддержка обложек (Kitty/Sixel), подкастов, тег-редактор, бэкенды: MPV, GStreamer.
- Установка (через сторонний репозиторий для актуальной версии): [[1]]
  ```bash
  curl -sS https://debian.griffo.io/EA0F721D231FDD3A0A17B9AC7808B4DD62C41256.asc | sudo gpg --dearmor --yes -o /etc/apt/trusted.gpg.d/debian.griffo.io.gpg
  echo "deb https://debian.griffo.io/apt $(lsb_release -sc 2>/dev/null) main" | sudo tee /etc/apt/sources.list.d/debian.griffo.io.list
  sudo apt update && sudo apt install termusic
  ```

### 4. **moc** (Music On Console) — простой и надёжный
- Двухпанельный интерфейс, похож на Midnight Commander.
- Установка: `sudo apt install moc`
- Запуск: `mocp` [[8]][[14]]

### 5. **mpg123** / **sox** — только для воспроизведения, без интерфейса
- Для скриптов или быстрого прослушивания одного файла.
- Установка: `sudo apt install mpg123 sox`
- Использование: `mpg123 файл.mp3` или `play файл.mp3` [[7]][[15]]

---

**Рекомендация:** начни с **cmus** — минимальная настройка, максимум функционала. Если понадобится визуализация, обложки или подкасты — переходи на **termusic**. Если нужна максимальная гибкость и фоновая работа — связка **mpd + ncmpcpp**.

Все пакеты есть в репозиториях Ubuntu, кроме termusic (требует добавления внешнего репо для свежей версии).