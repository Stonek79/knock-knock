# Безопасность конфигурации (Security Guide)

> ⚠️ **Критически важно:** Прочитайте этот документ перед настройкой окружения!

---

## 📁 Какие файлы можно коммитить в git

### ✅ Можно коммитить (безопасно)

| Файл | Причина |
|------|---------|
| `.env.example` | Шаблон без реальных значений |
| `.env.test` (только шаблон!) | Если содержит только плейсхолдеры |
| `playwright.config.ts` | Конфигурация тестов без секретов |
| `scripts/use-env.sh` | Скрипт не содержит секретов |
| Документация (`.md`) | Если не содержит реальных ключей |

### ❌ НЕЛЬЗЯ коммитить (конфиденциально)

| Файл | Причина |
|------|---------|
| `.env` | Содержит активные ключи доступа |
| `.env.test` | Содержит ключи тестового окружения |
| `.env.production` | Содержит production ключи |
| `.env.local` | Локальные секреты разработки |
| `*.wireguard_keys` | Приватные ключи VPN |
| `infra/home/supabase.env` | Конфигурация Supabase с паролями |

---

## 🔐 Какие данные являются чувствительными

### Критические секреты (никогда не коммитить!)

1. **Supabase Keys:**
   - `VITE_SUPABASE_ANON_KEY` — публичный ключ, но уникален для среды
   - `SUPABASE_SERVICE_ROLE_KEY` — **полный доступ к БД**, никогда не коммитить!
   - `JWT_SECRET` — секрет для генерации токенов

2. **Пароли:**
   - `SUPABASE_CLI_PASSWORD` — пароль postgres
   - `POSTGRES_PASSWORD` — суперпользователь БД
   - `DASHBOARD_PASSWORD` — пароль админ-панели

3. **Сетевые данные:**
   - Внутренние IP-адреса (`192.168.1.X`, `10.0.0.X`)
   - Конфигурация WireGuard (приватные ключи)
   - Порты сервисов (8000, 8001, 54322)

4. **Персональные данные:**
   - Email тестовых пользователей
   - Реальные пользовательские данные из БД

---

## 🛡 Лучшие практики безопасности

### 1. Разделение сред (Environment Isolation)

**Правильно:**
```bash
# Разные ключи для каждой среды
.env.test        → тестовые ключи (staging)
.env.production  → production ключи
.env.local       → локальная разработка (mock)
```

**Неправильно:**
```bash
# Один файл для всего
.env             → содержит и тестовые, и production ключи ❌
```

### 2. Использование переменных окружения

**Правильно (playwright.config.ts):**
```typescript
env: {
  // Загружается из .env.test, не хардкодить!
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
}
```

**Неправильно:**
```typescript
env: {
  // Хардкод IP и ключей ❌
  VITE_SUPABASE_URL: 'http://192.168.1.142:8001',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIs...',
}
```

### 3. Доступ к домашнему серверу

**Правильно:**
```bash
# Доступ только через VPN
SUPABASE_HOME_IP_ADDRESS=10.0.0.2  # VPN IP
VITE_SUPABASE_URL=http://10.0.0.2:8001
```

**Неправильно:**
```bash
# Прямой доступ из интернета ❌
VITE_SUPABASE_URL=http://203.0.113.1:8001  # Публичный IP
```

### 4. Service Role Key

**Правило:** Используйте `SUPABASE_SERVICE_ROLE_KEY` ТОЛЬКО в серверных скриптах!

**Можно:**
```bash
# Seed-скрипты (выполняются локально)
node infra/scripts/seed_data.cjs

# Генерация типов
bash supabase/gen-types.sh
```

**Нельзя:**
```typescript
// Frontend код ❌
const supabase = createClient(URL, SERVICE_ROLE_KEY);
```

---

## 📋 Чек-лист безопасности

Перед каждым коммитом:

- [ ] Проверьте `.gitignore` — все ли `.env.*` файлы добавлены
- [ ] Выполните `git status` — нет ли случайных `.env` файлов
- [ ] Проверьте diff: `git diff HEAD` — нет ли ключей в коде
- [ ] Убедитесь, что документация содержит только примеры (`<placeholder>`)

---

## 🚨 Что делать при утечке секретов

### 1. Если утекли ключи Supabase

```bash
# 1. Сгенерируйте новые ключи в Supabase Dashboard
# 2. Обновите .env файлы
# 3. Перезапустите сервисы
docker compose restart

# 4. Задокументируйте инцидент
```

### 2. Если утекли ключи WireGuard

```bash
# 1. Сгенерируйте новые пары ключей
wg genkey | tee privatekey | wg pubkey > publickey

# 2. Обновите конфиги на всех устройствах
# 3. Переподключите VPN
```

### 3. Если утекли пароли БД

```bash
# 1. Смените пароль postgres
ALTER USER postgres WITH PASSWORD 'new-password';

# 2. Обновите .env файлы
# 3. Перезапустите Supabase
```

---

## 🔍 Автоматическая проверка секретов

Добавьте pre-commit хук для проверки:

```bash
#!/bin/bash
# .husky/pre-commit

# Проверка на наличие секретов в staged файлах
if git diff --cached | grep -E "(eyJ|sk_|pk_|wg.*=.*[A-Za-z0-9+/=]{20,})"; then
  echo "❌ Potential secrets detected!"
  echo "Please remove sensitive data before committing."
  exit 1
fi
```

---

## 📚 Дополнительные ресурсы

- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/security)
- [WireGuard Security](https://www.wireguard.com/security/)
- [12 Factor App: Config](https://12factor.net/config)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

## ⚠️ Напоминание

> **Безопасность — это процесс, а не результат.**  
> Регулярно проверяйте конфигурацию, обновляйте секреты и следите за доступом к инфраструктуре.

**Золотое правило:** Если сомневаетесь, можно ли коммитить файл — НЕ КОММТЬТЕ!
