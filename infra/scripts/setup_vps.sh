#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    set -a
    source .env
    set +a
    echo "✅ Environment loaded from .env"
else
    echo "⚠️ .env file not found, using default values"
fi

# Configuration (with defaults)
DOMAIN_API="${VPS_DOMAIN_API:-api.yourdomain.com}"
DOMAIN_WEB="${VPS_DOMAIN_WEB:-yourdomain.com}"
EMAIL="${VPS_EMAIL:-admin@yourdomain.com}"
HOME_SERVER_IP="${VPS_HOME_SERVER_IP:-10.0.0.2}"

# 1. Update & Install Dependencies
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx firewalld wireguard wireguard-tools

# 2. Configure Firewall
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=8443/tcp
firewall-cmd --permanent --add-port=51821/udp
firewall-cmd --reload

# 3. Obtain SSL Certificates
# Останавливаем Nginx на время получения сертификата (для standalone режима)
systemctl stop nginx || true

certbot certonly --standalone -d $DOMAIN_API --non-interactive --agree-tos -m $EMAIL --expand
certbot certonly --standalone -d $DOMAIN_WEB -d www.$DOMAIN_WEB --non-interactive --agree-tos -m $EMAIL --expand

# Запускаем Nginx обратно
systemctl start nginx || true

# Альтернатива: использовать --nginx вместо --standalone (автоматически управляет Nginx)
# certbot certonly --nginx -d $DOMAIN_API --non-interactive --agree-tos -m $EMAIL --expand
# certbot certonly --nginx -d $DOMAIN_WEB -d www.$DOMAIN_WEB --non-interactive --agree-tos -m $EMAIL --expand

# 4. Create WireGuard Keys (if not exist)
mkdir -p ~/wireguard_keys
if [ ! -f ~/wireguard_keys/private_vps ]; then
    wg genkey | tee ~/wireguard_keys/private_vps | wg pubkey > ~/wireguard_keys/public_vps
fi

# 5. Setup Nginx Configs
# [API Config with CORS]
# Примечание: Supabase/Kong должен сам управлять CORS. Эти настройки - запасной вариант.
cat > /etc/nginx/sites-available/$DOMAIN_API <<EOF
server {
    listen 8443 ssl;
    server_name $DOMAIN_API;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN_API/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_API/privkey.pem;

    # Полная CORS и Security конфигурация
    location / {
        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://$DOMAIN_API wss://$DOMAIN_API; frame-ancestors 'none';" always;

        # Обработка preflight запросов
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://$DOMAIN_WEB:8443' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,apikey' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        # CORS заголовки для обычных запросов
        add_header 'Access-Control-Allow-Origin' 'https://$DOMAIN_WEB:8443' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,apikey' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Range,Content-Length,Accept-Ranges' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;

        # Proxy настройки
        proxy_pass http://${HOME_SERVER_IP}:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# [Web Config]
cat > /etc/nginx/sites-available/$DOMAIN_WEB <<EOF
server {
    listen 8443 ssl;
    server_name $DOMAIN_WEB www.$DOMAIN_WEB;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN_WEB/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_WEB/privkey.pem;

    location / {
        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Content-Security-Policy "default-src 'self' https://$DOMAIN_API; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://$DOMAIN_API wss://$DOMAIN_API; frame-ancestors 'none';" always;

        proxy_pass http://${HOME_SERVER_IP}:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/$DOMAIN_API /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/$DOMAIN_WEB /etc/nginx/sites-enabled/

nginx -t && systemctl restart nginx

echo "✅ VPS Setup Complete!"
echo "Your WireGuard Public Key: $(cat ~/wireguard_keys/public_vps)"
