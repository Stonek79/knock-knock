# Документация по деплою и сетевой архитектуре

Мы настроили профессиональную CI/CD систему и защищенную сеть между облаком (VPS) и вашим домашним сервером. Эта архитектура обеспечивает автоматическое обновление приложения и безопасный доступ к API.

## 1. Схема работы (Workflow)

1.  **Локально (Mac):** Вы пишете код и делаете `git push origin main`.
2.  **GitHub Actions:**
    *   Собирает Docker-образ.
    *   Вшивает настройки Supabase через `build-args`.
    *   Пушит образ в **GitHub Container Registry (GHCR)**.
3.  **Домашний сервер (Manjaro):**
    *   **Watchtower** каждые 5 минут проверяет GHCR.
    *   Если есть новый образ, он его скачивает и перезапускает контейнер `knock-knock-app`.
4.  **Сетевой путь запроса:**
    *   Пользователь заходит на `https://knok-knok.ru:8443`.
    *   **VPS (Nginx)** принимает запрос, добавляет SSL и CORS-заголовки.
    *   Запрос летит через **WireGuard туннель** (10.0.0.1 -> 10.0.0.2).
    *   **Домашний сервер** принимает запрос на порту 3000.

---

## 2. Настройка WireGuard (Туннель)

Туннель соединяет VPS и Дом. Пакеты ходят по внутренним IP `10.0.0.1` и `10.0.0.2`.

### На стороне VPS (Ubuntu):
Файл: `/etc/wireguard/wg0.conf`
```ini
[Interface]
Address = 10.0.0.1/24
ListenPort = 51821
PrivateKey = <VPS_PRIVATE_KEY>

[Peer]
PublicKey = <HOME_PUBLIC_KEY>
AllowedIPs = 10.0.0.2/32
```
Команда запуска: `sudo wg-quick up wg0`

### На стороне Дома (Manjaro):
Файл: `/etc/wireguard/wg0.conf` (без строки DNS!)
```ini
[Interface]
PrivateKey = <HOME_PRIVATE_KEY>
Address = 10.0.0.2/32

[Peer]
PublicKey = <VPS_PUBLIC_KEY>
Endpoint = <VPS_IP>:51821
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
```
Команда запуска: `sudo wg-quick up wg0`

---

## 3. Настройка Nginx на VPS (Реверс-прокси)

Мы настроили Nginx для решения проблемы CORS и SSL.

**Ключевые настройки для API (`api.knok-knok.ru`):**
Необходимо добавлять заголовки `Access-Control-Allow-Origin`, чтобы браузер разрешал запросы с фронтенда.
Шаблон конфига лежит в: `infra/vps/nginx.api.conf`.

---

## 4. Секреты GitHub

Для сборки образа необходимы секреты в GitHub (**Settings > Secrets and variables > Actions**):
- `VITE_SUPABASE_URL`: `https://api.knok-knok.ru:8443`
- `VITE_SUPABASE_ANON_KEY`: (ваш анонимный ключ)

---

## 5. Файрвол (UFW)

**На VPS:**
- `sudo ufw allow 51821/udp` (для WireGuard)
- `sudo ufw allow 8443/tcp` (для HTTPS)

**На Дому:**
- `sudo ufw allow in on wg0 to any port 3000` (разрешить запросы из туннеля)
- `sudo ufw allow 3000/tcp`

---

## 6. Режим разработки (Mock Mode)

Чтобы разрабатывать интерфейс без постоянного подключения к серверу или интернету, мы внедрили систему **Advanced In-Memory Mock**.

### Как это работает:
В файле `app/src/lib/supabase.ts` реализован имитатор Supabase, который хранит данные прямо в памяти браузера. Вы можете "входить" в систему под любым email, отправлять сообщения и переключаться между комнатами.

### Как включить:
В файле `app/.env` установите:
```env
VITE_USE_MOCK=true
```

### Доступные моковые пользователи:
- `alex@example.com` (Ваш профиль)
- `elon@spacex.com` (Илон Маск)
- `pavel@telegram.org` (Павел Дуров)

Данные сохраняются в рамках одной сессии браузера (`sessionStorage`). При закрытии вкладки данные сессии сохраняются, а при полной очистке кеша сбросятся.

## Что делать, если "ничего не работает"? (Troubleshooting)

1.  **Проверка туннеля:** На доме `ping 10.0.0.1`. Если не идет — проверьте `sudo wg show`.
2.  **Проверка контейнера:** На дому `docker compose ps`. Статус должен быть `Up`.
3.  **Логи приложения:** `docker logs knock-knock-app --tail 20`.
4.  **Ошибка 502:** Скорее всего, VPS не видит дом по WireGuard (проверьте IP и Порты).
5.  **Ошибка CORS:** Проверьте заголовки в Nginx на VPS.
