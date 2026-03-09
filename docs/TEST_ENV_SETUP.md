# Настройка тестового окружения (Staging)

> ⚠️ **Важно:** Этот файл содержит чувствительные данные. Никогда не коммитьте `.env.test` в git!

---

## 📋 Обзор

Тестовое окружение (Staging) позволяет запускать E2E и integration тесты на **реальной базе данных**, изолированной от production.

### Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                  Тестовое окружение                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Клиент (Internet/Home)                                  │
│         ↓                                                │
│  VPS: nginx.staging.conf (staging-api.knok-knok.ru)      │
│         ↓ (через WireGuard VPN)                         │
│  Домашний сервер (10.0.0.2:8001)                         │
│         ↓                                                │
│  Docker: Supabase Staging (Isolated)                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Шаг 1: Настройка домашнего сервера

### 1.1. Поднимите тестовый Supabase

На домашнем сервере (Ubuntu/Manjaro):

```bash
# Перейдите в директорию с Supabase
cd ~/supabase/docker

# Скопируйте конфиг для тестового окружения
cp docker-compose.yml docker-compose.test.yml
```

Отредактируйте `docker-compose.test.yml`:
```yaml
services:
  kong:
    ports:
      - "8001:8000"  # Порт 8001 для тестов (не 8000!)
  # ... остальные сервисы
```

### 1.2. Запустите тестовый Supabase

```bash
# Остановите production (если работает на порту 8000)
docker compose down

# Запустите тестовый на порту 8001
docker compose -f docker-compose.test.yml up -d
```

### 1.3. Примените миграции

```bash
cd /path/to/knock-knock/app

# Подключитесь к тестовой БД
npx supabase db push \
  --db-url "postgresql://postgres:YOUR_PASSWORD@192.168.1.ХХХ:54322/postgres"
```

### 1.4. Получите ключи доступа

```bash
# На домашнем сервере
cd ~/supabase/docker
docker compose logs kong | grep "ANON KEY"
```

Запишите:
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 🔧 Шаг 2: Настройка локального окружения

### 2.1. Скопируйте шаблон

```bash
cd /path/to/knock-knock/app
cp .env.example .env.test
```

### 2.2. Заполните `.env.test`

```bash
# app/.env.test

# URL тестового Supabase (Публичный поддомен через VPS)
VITE_SUPABASE_URL=https://staging-api.knok-knok.ru:8443

# ИЛИ локально (если вы в домашней сети без VPN):
# VITE_SUPABASE_URL=http://192.168.1.ХХХ:8001

# Anon key (получили на шаге 1.4)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Отключаем mock для реальной БД
VITE_USE_MOCK=false

# Service role key (для seed-скриптов)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Пароль postgres (из конфига Supabase)
SUPABASE_CLI_PASSWORD=your-postgres-password

# IP домашнего сервера (внутри VPN)
SUPABASE_HOME_IP_ADDRESS=10.0.0.2

# JWT Secret (из конфига Supabase)
JWT_SECRET=your-jwt-secret-at-least-32-chars-long
```

⚠️ **Важно:**
- Все значения берутся из `.env` файла тестового Supabase (`~/supabase/docker/.env`)
- Никогда не копируйте production ключи в `.env.test`!

---

## 🔧 Шаг 3: Проверка подключения

### 3.1. Проверьте VPN подключение

```bash
# С вашего Mac
ping 10.0.0.2
# ИЛИ
ping 192.168.1.ХХХ
```

Если пинг не проходит — проверьте WireGuard:
```bash
# На домашнем сервере
sudo wg show

# На вашем Mac
sudo wg show
```

### 3.2. Проверьте доступ к Supabase

```bash
curl http://192.168.1.ХХХ:8001/rest/v1/ \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"
```

Ожидаемый ответ: `{"message":"Welcome to PostgREST!"}`

### 3.3. Переключитесь на test окружение

```bash
cd /path/to/knock-knock
./scripts/use-env.sh staging
```

### 3.4. Запустите приложение

```bash
cd app
npm run dev
```

Откройте `http://localhost:5173` и попробуйте войти под тестовым пользователем.

---

## 🔧 Шаг 4: Seed тестовых данных

