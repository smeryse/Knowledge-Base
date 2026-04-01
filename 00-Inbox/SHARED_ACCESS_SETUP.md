# Настройка общего доступа к файлам между ОС

## Структура разделов

| Раздел | ФС | UUID | Метка | Размер | Доступ |
|--------|-----|------|-------|--------|--------|
| nvme0n1p1 | vfat | 3217-0888 | UEFISHELL | 1G | Все ОС (только чтение для безопасности) |
| nvme0n1p2 | ext4 | f4ed886a-62a3-478a-99f7-52857aedb208 | Data | 40G | **Ubuntu ↔ Arch** |
| nvme0n1p3 | ext4 | 4162c730-0750-4549-8233-334ac2c684a4 | arch | 70G | Ubuntu ↔ Arch |
| nvme0n1p4 | ntfs | 63C4D43F4E46E4CA | windows | 155G | **Все ОС** |
| nvme0n1p5 | ext4 | c8149c83-e92a-470a-ae4c-72aefbe1a7e1 | — | 210G | Ubuntu (корень) |

---

## 1. Раздел `/data` (общий для Ubuntu и Arch)

Этот раздел уже подключен в Ubuntu. Нужно настроить его для Arch.

### В Ubuntu ✅ (уже настроено)
```bash
# Проверить
mount | grep /data
# Должно быть: /dev/nvme0n1p2 on /data type ext4
```

### В Arch Linux
Создать точку монтирования и добавить в fstab:

```bash
# Создать точку монтирования
sudo mkdir -p /data

# Добавить в /etc/fstab (от root)
echo 'UUID=f4ed886a-62a3-478a-99f7-52857aedb208  /data  ext4  defaults  0  2' | sudo tee -a /etc/fstab

# Смонтировать
sudo mount /data

# Дать доступ пользователю (замените username на ваш логин в Arch)
sudo chown username:username /data
```

---

## 2. Раздел Windows (NTFS) — общий для всех ОС

⚠️ **Важно:** Если Windows использовала быстрый запуск (Fast Startup), раздел будет смонтирован только для чтения. Для записи нужно в Windows отключить быстрый запуск.

### В Ubuntu ✅ (уже настроено)
```bash
# Раздел смонтирован в /mnt/windows
ls -la /mnt/windows
```

**В fstab добавлено:**
```
UUID=63C4D43F4E46E4CA  /mnt/windows  ntfs-3g  ro,defaults,uid=1000,gid=1000,umask=022  0  0
```

### В Arch Linux
```bash
# Установить драйвер NTFS (если нет)
sudo pacman -S ntfs-3g

# Создать точку монтирования
sudo mkdir -p /mnt/windows

# Добавить в /etc/fstab
echo 'UUID=63C4D43F4E46E4CA  /mnt/windows  ntfs-3g  defaults,uid=1000,gid=1000,umask=022  0  0' | sudo tee -a /etc/fstab

# Смонтировать
sudo mount /mnt/windows
```

### В Windows
Раздел доступен автоматически как диск `D:` (или другая буква).

---

## 3. Доступ к домашним каталогам

### Из Ubuntu → Arch
```bash
# Смонтировать раздел Arch
sudo mkdir -p /mnt/arch-root
sudo mount /dev/nvme0n1p3 /mnt/arch-root

# Доступ к домашнему каталогу Arch пользователя
# /mnt/arch-root/home/username/
```

### Из Arch → Ubuntu
```bash
# Смонтировать раздел Ubuntu
sudo mkdir -p /mnt/ubuntu-root
sudo mount /dev/nvme0n1p5 /mnt/ubuntu-root

# Доступ к домашнему каталогу Ubuntu пользователя
# /mnt/ubuntu-root/home/username/
```

### Из Windows → Linux разделы
**Важно:** Windows не может читать ext4 нативно.

**Решение:** Установите драйвер ext4 для Windows:
- **Linux File Systems for Windows by Paragon** (платный, ~$30)
- **Ext2Fsd** (бесплатный, но менее надёжный)

Или используйте общий раздел `/data` через сеть (см. ниже).

---

## 4. Сетевой общий доступ (альтернатива)

Если нужно предоставить Windows доступ к `/data`:

### В Ubuntu — настроить Samba
```bash
# Установить Samba
sudo apt install samba

# Создать общую папку
sudo mkdir -p /data/shared
sudo chmod 777 /data/shared

# Добавить в /etc/samba/smb.conf
[sudo tee -a /etc/samba/smb.conf << 'EOF'
[shared-data]
   path = /data/shared
   browseable = yes
   read only = no
   guest ok = yes
   create mask = 0777
   directory mask = 0777
EOF
]

# Перезапустить Samba
sudo systemctl restart smbd
```

В Windows: `\\IP-АДРЕС-UBUNTU\shared-data`

---

## 5. Быстрые команды для монтирования

### Ubuntu — смонтировать всё
```bash
sudo mount -a  # Монтирует всё из fstab
```

### Arch — смонтировать всё
```bash
sudo mount -a  # Монтирует всё из fstab
```

### Проверка монтирования
```bash
df -h  # Показать все смонтированные разделы
```

---

## 6. Рекомендации по организации данных

### Структура `/data` для общего доступа:
```
/data/
├── documents/      # Документы
├── downloads/      # Загрузки (торренты и т.п.)
├── media/          # Музыка, видео, фото
├── projects/       # Проекты разработки
├── games/          # Игры (Steam library)
└── backup/         # Резервные копии
```

### Steam Library на общем разделе:
1. В Steam: Настройки → Хранилище → Добавить диск
2. Выберите `/data/games` (или `/mnt/windows/games`)

---

## 7. Проверка после настройки

### Ubuntu
```bash
# Проверить /data
ls -la /data

# Проверить Windows
ls -la /mnt/windows

# Проверить Arch (доступ к файлам)
ls -la /mnt/arch-root/home/
```

### Arch
```bash
# Проверить /data
ls -la /data

# Проверить Windows
ls -la /mnt/windows

# Проверить Ubuntu (доступ к файлам)
ls -la /mnt/ubuntu-root/home/
```

### Windows
```cmd
# Проверить диск D:
dir D:\

# Если настроена Samba
\\192.168.1.X\shared-data
```

---

## Примечания

⚠️ **Важно:**
1. **Не используйте Fast Startup в Windows** — это может повредить NTFS раздел при монтировании в Linux
   - Панель управления → Электропитание → Действие кнопок питания → Изменить недоступные параметры → Снять галочку "Включить быстрый запуск"

2. **Всегда безопасно извлекайте разделы** перед переключением между ОС

3. **Резервное копирование** — храните важные данные в нескольких копиях

4. **Права доступа** — в ext4 используйте `chown` для установки владельца

---

## UUID для fstab (копировать готовое)

### Ubuntu `/etc/fstab` (добавить в конец):
```
# Windows NTFS раздел
UUID=63C4D43F4E46E4CA  /mnt/windows  ntfs-3g  defaults,uid=1000,gid=1000,umask=022  0  0
```

### Arch `/etc/fstab` (добавить в конец):
```
# Общий раздел Data (ext4)
UUID=f4ed886a-62a3-478a-99f7-52857aedb208  /data  ext4  defaults  0  2

# Windows NTFS раздел
UUID=63C4D43F4E46E4CA  /mnt/windows  ntfs-3g  defaults,uid=1000,gid=1000,umask=022  0  0
```

---

**Готово!** Теперь у вас есть сквозной доступ к файлам между всеми системами.
