# Детальное руководство по развертыванию

## 1. Сетевая архитектура (VPN + Прокси)

Проект использует туннель **WireGuard** для безопасного соединения публичного VPS и домашнего сервера.

### WireGuard (Туннель)
- **VPS (10.0.0.1)**: Принимает внешний трафик на порту 8443 и перенаправляет его в туннель.
- **Home Server (10.0.0.2)**: Хостит инстанс PocketBase.

### Nginx (VPS)
Конфигурация Nginx должна поддерживать SSE (Server-Sent Events) для реалтайма:
```nginx
location / {
    proxy_pass http://10.0.0.2:8090;
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
    proxy_read_timeout 24h;
}
```

---

## 2. Развертывание Бэкенда (PocketBase)

### Docker-контейнеры
Мы разделяем Dev и Prod окружения:
- **Dev**: Контейнер `knok-knok-pb-dev`, порт `9090`, данные в `pb_data_dev`.
- **Prod**: Контейнер `knok-knok-pb`, порт `8090`, данные в `pb_data`.

**Команда запуска (Dev):**
```bash
docker run -d \
  --name knok-knok-pb-dev \
  -p 9090:8090 \
  -v $(pwd)/pb_data_dev:/pb/pb_data \
  -v $(pwd)/pb_hooks:/pb/pb_hooks \
  pocketbase/pocketbase:latest \
  ./pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data --hooksDir=/pb/pb_hooks
```

---

## 3. Развертывание Фронтенда

### Переменные окружения (.env)
- `VITE_PB_URL`: Публичный URL вашего API (например, `https://api.knok-knok.ru:8443`).
- `VITE_TURNSTILE_SITE_KEY`: Ключ для Cloudflare Turnstile.

### Сборка
```bash
npm run build
```
Результат в папке `dist/` готов к раздаче любым веб-сервером.

---

## 4. Обслуживание и бэкапы

### Бэкап базы данных
PocketBase хранит всё в одном файле `data.db` (SQLite). Достаточно делать копию директории `pb_data`.

### Обновление хуков
При изменении `pb_hooks/main.pb.js` PocketBase автоматически перезагружает JS-движок. Если этого не произошло, перезапустите контейнер.