### 4.1. Создайте тестовых пользователей

```bash
cd /path/to/knock-knock/infra/scripts
node seed_data.cjs
```

Это создаст:
- 4 тестовых пользователя с рандомными email
- Групповые чаты между ними
- Сообщения (без реального шифрования, только для UI тестов)
- Ключи E2E шифрования для каждого пользователя

### 4.2. Проверьте данные в БД

```bash
# Через Supabase Studio (http://192.168.1.ХХХ :8001)
# Или через SQL:

SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM rooms;
SELECT COUNT(*) FROM messages;
```

---

## 🧪 Шаг 5: Запуск тестов

### 5.1. E2E тесты (Playwright)

```bash
cd app

# Убедитесь, что используете staging окружение
cat .env | grep VITE_SUPABASE_URL

# Запустите все тесты
npx playwright test

# Запустите только staging тесты
npx playwright test --project=staging

# Запустите конкретный файл
npx playwright test e2e/specs/auth.spec.ts

# Запустите с UI
npx playwright test --ui

# Посмотрите отчет
npx playwright show-report
```

### 5.2. Integration тесты (Vitest)

```bash
cd app

# Запустите integration тесты
vitest run --config=vitest.integration.config.ts
```

---

## 🧹 Шаг 6: Очистка тестовых данных

После тестов очистите БД:

```bash
# Через Supabase Studio
# Или SQL запросом:

DELETE FROM messages WHERE id LIKE 'test-%';
DELETE FROM rooms WHERE id LIKE 'test-%';
DELETE FROM profiles WHERE username LIKE 'Test%';
```

Или через скрипт:
```bash
node infra/scripts/cleanup_test_data.cjs
```

---

## 🔒 Безопасность

### Какие данные можно коммитить

| Файл | Можно в git? | Причина |
|------|--------------|---------|
| `.env.example` | ✅ Да | Шаблон без значений |
| `.env.test` | ❌ Нет | Содержит ключи доступа |
| `.env.production` | ❌ Нет | Содержит production ключи |
| `playwright.config.ts` | ✅ Да | Не содержит секретов |
| `.gitignore` | ✅ Да | Конфигурация git |

### Защита ключей

1. **Никогда не коммитьте `.env.*`** (кроме `.env.example`)
2. **Используйте разные ключи** для staging и production
3. **Ограничьте доступ** к домашнему серверу через WireGuard
4. **Регулярно меняйте** `JWT_SECRET` и ключи Supabase

---

## 🛠 Решение проблем

### Ошибка: "ping: cannot resolve 10.0.0.2"

**Причина:** WireGuard не подключен

**Решение:**
```bash
# На вашем Mac
sudo wg-quick up /path/to/wg0.conf

# Проверьте статус
sudo wg show
```

### Ошибка: "Connection refused" на порту 8001

**Причина:** Тестовый Supabase не запущен

**Решение:**
```bash
# На домашнем сервере
docker compose -f docker-compose.test.yml ps
docker compose -f docker-compose.test.yml up -d
```

### Ошибка: "Invalid API key"

**Причина:** Неверный `VITE_SUPABASE_ANON_KEY`

**Решение:**
1. Проверьте ключ в `~/supabase/docker/.env`
2. Обновите `.env.test`
3. Перезапустите приложение

### Ошибка: "Database types mismatch"

**Причина:** Миграции не применены к тестовой БД

**Решение:**
```bash
cd app
bash supabase/gen-types.sh
```

---

## 📚 Дополнительные ресурсы

- [DEPLOYMENT.md](./DEPLOYMENT.md) — Настройка инфраструктуры
- [TESTING.md](./TESTING.md) — Полная документация по тестированию
- [WireGuard](https://www.wireguard.com/) — Документация VPN

---

## ⚠️ Контрольный список

Перед началом работы убедитесь:

- [ ] WireGuard настроен и работает
- [ ] Тестовый Supabase запущен на порту 8001
- [ ] Миграции применены к тестовой БД
- [ ] `.env.test` заполнен правильными значениями
- [ ] Пинг до домашнего сервера проходит
- [ ] Тестовые пользователи созданы (seed)
- [ ] Production ключи НЕ используются в staging
