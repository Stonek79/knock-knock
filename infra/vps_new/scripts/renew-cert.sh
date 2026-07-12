#!/bin/bash
# Скрипт автоматического обновления SSL-сертификатов для Nginx
# Запускается по cron раз в сутки. Certbot обновит сертификат только если до истечения < 30 дней.

set -e

LOG_FILE="/var/log/cert-renew.log"
DOMAIN="api.whoami.ninja"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

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
    echo "$(date '+%Y-%m-%d %H:%M:%S') — Сертификат обновлён! Перезагружаем Nginx..." >> "$LOG_FILE"
    
    # Перезагружаем Nginx, чтобы подхватил новый сертификат
    docker exec whoami-nginx nginx -s reload
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') — Nginx перезагружен с новым сертификатом ✅" >> "$LOG_FILE"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') — Сертификат ещё актуален, обновление не требуется." >> "$LOG_FILE"
fi
