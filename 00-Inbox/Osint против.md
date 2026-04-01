---
tags:
  - osint
  - opsec
  - red_team
---

# OSINT против

> Установить все OSINT-инструменты в отдельный Docker-контейнер.
> 
> **Применение:** пентест, SOC, расследования

---

## Правовые риски

| Статья | Нарушение |
|--------|-----------|
| **Ст. 138 УК РФ** (Нарушение тайны связи) | Поиск владельца номера через базы, пробив-сервисы, соцсети — незаконный сбор персональных данных |
| **Ст. 137 УК РФ** (Нарушение неприкосновенности частной жизни) | Даже публичные данные, собранные системно против конкретного лица, могут стать основанием для дела |
| **152-ФЗ** «О персональных данных» | Регулирует обработку и защиту персональных данных |

---

## Валидация номера

Перед любым поиском приведи номер к стандарту **E.164** (`+79123456789`).

### Пример валидации

**Номер 1:**
```
Input: +79064343445
Valid: True
E.164: +79064343445
Region: RU
Carrier: Билайн
Type: MOBILE
```

**Номер 2:**
```
Input: +79676734343
Valid: True
E.164: +79676734343
Region: RU
Carrier: Билайн
Type: MOBILE
```

Проверка: https://bldr.ru/agent.aspx?phone=79676734343

---

## Рабочий процесс

```bash
# 1. Валидация
python3 validate.py "+79064343445"

# 2. Поиск упоминаний в вебе
./phoneinfoga scan -n "+79064343445" -s

# 3. Поиск профилей по нику
sherlock "9064343445" --print-found -o socials.txt

# 4. Поиск в утечках
h8mail -t "+79064343445" -o breaches.txt

# 5. Проверка найденного email
h8mail -t "found@email.com" -c ~/.config/h8mail/h8mail.cfg -o email_breaches.txt
```

---

## Google-инструменты

| Сервис | Назначение |
|--------|-----------|
| Google Lens | Обратный поиск изображений |
| Google Карты | Геолокация |
| Google Earth | 3D-анализ местности |

**Также:** Maltego, Shodan, Google Dorks, WHOIS

Обучение: https://digitalcourses.afp.com/

---

## Google Dorks

| Оператор | Назначение | Пример |
|----------|-----------|--------|
| `AND` | Поиск по всем терминам | `dog AND cat` |
| `OR` | Поиск по любому из терминов | `dog OR cat` |
| `"..."` | Точная фраза | `"black dog"` |
| `-` | Исключение слова | `dog -cat` |
| `*` | Подстановочный знак | `best * of 2024` |
| `site:` | Поиск в пределах домена | `site:wikipedia.org dogs` |
| `inurl:` | Поиск по слову в URL | `inurl:blog dog` |
| `filetype:` | Фильтр по типу файла | `filetype:pdf cat` |

### Комбинации для OSINT

```
site:github.com "api_key" filetype:env
inurl:admin -site:example.com "login"
"password" OR "passwd" filetype:log -site:github.com
```

> В Google оператор `AND` работает по умолчанию. В DuckDuckGo и Bing синтаксис может отличаться.

---

## Ресурсы

**Соцсети:**
- https://deck.blue/
- https://whopostedwhat.com/

**Архивы:**
- https://web.archive.org/

**Методики:**
- https://www.bellingcat.com/