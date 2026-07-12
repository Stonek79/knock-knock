#!/bin/bash
# Скрипт автоматического обновления SSL-сертификатов и конвертации в PKCS12 для Rathole
# Запускается по cron раз в сутки. Certbot обновит сертификат только если до истечения < 30 дней.

set -e

LOG_FILE="/var/log/rathole-cert-renew.log"
DOMAIN="api.whoami.ninja"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
P12_FILE="${CERT_DIR}/rathole.p12"
P12_PASSWORD="rathole2026"

echo "$(date '+%Y-%m-%d %H:%M:%S') — Начинаем проверку сертификатов..." >> "$LOG_FILE"

# Запоминаем хеш текущего сертификата для сравнения
OLD_HASH=""
if [ -f "${CERT_DIR}/fullchain.pem" ]; then
    OLD_HASH=$(md5sum "${CERT_DIR}/fullchain.pem" | awk '{print $1}')
fi

# Пробуем обновить сертификаты (certbot обновит только если нужно)
certbot renew --quiet --no-random-sleep-on-renew 2>> "$LOG_FILE"

# Проверяем, обновился ли сертификат
NEW_HASH=$(md5sum "${CERT_DIR}/fullchain.pem" | awk '{print $1}')

if [ "$OLD_HASH" != "$NEW_HASH" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') — Сертификат обновлён! Конвертируем в PKCS12..." >> "$LOG_FILE"
    
    # Конвертируем PEM → PKCS12
    openssl pkcs12 -export \
        -out "$P12_FILE" \
        -inkey "${CERT_DIR}/privkey.pem" \
        -in "${CERT_DIR}/fullchain.pem" \
        -password "pass:${P12_PASSWORD}"
    
    # Перезапускаем контейнер Rathole, чтобы подхватил новый сертификат
    cd /root/infra && docker-compose restart rathole
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') — Rathole перезапущен с новым сертификатом ✅" >> "$LOG_FILE"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') — Сертификат ещё актуален, обновление не требуется." >> "$LOG_FILE"
fi
