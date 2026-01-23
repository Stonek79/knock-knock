#!/bin/bash

# Configuration
DOMAIN_API="api.knok-knok.ru"
DOMAIN_WEB="knok-knok.ru"
EMAIL="alexstone@example.com" # Replace with real email if needed for LetsEncrypt notifications
TUNNEL_PORT_API=8080
TUNNEL_PORT_WEB=3000

# Update & Install Nginx/Certbot
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx ufw

# Configure Firewall (Allow SSH & Nginx)
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 8443/tcp
ufw --force enable

# Enable GatewayPorts for SSH Tunneling
sed -i 's/#GatewayPorts no/GatewayPorts yes/' /etc/ssh/sshd_config
sed -i 's/GatewayPorts no/GatewayPorts yes/' /etc/ssh/sshd_config
# If not present at all, append it
grep -q "GatewayPorts yes" /etc/ssh/sshd_config || echo "GatewayPorts yes" >> /etc/ssh/sshd_config
service ssh restart

# Obtain SSL Certificates (Cert Only mode, using temporary Nginx config)
# We do this BEFORE writing our custom 8443 config to avoid conflict
systemctl stop nginx
certbot certonly --standalone -d $DOMAIN_API --non-interactive --agree-tos -m $EMAIL --expand
certbot certonly --standalone -d $DOMAIN_WEB -d www.$DOMAIN_WEB --non-interactive --agree-tos -m $EMAIL --expand
systemctl start nginx

# Create Nginx Config for API (Supabase) - Port 8443
cat > /etc/nginx/sites-available/$DOMAIN_API <<EOF
server {
    listen 80;
    server_name $DOMAIN_API;
    return 301 https://\$host:8443\$request_uri;
}

server {
    listen 8443 ssl;
    server_name $DOMAIN_API;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN_API/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_API/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:$TUNNEL_PORT_API;
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

# Create Nginx Config for WEB (Frontend) - Port 8443
cat > /etc/nginx/sites-available/$DOMAIN_WEB <<EOF
server {
    listen 80;
    server_name $DOMAIN_WEB www.$DOMAIN_WEB;
    return 301 https://\$host:8443\$request_uri;
}

server {
    listen 8443 ssl;
    server_name $DOMAIN_WEB www.$DOMAIN_WEB;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN_WEB/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_WEB/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:$TUNNEL_PORT_WEB;
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

# Test & Restart Nginx (Apply new 8443 config)
nginx -t && systemctl restart nginx

echo "✅ VPS Configuration Complete!"
echo "Make sure to run your tunnels from your laptop:"
echo "ssh -R $TUNNEL_PORT_API:localhost:8000 -R $TUNNEL_PORT_WEB:localhost:5173 user@vps-ip"
