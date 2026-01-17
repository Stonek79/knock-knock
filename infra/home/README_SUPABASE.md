# Настройка Supabase (Home Server)

Этот документ описывает процесс запуска self-hosted Supabase на вашем домашнем сервере (ноутбук с Ubuntu).

## Предварительные требования
- Docker и Docker Compose установлены.
- Настроен WireGuard (см. `../wg0.conf.template`).

## Установка и запуск

Поскольку мы следуем официальной документации Supabase для self-hosting, процесс выглядит так:

1. **Клонирование репозитория Supabase**
   Выполните эту команду в удобной директории на домашнем сервере (например, `~/supabase`):
   ```bash
   # Если репозитория еще нет
   git clone --depth 1 https://github.com/supabase/supabase
   ```

2. **Переход в папку docker**
   ```bash
   cd supabase/docker
   ```

3. **Настройка переменных окружения**
   Скопируйте пример конфига:
   ```bash
   cp .env.example .env
   ```
   
   Отредактируйте `.env`, используя значения из нашего шаблона `supabase.env.template` (который лежит в этой папке `infra/home`).
   **Важно изменить:**
   - `POSTGRES_PASSWORD`: ваш пароль для БД.
   - `JWT_SECRET`: секретный ключ для токенов (минимум 32 символа).
   - `SITE_URL` и `API_EXTERNAL_URL`: укажите ваш домен `https://yourdomain.com`.
   - `SMTP_*`: настройки почты для отправки Magic Links.

4. **Запуск**
   ```bash
   docker compose up -d
   ```
   
   После запуска Supabase Studio будет доступна по адресу `http://localhost:3000` (через туннель WireGuard и Nginx VPS она не проксируется, используйте SSH туннель или открывайте локально, если нужно администрировать).
   API будет доступно на порту `8000`, который мы проксируем через WireGuard на VPS.

## Обновление
```bash
cd supabase/docker
git pull
docker compose pull
docker compose up -d
```
