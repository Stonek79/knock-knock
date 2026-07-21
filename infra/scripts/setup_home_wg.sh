#!/bin/bash
# Запускать на Домашнем сервере (будет вызван через GitHub Actions)

echo "=== Настройка WireGuard (wg11) на Домашнем сервере ==="

# Если файл .env есть - грузим оттуда
ENV_FILE="$HOME/knock-knock/.env"
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs -d '\n')
fi

# Проверяем, появились ли переменные (из .env или из экпорта GitHub Actions)
if [ -z "$HOME_WG_PRIV" ] || [ -z "$VPS_WG_PUB" ]; then
    echo "Ошибка: Не найдены переменные HOME_WG_PRIV и/или VPS_WG_PUB!"
    exit 1
fi

if [ -z "$HOME_WG_PRIV" ] || [ -z "$VPS_WG_PUB" ]; then
    echo "Ошибка: В .env не найдены ключи HOME_WG_PRIV и/или VPS_WG_PUB!"
    exit 1
fi

HOME_PRIV=$HOME_WG_PRIV
VPS_PUB=$VPS_WG_PUB

# ВНИМАНИЕ: Так как раннер требует пароль для sudo, мы используем Docker (в который раннер вхож без пароля) 
# для получения root-доступа к хостовой системе. Это стандартный трюк.

# Создаем конфиг
docker run --rm -v /etc/wireguard:/etc/wireguard alpine sh -c "cat <<EOF > /etc/wireguard/wg11.conf
[Interface]
# Приватный ключ этого (Домашнего) сервера
PrivateKey = $HOME_PRIV
# Внутренний IP домашнего сервера
Address = 10.88.11.2/24
# Снижаем MTU для предотвращения фрагментации и проблем с DPI
MTU = 1320

[Peer]
# Публичный ключ сервера Ninja
PublicKey = $VPS_PUB
# Белый IP сервера Ninja и его порт (изменили на 51822)
Endpoint = 149.33.42.8:51822
# Разрешаем весь трафик из этой подсети
AllowedIPs = 10.88.11.1/32
# Поддерживать соединение живым (очень важно за NAT)
PersistentKeepalive = 25
EOF
chmod 600 /etc/wireguard/wg11.conf
"

# Включаем автозагрузку
docker run --rm --privileged --net=host -v /:/host alpine chroot /host systemctl enable wg-quick@wg11

# Запускаем напрямую через wg-quick, чтобы увидеть точную ошибку прямо в логе GitHub!
docker run --rm --privileged --net=host -v /:/host alpine chroot /host wg-quick down wg11 || true
docker run --rm --privileged --net=host -v /:/host alpine chroot /host wg-quick up wg11 || docker run --rm --privileged --net=host -v /:/host alpine chroot /host journalctl -xeu wg-quick@wg11.service --no-pager

# Настраиваем брандмауэр (если есть), чтобы разрешить весь трафик внутри туннеля wg11
docker run --rm --privileged --net=host -v /:/host alpine chroot /host sh -c "ufw allow in on wg11 to any port 22 proto tcp || true"
docker run --rm --privileged --net=host -v /:/host alpine chroot /host sh -c "ufw allow in on wg11 to any port 8090 proto tcp || true"
docker run --rm --privileged --net=host -v /:/host alpine chroot /host sh -c "ufw allow in on wg11 to any port 9090 proto tcp || true"
docker run --rm --privileged --net=host -v /:/host alpine chroot /host sh -c "iptables -I INPUT 1 -i wg11 -j ACCEPT || true"

echo ""
echo "=== Статус туннеля wg11 ==="
docker run --rm --privileged --net=host -v /:/host alpine chroot /host wg show wg11

echo ""
echo "=== Сетевые интерфейсы и маршруты ==="
docker run --rm --privileged --net=host -v /:/host alpine chroot /host ip a show wg11 || true
docker run --rm --privileged --net=host -v /:/host alpine chroot /host ip route || true

echo ""
echo "=== Какие порты реально слушаются на сервере? ==="
docker run --rm --privileged --net=host -v /:/host alpine chroot /host ss -tulnp | grep -E '8090|9090|22' || true

echo ""
echo "=== Статус брандмауэра (UFW/iptables) ==="
docker run --rm --privileged --net=host -v /:/host alpine chroot /host ufw status || true
docker run --rm --privileged --net=host -v /:/host alpine chroot /host iptables -L INPUT -v -n | head -n 15 || true
