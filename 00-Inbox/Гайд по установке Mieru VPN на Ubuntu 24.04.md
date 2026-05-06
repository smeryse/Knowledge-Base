
# 

Полный пошаговый гайд по развёртыванию VPN на основе протокола Mieru с клиентами на Windows и iOS через Karing.

## Спецификация тестового стенда

**Сервер:**

- ОС: Ubuntu 24.04.1 LTS (Noble Numbat)
- Архитектура: x86_64 (amd64)
- Доступ: root по SSH
- Mita (серверный демон Mieru): v3.32.0

**Клиенты:**

- Windows 10 — Karing v1.2.18.2102
- iPhone (iOS) — Karing из App Store

**Протокол:** Mieru поверх TCP, диапазон портов 2012–2022.

## Как это работает (кратко)

Mieru — это прокси-протокол с шифрованием, который маскирует трафик под обычный TCP/UDP-поток без явных сигнатур, что затрудняет обнаружение и блокировку через DPI. На сервере работает демон **mita**, на клиенте — любой совместимый клиент: оригинальный CLI `mieru`, Karing, Clash.Meta/mihomo, sing-box.

В нашей сборке клиент — **Karing**, который под капотом использует ядро sing-box и принимает конфиг в формате sing-box JSON.

> ⚠️ **Важно про время:** Mieru вычисляет ключ шифрования на основе имени пользователя, пароля **и системного времени**. Если время на сервере и клиенте разойдётся больше чем на ~30 секунд, соединение не установится. На сервере NTP должен быть активен (`timedatectl` → `NTP service: active`), на iPhone в Настройках → Основные → Дата и время → «Автоматически».

---

## Часть 1. Подготовка сервера

### 1.1. Обновление системы

```bash
apt update && apt upgrade -y
```

### 1.2. Проверка синхронизации времени

```bash
timedatectl
```

Ожидаемый результат:

```text
System clock synchronized: yes
NTP service: active
```

Если NTP неактивен:

```bash
timedatectl set-ntp true
```

### 1.3. Проверка архитектуры

```bash
uname -m
```

Для `x86_64` качаем `amd64`-пакет, для `aarch64` — `arm64`.

---

## Часть 2. Установка mita

### 2.1. Скачать и установить пакет

```bash
cd ~
curl -LSO https://github.com/enfein/mieru/releases/download/v3.32.0/mita_3.32.0_amd64.deb
dpkg -i mita_3.32.0_amd64.deb
```

### 2.2. Проверить, что демон работает

```bash
systemctl status mita
mita status
```

Ожидаем `active (running)` и `mita server status is "IDLE"`. Жмём `q` для выхода.

> Если работаешь не под root, после установки выполни `sudo usermod -a -G mita $USER`, затем выйди и зайди по SSH заново.

---

## Часть 3. Конфигурация сервера

### 3.1. Сгенерировать пароль

```bash
openssl rand -base64 24
```

Скопировать результат и сохранить в надёжном месте.
Rd8uP8pW5DBut7qyWIYAmpOdPRsuaSdC
### 3.2. Создать конфиг сервера

```bash
nano ~/server_config.json
```

Содержимое:

```json
{
    "portBindings": [
        {
            "portRange": "2012-2022",
            "protocol": "TCP"
        }
    ],
    "users": [
        {
            "name": "myuser",
            "password": "ВСТАВЬ_ПАРОЛЬ"
        }
    ],
    "loggingLevel": "INFO",
    "mtu": 1400
}
```

Сохранить: `Ctrl+O`, `Enter`, `Ctrl+X`.

### 3.3. Применить конфиг и запустить прокси

```bash
mita apply config ~/server_config.json
mita describe config
mita start
mita status
```

Ожидаем `mita server status is "RUNNING"`.

### 3.4. Включить BBR (опционально)

```bash
cd ~
curl -fSsLO https://raw.githubusercontent.com/enfein/mieru/refs/heads/main/tools/enable_tcp_bbr.py
chmod +x enable_tcp_bbr.py
python3 enable_tcp_bbr.py
```

### 3.5. Удалить файл с паролем

```bash
shred -u ~/server_config.json
```

### 3.6. Проверка слушателей

```bash
ss -tlnp | grep mita
```

> ⚠️ Если у VPS-провайдера есть внешний файрвол (Hetzner, AWS, Oracle и др.) — открой TCP-порты 2012–2022 в панели хостинга.

---

## Часть 4. Клиент Karing на Windows 10

### 4.1. Создать конфигурационный файл

Создать файл `karing.json` в кодировке **UTF-8** со следующим содержимым:

```json
{
  "log": {
    "level": "info"
  },
  "dns": {
    "servers": [
      {
        "tag": "google",
        "address": "8.8.8.8"
      },
      {
        "tag": "local",
        "address": "1.1.1.1",
        "detour": "direct"
      }
    ]
  },
  "outbounds": [
    {
      "type": "mieru",
      "tag": "mieru-out",
      "server": "ВАШ_IP_СЕРВЕРА",
      "server_port": 2015,
      "transport": "TCP",
      "username": "myuser",
      "password": "ВАШ_ПАРОЛЬ",
      "multiplexing": "MULTIPLEXING_HIGH"
    },
    {
      "type": "direct",
      "tag": "direct"
    }
  ],
  "route": {
    "final": "mieru-out"
  }
}
```

Заменить `ВАШ_IP_СЕРВЕРА` и `ВАШ_ПАРОЛЬ`. Порт `2015` входит в диапазон 2012–2022.

