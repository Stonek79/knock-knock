# План миграции на Cloudflare Tunnels (Отказ от VPS и WireGuard/FRP)

## Предпосылки
Текущая архитектура с использованием VPS (Ninja) в качестве Reverse Proxy (через WireGuard/FRP туннели) столкнулась с жесткими блокировками UDP/TCP трафика со стороны систем ТСПУ (DPI) провайдера РФ. 
Трафик внутри туннеля обрывается через несколько секунд после установления соединения. Разделение деплоя не решает проблему проброса портов наружу.

## Целевая Архитектура (Вариант Б + Zero-Knowledge Push)
- **Домашний сервер (РФ)** - хостит Frontend, Backend (PocketBase) и Базу Данных (защита физического доступа к данным).
- **Публикация в сеть (Входящий трафик)** - осуществляется через `cloudflared` (Cloudflare Tunnel) с Домашнего сервера. Cloudflare берет на себя выдачу SSL-сертификатов, кэширование и защиту от DDoS.
- **VPS Ninja (Зарубежный сервер)** - сохраняется ИСКЛЮЧИТЕЛЬНО для хостинга `push-gateway`.
- **Исходящий трафик (Web Push)** - PocketBase с домашнего сервера отправляет пуши на `push-gateway` (VPS), а тот отправляет их в Apple/Google с зарубежного IP, защищая пользователей от деанонимизации и блокировок РКН.

---

## Пошаговый план миграции

### Шаг 1: Делегирование домена (Изменение DNS)
Так как домен `whoami.ninja` зарегистрирован на Spaceship (не в Cloudflare), необходимо:
1. Зарегистрировать бесплатный аккаунт на [Cloudflare](https://dash.cloudflare.com/).
2. Нажать **"Add a site"** и ввести `whoami.ninja`. Выбрать бесплатный тариф (Free).
3. Cloudflare просканирует текущие DNS-записи и выдаст два своих Nameserver'а (например, `lisa.ns.cloudflare.com` и `bob.ns.cloudflare.com`).
4. Зайти в панель [Spaceship Advanced DNS](https://www.spaceship.com/application/advanced-dns-application/manage/whoami.ninja/) и заменить текущие DNS-серверы на выданные от Cloudflare (Custom DNS / Custom Nameservers).
5. Дождаться обновления DNS (от 10 минут до пары часов).

### Шаг 2: Создание туннеля (В панели Cloudflare)
1. В панели Cloudflare перейти в раздел **Zero Trust** -> **Networks** -> **Tunnels**.
2. Нажать **Create a tunnel** (выбрать тип Cloudflared).
3. Назвать туннель (например, `home-server`).
4. На этапе "Install and run a connector" скопировать выданный **TOKEN** (он будет длинной строкой).
5. Настроить маршрутизацию (вкладка **Public Hostname**):
   - Домен: `api.whoami.ninja`, Path: пустой -> Сервис: `http://whoami-pb:8090` (Prod база)
   - Домен: `dev-api.whoami.ninja`, Path: пустой -> Сервис: `http://whoami-pb-dev:9090` (Dev база)
   - Домен: `whoami.ninja`, Path: пустой -> Сервис: `http://whoami-frontend:80` (Фронтенд, или какой у него порт)

### Шаг 3: Настройка инфраструктуры на Домашнем сервере
1. Добавить токен в `.env` файл на Домашнем сервере: `CLOUDFLARE_TOKEN=ваш_токен`.
2. В `infra/prod/docker-compose.yml` и `infra/dev/docker-compose.yml` (или в общий, если объединим) добавить сервис:
   ```yaml
   cloudflared:
     image: cloudflare/cloudflared:latest
     container_name: cloudflare-tunnel
     command: tunnel run
     environment:
       - TUNNEL_TOKEN=${CLOUDFLARE_TOKEN}
     networks:
       - default
     restart: unless-stopped
   ```
3. Отключить службу WireGuard: `sudo systemctl disable --now wg-quick@wg11`.

### Шаг 4: Настройка Push-Gateway на VPS
1. На сервере Ninja (VPS) оставляем только директорию `infra/vps_new/push-gateway` и её `docker-compose.yml`.
2. Контейнер `push-gateway` выставляем наружу через тот же Cloudflare Tunnel (устанавливаем `cloudflared` на VPS) либо защищаем базовым Nginx с SSL, чтобы Домашний сервер мог безопасно кидать на него POST-запросы.
3. На Домашнем сервере в `docker-compose.yml` меняем переменную `PB_PUSH_GATEWAY_URL` на защищенный адрес шлюза на VPS (например, `https://push.whoami.ninja/`).

### Шаг 5: Зачистка репозитория и деплоя
1. В `.github/workflows/deploy.yml` удалить шаги настройки WireGuard и брандмауэра.
2. Деплой разбивается на две логические части (либо настраивается Cloudflare Tunnel для VPS):
   - Домашний сервер тянет код и перезапускает базы/Cloudflare Tunnel.
   - Сервер Ninja тянет код и держит актуальным `push-gateway`.
3. Удалить контейнеры `frpc` и `frps` из всех файлов `docker-compose.yml`, удалить скрипты WireGuard.
