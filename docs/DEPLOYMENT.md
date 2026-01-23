# Инструкция по деплою и управлению

Я подготовил все необходимые файлы для автоматического деплоя в стиле WhatsApp. Ниже шаги для завершения настройки.

## 1. Удаленное управление (RustDesk)
Чтобы подключаться к серверу через графический интерфейс без подтверждения:
1. Зайдите на сервер по SSH.
2. Система **Manjaro**, поэтому используйте обновленный скрипт:
   ```bash
   bash infra/scripts/setup_rustdesk.sh
   ```
   *(Скрипт использует `pamac build rustdesk-bin` для корректной установки со всеми зависимостями).*
3. Установите постоянный пароль:
   ```bash
   sudo rustdesk --password ВАШ_ЛЮБИМЫЙ_ПАРОЛЬ
   ```
4. Теперь вы можете заходить через приложение RustDesk, используя ID сервера и этот пароль.

## 2. Настройка GitHub Actions
Для автоматического деплоя при каждом `git push`:
1. Перейдите в настройки вашего репозитория на GitHub: **Settings > Secrets and variables > Actions**.
2. Добавьте следующие секреты (Secrets):
   - `VITE_SUPABASE_URL`: URL вашего Supabase (напр. https://api.knok-knok.ru:8443)
   - `VITE_SUPABASE_ANON_KEY`: Ваш анонимный ключ.

## 3. Запуск на сервере
На сервере один раз выполните:
```bash
docker compose up -d
```
С этого момента **Watchtower** будет автоматически проверять наличие обновлений в GitHub Container Registry (GHCR) каждые 5 минут и обновлять приложение без вашего участия.

## 4. Файлы конфигурации
- [docker-compose.yml](file:///Users/alexstone/WebstormProjects/knock-knock/docker-compose.yml) — основной файл инфраструктуры.
- [.github/workflows/deploy.yml](file:///Users/alexstone/WebstormProjects/knock-knock/.github/workflows/deploy.yml) — сценарий сборки.
- [setup_rustdesk.sh](file:///Users/alexstone/WebstormProjects/knock-knock/infra/scripts/setup_rustdesk.sh) — скрипт установки GUI.
