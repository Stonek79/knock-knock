#!/bin/bash
# Запускать на сервере Ninja (VPS) от имени root!

echo "=== Настройка WireGuard (wg01) на VPS ==="

VPS_PRIV="QLGh7cVLozByiS8m3L9vSGZZN/fJc7IL2kVFW8mp0ls="
HOME_PUB="FpxFu56LOEQauzPAlWuCSJlCaUx0oPjKOM+wr8G9g1Q="

# Создаем конфиг
cat <<EOF > /etc/wireguard/wg01.conf
[Interface]
# Приватный ключ этого сервера (Ninja)
PrivateKey = $VPS_PRIV
# Адрес сервера в виртуальной сети
Address = 10.88.11.1/24
# Порт, который нужно открыть в firewall
ListenPort = 51820

[Peer]
# Публичный ключ домашнего сервера
PublicKey = $HOME_PUB
# Разрешенный IP домашнего сервера
AllowedIPs = 10.88.11.2/32
EOF

# Ограничиваем права
chmod 600 /etc/wireguard/wg01.conf

# Включаем и запускаем
systemctl enable wg-quick@wg01
systemctl restart wg-quick@wg01

echo ""
echo "=== Статус туннеля wg01 ==="
wg show wg01
