# Развертывание Knock-Knock

Проект имеет гибридную инфраструктуру: публичный VPS и приватный Home Server, соединенные через WireGuard.

## 🏗 Архитектура

```
[User] -> [VPS: Nginx (8443)] -> [WireGuard] -> [Home Server: PocketBase (8090)]
```

---

## 🛠 Предварительные требования

1. **Домен**: `knok-knok.ru` (настроен через Cloudflare или аналоги).
2. **VPS**: Ubuntu 22.04+, Docker, Nginx.
3. **Home Server**: Ubuntu/Debian, Docker, WireGuard.
4. **SMTP**: Аккаунт в Brevo для отправки почты.

---

## 🚀 Порядок развертывания

### 1. Настройка VPN (WireGuard)
Настройте туннель между VPS и Home Server.
- VPS IP (внутри VPN): `10.0.0.1`
- Home Server IP (внутри VPN): `10.0.0.2`

### 2. Настройка бэкенда (Home Server)

```bash
cd ~/knock-knock/infra/home
# Отредактируйте .env (укажите PB_ENCRYPTION_KEY)
docker compose -f docker-compose.pb.yml up -d
```
Бэкенд доступен локально на порту `8090`.

### 3. Настройка Nginx (VPS)
Файл конфигурации: `infra/vps/nginx.api.conf`.
**Критично для Realtime:**
- `proxy_buffering off;`
- `proxy_read_timeout 24h;`
- Поддержка `http2`.

### 4. Развертывание фронтенда (Vite PWA)
Фронтенд может хоститься на VPS (через Nginx) или любом статическом хостинге (Vercel/Netlify).

```bash
cd app
npm install
npm run build
```
Убедитесь, что `VITE_PB_URL` указывает на `https://api.knok-knok.ru:8443`.

---

## 🔐 Безопасность
1. **API Rules**: Всегда проверяйте правила доступа в админке PocketBase.
2. **Encryption**: `PB_ENCRYPTION_KEY` должен быть надежным и не меняться после запуска (иначе данные в БД станут нечитаемыми).
3. **Admin**: После первого запуска создайте Superuser в админке `/_/`.
