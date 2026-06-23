---
tags:
  - linux
  - gnome
  - hanabi
  - troubleshooting
  - обои
created: 2026-04-30
status: 🔧 в процессе
---

# Исправление чёрного экрана в Hanabi

## 📋 Текущее состояние

- [x] Hanabi уже включён
- [x] Видео для обоев: `/data/01-Personal/Media/Pictures/Wallpapers/BAD_ENDING_FUNK_Danganronpa_Edit-4OCQhg5UTTQ.mp4`
- [x] Путь к расширению: `/home/smeryse/.local/share/gnome-shell/extensions/hanabi-extension@jeffshee.github.io`

---

## 🔍 Диагностика

### Как открыть настройки Hanabi
```bash
gnome-extensions prefs hanabi-extension@jeffshee.github.io
```

### Причина чёрного экрана
В логах обнаружено отсутствие пакетов introspection для GStreamer:
- `GstPlay`
- `GstAudio`

Из-за этого Hanabi переключается на fallback `GtkMediaFile`, который не справляется с `.mp4`.

### Отсутствующие пакеты
```
gir1.2-gst-plugins-base-1.0
gir1.2-gst-plugins-bad-1.0
```

---

## 🛠️ Решение

### Команда для установки
```bash
sudo apt install gir1.2-gst-plugins-base-1.0 gir1.2-gst-plugins-bad-1.0
```

### После установки
1. [ ] Выключить Hanabi
2. [ ] Включить Hanabi снова
3. [ ] При необходимости — перелогиниться

---

## ✅ Проверка результата

- [ ] Чёрный экран исчез
- [ ] Видео воспроизводится корректно
- [ ] Нет ошибок в `journalctl -f` при переключении обоев

---

## 📎 Ссылки

- [[Настройка GNOME]]
- [[Полезные расширения GNOME]]
- [[Troubleshooting Linux]]

> [!NOTE]
> Если проблема сохранится — проверить логи:  
> `journalctl -f | grep hanabi`  
> или  
> `gnome-extensions list --details hanabi-extension@jeffshee.github.io`
```

Заметка готова. Теги и чеклисты помогут отслеживать статус, а блок `> [!NOTE]` выделит важные команды для дальнейшей отладки, если фикс не сработает с первого раза.