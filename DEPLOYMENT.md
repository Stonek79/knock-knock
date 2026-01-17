# Руководство по развертыванию (Deployment Guide)

Это руководство описывает процесс настройки инфраструктуры для проекта **PrivMessenger**.
Архитектура: `Client (Internet) -> VPS (Nginx) -> WireGuard Tunnel -> Home Server (Supabase)`.

## 1. Настройка VPS (публичный сервер)

**OS:** Ubuntu 22.04 LTS
**Роль:** Reverse Proxy & TURN Server.

### 1.1. Установка пакетов
```bash
sudo apt update && sudo apt install -y nginx wireguard coturn certbot python3-certbot-nginx
```

### 1.2. Настройка WireGuard
1. Сгенерируйте ключи:
   ```bash
   wg genkey | tee privatekey | wg pubkey > publickey
   ```
2. Создайте конфиг `/etc/wireguard/wg0.conf` на основе `infra/vps/wg0.conf.template`.
   - Вставьте `PrivateKey` (содержимое файла `privatekey` с VPS).
   - Вставьте `PublicKey` пира (домашнего сервера) в секцию `[Peer]`.

3. Запустите интерфейс:
   ```bash
   sudo systemctl enable wg-quick@wg0
   sudo systemctl start wg-quick@wg0
   ```

### 1.3. Настройка Nginx
1. Скопируйте `infra/vps/nginx.conf` в `/etc/nginx/sites-available/knock-knock`.
2. Замените `YOUR_DOMAIN.com` на ваш реальный домен.
3. Активируйте сайт:
   ```bash
   sudo ln -s /etc/nginx/sites-available/knock-knock /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl reload nginx
   ```
4. Получите SSL сертификат:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

### 1.4. Настройка Coturn (TURN server)
1. Отредактируйте `/etc/turnserver.conf` согласно `infra/vps/turnserver.conf`.
2. Сгенерируйте секрет и вставьте его.
3. Перезапустите службу:
   ```bash
   sudo systemctl restart coturn
   ```

---

## 2. Настройка Домашнего Сервера (Home Server)

**OS:** Ubuntu Server (Laptop)
**Роль:** Database & Backend (Supabase).

### 2.1. Установка пакетов
```bash
sudo apt update && sudo apt install -y wireguard docker.io docker-compose-plugin
```

### 2.2. Настройка WireGuard
1. Сгенерируйте ключи (аналогично VPS).
2. Создайте `/etc/wireguard/wg0.conf` на основе `infra/home/wg0.conf.template`.
   - `PrivateKey`: ключ домашнего сервера.
   - `PublicKey`: публичный ключ VPS.
   - `Endpoint`: IP-адрес вашего VPS.
3. Запустите VPN:
   ```bash
   sudo systemctl enable wg-quick@wg0
   sudo systemctl start wg-quick@wg0
   ```
4. Проверьте пинг до VPS: `ping 10.0.0.1`.

### 2.3. Запуск Supabase
Следуйте инструкции в файле `infra/home/README_SUPABASE.md`.

---

## 3. Проверка работоспособности
1. Откройте в браузере `https://yourdomain.com/status` (должен ответить Supabase Kong, если настроен, или 404 от Nginx, но с заголовками Supabase).
2. Попробуйте подключиться к БД через TablePlus/DataGrip, используя проброс портов или SSH туннель, чтобы убедиться, что база жива.