### 4.2. Импорт в Karing

1. Открыть Karing → **Profiles**.
2. **+ Add** → **Import from file**.
3. Указать `karing.json`.
4. Сделать профиль активным, нажать **Start**.
5. Включить **System Proxy** или **TUN Mode**.

### 4.3. Проверка

В Karing нажать **Test**. Ожидаем зелёные галочки и `HTTP соединение → Соединение установлено успешно`.

---

## Часть 5. Клиент Karing на iPhone

### 5.1. Подготовка телефона

**Настройки → Основные → Дата и время → Автоматически** — обязательно включено.

### 5.2. Загрузить конфиг

Использовать тот же `karing.json`. Способы передачи:

**Вариант А — GitHub Gist:**

1. Зайти на <https://gist.github.com/>.
2. Создать **Secret Gist**, имя файла `karing.json`, вставить содержимое.
3. **Create secret gist** → кнопка **Raw** → скопировать ссылку.
4. На iPhone в Karing: **Profiles** → **+** → **Add Profile from URL** → вставить ссылку.

**Вариант Б — через файл:**

Отправить себе в Telegram/Notes → открыть файл → **Поделиться → Открыть в Karing**.

### 5.3. Подключение

Активировать профиль, нажать **Start**, разрешить установку VPN-конфигурации.

---

## Часть 6. Добавление новых пользователей

> ⚠️ Внутри секции `users` при `apply config` идёт **замена**, а не добавление. Обязательно перечислять всех пользователей.

### 6.1. Сгенерировать пароль

```bash
openssl rand -base64 24
```

### 6.2. Создать файл с обновлённым списком

```bash
nano ~/add_user.json
```

```json
{
    "users": [
        {
            "name": "myuser",
            "password": "ПАРОЛЬ_ПЕРВОГО_ЮЗЕРА"
        },
        {
            "name": "user2",
            "password": "НОВЫЙ_ПАРОЛЬ",
            "quotas": [
                { "days": 1, "megabytes": 5120 },
                { "days": 30, "megabytes": 51200 }
            ]
        }
    ]
}
```

Квоты для `user2`: 5 ГБ в сутки и 50 ГБ в месяц.

### 6.3. Применить без обрыва соединений

```bash
mita apply config ~/add_user.json
mita describe config
mita reload
shred -u ~/add_user.json
```

### 6.4. Клиентский конфиг для нового юзера

```json
{
  "log": { "level": "info" },
  "dns": {
    "servers": [
      { "tag": "google", "address": "8.8.8.8" },
      { "tag": "local", "address": "1.1.1.1", "detour": "direct" }
    ]
  },
  "outbounds": [
    {
      "type": "mieru",
      "tag": "mieru-out",
      "server": "ВАШ_IP_СЕРВЕРА",
      "server_port": 2015,
      "transport": "TCP",
      "username": "user2",
      "password": "НОВЫЙ_ПАРОЛЬ",
      "multiplexing": "MULTIPLEXING_HIGH"
    },
    { "type": "direct", "tag": "direct" }
  ],
  "route": { "final": "mieru-out" }
}
```

---

## Часть 7. Полезные команды

| Команда | Назначение |
|---|---|
| `mita status` | Статус сервиса (IDLE / RUNNING) |
| `mita describe config` | Показать текущую конфигурацию |
| `mita describe users` | Статистика по пользователям и квотам |
| `mita apply config <file>` | Применить новый конфиг |
| `mita reload` | Перечитать users/logging без рестарта |
| `mita start` / `mita stop` | Запуск/остановка прокси |
| `mita logs` | Последние логи |
| `systemctl status mita` | Состояние systemd-сервиса |
| `ss -tlnp \| grep mita` | Какие порты слушает |

---

## Часть 8. Решение типовых проблем

**Karing на Windows: `multiplexing: cannot unmarshal object into string`**
Использовать `"multiplexing": "MULTIPLEXING_HIGH"`, а не объект `{ "level": "..." }`.

**Karing: `invalid server_ports format`**
Использовать одиночное поле `"server_port": 2015`, а не массив диапазонов.

**iPhone: `failed to read socks5 connection response: EOF` при AAAA-запросах**
Мобильная сеть без IPv6. В блок `dns` добавить `"strategy": "ipv4_only"` либо игнорировать — на работу VPN не влияет.

**Соединение не устанавливается**
С Windows: `Test-NetConnection ВАШ_IP -Port 2015`. Если `False` — открыть порты в панели VPS.

**На телефоне не работает**
Включить автоматическую дату и время в iOS.

**Новый пользователь добавлен, старый пропал**
Перечислять всех пользователей в `users`, секция перезаписывается целиком.

---

## Часть 9. Безопасность

Используй длинные случайные пароли (минимум 24 байта из `openssl rand -base64`) — слабые пароли в Mieru уязвимы, потому что входят в состав ключа шифрования. После применения конфигов удаляй файлы через `shred -u`, чтобы пароли не валялись на диске. Регулярно обновляй mita: скачай новый `.deb` и поставь той же командой `dpkg -i`. При раздаче VPN другим людям выдавай каждому отдельного пользователя с квотой — это даёт контроль над трафиком и возможность отозвать доступ, не трогая остальных.

---

## Источники

- Официальный репозиторий: <https://github.com/enfein/mieru>
- Server Install: <https://github.com/enfein/mieru/blob/main/docs/server-install.md>
- Client Install: <https://github.com/enfein/mieru/blob/main/docs/client-install.md>
- Karing: <https://karing.app/>