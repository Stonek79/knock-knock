# Обслуживание инфраструктуры Staging

Этот документ содержит инструкции по управлению и мониторингу инфраструктуры тестового окружения (Staging), развернутой на домашнем сервере.

## 🏗 Структура проекта
Все файлы стейджинга находятся в папке `~/supabase-staging` на домашнем сервере.

- `docker-compose.yml` — основной конфиг (изолирован от продакшена).
- `.env` — секреты и переменные окружения стейджинга.
- `volumes/` — данные базы, настройки Kong и хранилища.

## 🚀 Управление контейнерами

Все команды должны запускаться с флагом `-p staging`, чтобы не затронуть продакшен-базу.

```bash
cd ~/supabase-staging

# Запуск серверов
docker compose -p staging up -d

# Остановка серверов
docker compose -p staging stop

# Полная остановка и удаление контейнеров (данные в volumes сохранятся)
docker compose -p staging down

# Просмотр статуса
docker ps | grep staging
```

## 📜 Логи и дебаг

Если сервис перезагружается или не отвечает:

```bash
# Логи API шлюза (Kong)
docker logs staging-kong --tail 50 -f

# Логи базы данных
docker logs staging-db --tail 50 -f

# Логи Студии
docker logs staging-studio --tail 50 -f
```

## 🌐 Сетевой доступ

Доступ организован по схеме "Матрешка":
1. **Mac (Dev)** обращается к `staging-api.knok-knok.ru:8446`.
2. **VPS (Public)** принимает трафик и пересылает его в WireGuard туннель на IP `10.50.0.2`.
3. **Home Server** получает трафик и через Docker-прокси направляет в контейнер `staging-studio`.

### Настройка Nginx на VPS
Файл конфигурации: `/etc/nginx/sites-enabled/staging-api.knok-knok.ru`

Порты на VPS:
- **8445** -> Kong (API)
- **8446** -> Studio (DB UI)

## 🛠 Устранение неполадок

### Ошибка "Connection Refused"
1. Проверьте статус WireGuard на сервере и VPS: `sudo wg show`. Пинг между `10.50.0.1` и `10.50.0.2` должен проходить.
2. Проверьте, запущены ли контейнеры: `docker ps`.
3. Проверьте порт в Nginx на VPS: `cat /etc/nginx/sites-enabled/staging-api.knok-knok.ru`.

### Ошибка "Invalid JWT" в скриптах
Проверьте `SERVICE_ROLE_KEY` в `app/.env.test` на Маке. Он должен в точности совпадать с `SERVICE_ROLE_KEY` из `~/supabase-staging/.env` на сервере.
