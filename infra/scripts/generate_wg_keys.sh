#!/bin/bash
echo "=== Генерация ключей для WireGuard ==="
echo "Для работы требуется установленный Docker."
echo ""

echo "Ключи для сервера Ninja (VPS):"
docker run --rm alpine sh -c "apk add --no-cache wireguard-tools >/dev/null 2>&1 && wg genkey | tee /tmp/priv | wg pubkey > /tmp/pub && echo 'PrivateKey = ' \$(cat /tmp/priv) && echo 'PublicKey  = ' \$(cat /tmp/pub)"

echo "----------------------------------------"

echo "Ключи для Домашнего сервера:"
docker run --rm alpine sh -c "apk add --no-cache wireguard-tools >/dev/null 2>&1 && wg genkey | tee /tmp/priv | wg pubkey > /tmp/pub && echo 'PrivateKey = ' \$(cat /tmp/priv) && echo 'PublicKey  = ' \$(cat /tmp/pub)"
