# Детальное руководство по развертыванию

## 1. Сетевая архитектура (FRP + VPN)

Проект использует туннель **FRP (Fast Reverse Proxy)**, защищенный VPN-соединением (например, Hiddify) на уровне ОС, для безопасного соединения публичного VPS и домашнего сервера (где хранится БД и работает приложение).

### FRP Туннель
- **VPS (Публичный)**: Запускает Nginx и FRP Server (`frps`). Принимает внешний HTTP/HTTPS трафик через Cloudflare, Nginx проксирует его внутрь FRP-сервера.
- **Home Server (Приватный)**: Хостит инстансы PocketBase и Frontend. Запускает FRP Client (`frpc`), который подключается к VPS и пробрасывает локальные порты наружу. Для защиты от обрывов DPI, трафик `frpc` должен идти через VPN.

### Nginx (VPS)
Конфигурация Nginx должна проксировать запросы на порты FRP:
```nginx
server {
    listen 80;
    server_name api.your_domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8090; # Порт проброшенный через FRP
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_read_timeout 24h;
    }
}
```

---

## 2. Развертывание Бэкенда (PocketBase) на Домашнем сервере

### Docker-контейнеры
Мы разделяем Dev и Prod окружения:
- **Dev**: Контейнер `whoami-pb-dev`, порт `9090`, данные в `pb_data_dev`.
- **Prod**: Контейнер `whoami-pb`, порт `8090`, данные в `pb_data`.

**Пример команды запуска (Dev):**
```bash
docker run -d \
  --name whoami-pb-dev \
  --network whoami-net \
  -v $(pwd)/pb_data_dev:/pb/pb_data \
  -v $(pwd)/pb_hooks:/pb/pb_hooks \
  pocketbase/pocketbase:latest \
  ./pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data --hooksDir=/pb/pb_hooks
```

---

## 3. Развертывание Фронтенда

Фронтенд хостится локально на домашнем сервере (в Docker) и пробрасывается наружу через тот же FRP-туннель на порт Nginx (VPS).

### Переменные окружения (.env)
- `VITE_PB_URL`: Публичный URL вашего API (через Cloudflare).
- `VITE_TURNSTILE_SITE_KEY`: Ключ для защиты (опционально).

### Сборка
```bash
cd app
npm run build
```
Результат в папке `dist/` готов к раздаче любым веб-сервером или Docker-контейнером с Nginx.

---

## 4. Обслуживание и бэкапы

### Бэкап базы данных
PocketBase хранит всё в одном файле `data.db` (SQLite). Поскольку база находится на домашнем сервере, физический доступ к ней защищен. Достаточно делать копию директории `pb_data`.

### Обновление хуков
При изменении `pb_hooks/main.pb.js` PocketBase автоматически перезагружает JS-движок. Если этого не произошло, перезапустите контейнер `whoami-pb`.
