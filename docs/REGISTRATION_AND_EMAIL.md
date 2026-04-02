# Регистрация и почтовая инфраструктура (PocketBase Edition)

> **Статус:** ⚠️ Частично устарел (апрель 2026)
> **Актуальная документация:** См. `AUTH_STRATEGY.md` (все варианты auth, стратегия сессии) и `IMPLEMENTATION_PLAN_v2.md` → Этап 1-2.
> **Инструменты:** PocketBase v0.23+, Brevo (SMTP Relay).

---

## 🏗 Архитектура

### Выбранное решение
1. **Регистрация**: Встроенная в PocketBase (Email/Password).
2. **Атомарность**: При регистрации серверный хук (`pb_hooks/main.pb.js`) автоматически создает системную комнату «Избранное».
3. **Почта**: SMTP Relay через **Brevo**. PocketBase напрямую отправляет письма подтверждения и восстановления.
4. **Защита от ботов**: Cloudflare Turnstile интегрируется на уровне фронтенда и проверяется на бэкенде (через хук или Middleware).

### Схема взаимодействия
```
[Client] -> [Nginx (VPS)] -> [PocketBase (Home Server)]
                                 |
                                 |---> [Brevo SMTP] ---> [User Email]
```

---

## 🛠 Инфраструктура

### 1. Настройка DNS (Brevo)
Для корректной доставки писем необходимо настроить TXT-записи (SPF, DKIM, DMARC) в панели управления вашим доменом. Инструкции доступны в панели Brevo в разделе "Senders & IP".

### 2. Настройка PocketBase SMTP
В админ-панели PocketBase (**Settings > Mail settings**):
- **SMTP Server**: `smtp-relay.brevo.com`
- **Port**: `587`
- **Username**: Ваш email в Brevo
- **Password**: Ваш SMTP Master Key из Brevo
- **Sender address**: `noreply@knok-knok.ru`

---

## 🚀 План реализации

### Этап 1: Подтверждение Email
- [ ] Включить "Email verification" в настройках PocketBase.
- [ ] Кастомизировать шаблоны писем (RU/EN) в админке.
- [ ] Реализовать на фронтенде страницу `/auth/confirm` для обработки перехода по ссылке (если требуется кастомный UI).

### Этап 2: Защита от ботов
- [ ] Добавить Honeypot-поле `_hp` + time-check в формы (`LoginForm`, `RegisterForm`).
- [ ] Реализовать проверку Honeypot на бэкенде через `onRecordBeforeCreateRequest` в `pb_hooks`.
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
