#!/bin/bash

# Configuration
DOMAIN_API="api.knok-knok.ru"
DOMAIN_WEB="knok-knok.ru"
EMAIL="alexstone@mail.ru" # Обновите на ваш реальный email

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
certbot certonly --standalone -d $DOMAIN_API --non-interactive --agree-tos -m $EMAIL --expand
certbot certonly --standalone -d $DOMAIN_WEB -d www.$DOMAIN_WEB --non-interactive --agree-tos -m $EMAIL --expand

# 4. Create WireGuard Keys (if not exist)
mkdir -p ~/wireguard_keys
if [ ! -f ~/wireguard_keys/private_vps ]; then
    wg genkey | tee ~/wireguard_keys/private_vps | wg pubkey > ~/wireguard_keys/public_vps
fi

# 5. Setup Nginx Configs
# [API Config with CORS]
cat > /etc/nginx/sites-available/$DOMAIN_API <<EOF
server {
    listen 8443 ssl;
    server_name $DOMAIN_API;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN_API/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_API/privkey.pem;

    location / {
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://$DOMAIN_WEB:8443' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,apikey' always;
            return 204;
        }

        add_header 'Access-Control-Allow-Origin' 'https://$DOMAIN_WEB:8443' always;
        proxy_pass http://10.0.0.2:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
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
        proxy_pass http://10.0.0.2:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF

ln -s /etc/nginx/sites-available/$DOMAIN_API /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/$DOMAIN_WEB /etc/nginx/sites-enabled/

nginx -t && systemctl restart nginx

echo "✅ VPS Setup Complete!"
echo "Your WireGuard Public Key: $(cat ~/wireguard_keys/public_vps)"
