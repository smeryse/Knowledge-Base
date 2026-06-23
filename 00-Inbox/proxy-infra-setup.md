---
tags:
  - vpn
  - hysteria2
  - obfuscation
  - proxy
  - routing
  - homelab
---

# 🗂️ Infrastructure Notes — Smeryse

> Консолидированные заметки по настройке прокси-инфраструктуры. Без воды, по делу.

---

## 🎯 Цель
Организация защищённого удалённого доступа с цепочкой маршрутизации через РФ и Финляндию, с использованием обфусцированных протоколов (Hysteria2/Trojan) и домена `smeryse.online`.

---

## 🖥️ Инфраструктура

### Серверы (требования)
| Параметр | Значение |
|----------|----------|
| Локация | Россия (Москва/СПб) + Финляндия |
| ОЗУ | ≥1 ГБ |
| Канал | ≥1 Гбит/с |
| Трафик | ≥1 ТБ/мес |
| IP | Белый (публичный) |

### Топология подключений
```
Вариант 1:  Пользователь → Финляндия
Вариант 2:  Пользователь → Россия → Финляндия (цепочка)
```

---

## 🌐 Домен и DNS

### Домены
- `smeryse.online` — основной (активен)
- `smeryse.ru` — резерв (150 ₽/год)

### DNS (Reg.ru)
```
ns1.hosting.reg.ru
ns2.hosting.reg.ru
```

### Ссылки
- Панель хостинга: https://www.reg.ru/user/account/card/117322945
- Оплата: https://payment.reg.ru/paid?id=86168603&order_id=204216883&user_id=15573237&payment_method_id=55&shop_id=15&custom_token=adddeef55e026838da8758588f46fdd1ade75efe9b5c2af5d3794eca444bd69b&custom_ownership_confirmed=1

---

## 🔐 SSL/TLS сертификаты
```
fullchain: /root/cert/smeryse.online/fullchain.pem
privkey:   /root/cert/smeryse.online/privkey.pem
```

---

## ⚙️ Протоколы

### Hysteria2 (активный)
```ini
hysteria2://Kx9%23mP2%24vL5%40nQ8w@smeryse.online:443/?insecure=0&sni=smeryse.online&alpn=h3&obfs=salamander&obfs-password=ObfuscationPass2026#Hysteria2-Server
```
**Параметры:**
- Порт: `443`
- ALPN: `h3` (HTTP/3)
- Obfs: `salamander` + пароль
- SNI: `smeryse.online`
- insecure: `0` (строгая проверка сертификата)

### Trojan (план)
- Настроить позже
- Использовать тот же домен и сертификаты
- Рекомендуется обфускация + WebSocket/gRPC при необходимости

---

## 🛡️ Безопасность

| Угроза | Мера |
|--------|------|
| MitM, сниффинг | TLS 1.3, строгая валидация SNI, HSTS (опционально) |
| Компрометация доступа | 2FA: PAM + TOTP (Google Authenticator) |
| Детектирование трафика | Obfuscation (Salamander для Hysteria2), маскировка под HTTPS |
| Утечка данных | Минимизация логов, изоляция сервисов |

> 🔹 **Обфускация** — критична для обхода DPI. Salamander в Hysteria2 + Trojan с obfs-proxy при необходимости.

---

## 📚 Ресурсы

- [Habr: Настройка прокси-инфраструктуры](https://habr.com/ru/articles/985674/)
- [Habr: Безопасность туннелей](https://habr.com/ru/articles/992240/)
- [Rw Docs: Quick Start](https://docs.rw/docs/overview/quick-start/)
- [Happ link (fallback)](https://hynet.space/fallback?url=happ%3A%2F%2Fadd%2Fhttps%3A%2F%2Fhynet.space%2Fs%2Ffnh4IlcAV3lwe3cGSQw3Nntw&name=Happ)

### Для исследования
- **Kwangmyong** — закрытая интрасеть КНДР (изучение архитектур изолированных сетей)

---

## ✅ TODO / Чек-лист

	- [ ] Выбрать и арендовать сервер в РФ (1 ГБ ОЗУ, 1 Гбит, 1 ТБ, белый IP)
	- [ ] Выбрать и арендовать сервер в Финляндии
	- [ ] Настроить Hysteria2 на `smeryse.online:443`
	- [ ] Настроить Trojan (резерв/цепочка)
	- [ ] Реализовать маршрутизацию: пользователь → РФ → Финляндия
	- [ ] Включить 2FA (PAM+TOTP) на все серверы
	- [ ] Протестировать на устойчивость к DPI/сниффингу
	- [ ] Настроить мониторинг и логирование (без хранения чувствительных данных)
	- [ ] Документировать конфигурации (локально, зашифрованно)

---

> 💡 **Примечание**: Все конфигурации хранить в зашифрованном виде. Не коммитить в публичные репозитории. Пароли/ключи — через `.env` + `chmod 600`.

---

Нужно что-то добавить, уточнить или экспортировать в конкретный формат (Markdown, YAML, конфиг) — скажи.