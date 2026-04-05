# Регистрация и почтовая инфраструктура (PocketBase Edition)

> **Статус:** ✅ Актуальный базовый стандарт почтовой системы
> **Актуальная документация:** См. `AUTH_STRATEGY.md` (все варианты auth, стратегия сессии) и `IMPLEMENTATION_PLAN_v2.md` → Этап 1-2.
> **Инструменты:** PocketBase v0.23+, Brevo (SMTP Relay).

---

## 🏗 Архитектура

### Выбранное решение
1. **Регистрация**: Встроенная в PocketBase (Email/Password).
2. **Атомарность**: При регистрации серверный хук (`pb_hooks/main.pb.js`) автоматически создает системную команду и проверяет ботов.
3. **Почта (Prod)**: SMTP Relay через **Brevo**.
4. **Почта (Dev)**: Локальный перехватчик **Mailpit** (Docker-контейнер).
5. **Защита от ботов**: Honeypot (`username_bot`) + Time-check (мин. 3 сек).

### Схема взаимодействия
```
[Client] -> [Nginx (VPS)] -> [PocketBase Core]
                                 |
                                 |--- (Prod) ---> [Brevo SMTP] ---> [User Email]
                                 |--- (Dev)  ---> [Mailpit UI]
```

---

## 🛠 Инфраструктура

### 1. Настройка DNS (Brevo)
Для домена `knok-knok.ru` настроены DKIM, SPF и DMARC записи.
**Sender email:** `admin@knok-knok.ru` (верифицированный отправитель).

### 2. Настройка PocketBase SMTP (Prod)
Переменные окружения в `.env.production`:
- **PB_SMTP_HOST**: `smtp-relay.brevo.com`
- **PB_SMTP_PORT**: `587`
- **PB_SMTP_USER**: `a72bc5001@smtp-brevo.com`
- **PB_SMTP_TLS**: `true` (StartTLS)

### 3. Локальная разработка (Dev / Mailpit)
Для тестирования почты без реальной отправки:
- **Host**: `mailpit`
- **Port**: `1025`
- **Web UI**: `http://server-ip:8025`
- **Docker Network**: Обязательно наличие внешней сети `pb_network` (`docker network create pb_network`).

---

## 🚀 Статус реализации

### Этап 1: Подтверждение Email ✅
- [x] Включить "Email verification" в настройках PocketBase.
- [x] Кастомизировать шаблоны писем (RU) в админке.
- [x] Реализовать роут `/auth/verify` для обработки ссылок.

### Этап 2: Защита от ботов ✅
- [x] Добавить Honeypot-поле `username_bot` + time-check.
- [x] Реализовать проверку на бэкенде через `onRecordBeforeCreateRequest`.
> **Примечание:** Cloudflare Turnstile остаётся резервным вариантом (Фаза 2) — если Honeypot окажется недостаточным.

### Этап 3: Правила и Онбординг
- [ ] Добавить чекбокс "Принимаю правила" в `RegisterForm`.
- [ ] Создать страницу `/terms` на основе контента из `docs/RULES.md`.
- [ ] Сохранять флаг `is_agreed_to_rules: true` в коллекции `users`.

### Этап 4: Система инвайтов (опционально)
- [ ] Создать коллекцию `invite_codes`.
- [ ] Добавить поле `invite_code` в форму регистрации.
- [ ] Реализовать валидатор кода через хук `onRecordBeforeCreateRequest`.

---

## 📝 Заметки для разработчика
- В PocketBase все действия с Auth-коллекцией `users` защищены по умолчанию.
- Шифрование E2E вступает в силу *после* успешной регистрации и первого входа (генерация пары ключей).
- Для обратной связи (Feedback) рекомендуется создать отдельную коллекцию `feedback` с API Rule: `@request.auth.id != "" && @request.method = "create"`.
