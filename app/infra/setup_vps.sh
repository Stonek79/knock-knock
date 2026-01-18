#!/bin/bash

# Configuration
DOMAIN_API="api.knock-knock.ru"
DOMAIN_WEB="knock-knock.ru"
EMAIL="alexstone@example.com" # Replace with real email if needed for LetsEncrypt notifications
TUNNEL_PORT_API=8080
TUNNEL_PORT_WEB=3000

# Update & Install Nginx/Certbot
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx

# Enable GatewayPorts for SSH Tunneling
sed -i 's/#GatewayPorts no/GatewayPorts yes/' /etc/ssh/sshd_config
sed -i 's/GatewayPorts no/GatewayPorts yes/' /etc/ssh/sshd_config
# If not present at all, append it
grep -q "GatewayPorts yes" /etc/ssh/sshd_config || echo "GatewayPorts yes" >> /etc/ssh/sshd_config
service ssh restart

# Create Nginx Config for API (Supabase)
cat > /etc/nginx/sites-available/$DOMAIN_API <<EOF
server {
    server_name $DOMAIN_API;

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

# Create Nginx Config for WEB (Frontend)
cat > /etc/nginx/sites-available/$DOMAIN_WEB <<EOF
server {
    server_name $DOMAIN_WEB www.$DOMAIN_WEB;

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

# Enable Sites
ln -s /etc/nginx/sites-available/$DOMAIN_API /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/$DOMAIN_WEB /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test & Restart Nginx
nginx -t && systemctl restart nginx

# Obtain SSL Certificates
certbot --nginx -d $DOMAIN_API --non-interactive --agree-tos -m $EMAIL
certbot --nginx -d $DOMAIN_WEB -d www.$DOMAIN_WEB --non-interactive --agree-tos -m $EMAIL

echo "✅ VPS Configuration Complete!"
echo "Make sure to run your tunnels from your laptop:"
echo "ssh -R $TUNNEL_PORT_API:localhost:8000 -R $TUNNEL_PORT_WEB:localhost:5173 user@vps-ip"
