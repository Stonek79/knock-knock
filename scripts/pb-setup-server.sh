#!/bin/bash

# Скрипт для автоматической инициализации PocketBase на домашнем сервере.
# Запускается с вашего локального Mac.

# Настройки (из .env приложения)
source app/.env

SERVER_HOST=${1:-"192.168.1.142"}  # Первый аргумент или по умолчанию
SERVER_USER=${2:-"alex"}           # Второй аргумент или по умолчанию
REMOTE_DIR="~/knok-knok-bd"
SOCKET="/tmp/ssh_mux_%h_%p_%r"

echo "🚀 Начинаю деплой PocketBase на $SERVER_USER@$SERVER_HOST..."

# 0. Устанавливаем мастер-соединение (пароль спросят тут один раз)
echo "🔑 Устанавливаю SSH соединение (введите пароль один раз)..."
ssh -M -S "$SOCKET" -f -N -o "ControlPersist=600" "$SERVER_USER@$SERVER_HOST"

# Функция для закрытия соединения при выходе
cleanup() {
    echo "🔒 Закрываю SSH мастер-соединение..."
    ssh -S "$SOCKET" -O exit "$SERVER_USER@$SERVER_HOST" 2>/dev/null
}
trap cleanup EXIT

# Макрос для ssh и scp через сокет
SSH_CMD="ssh -S $SOCKET"
SCP_CMD="scp -o ControlPath=$SOCKET"

# 1. Создаем папку на сервере
$SSH_CMD $SERVER_USER@$SERVER_HOST "mkdir -p $REMOTE_DIR"

# 2. Копируют конфиги
echo "📦 Копирую файлы конфигурации..."
$SCP_CMD infra/home/docker-compose.pb.yml $SERVER_USER@$SERVER_HOST:$REMOTE_DIR/
$SCP_CMD infra/home/pb_schema.json $SERVER_USER@$SERVER_HOST:$REMOTE_DIR/

# 3. Создаем .env на сервере
echo "📝 Создаю .env на сервере..."
$SSH_CMD $SERVER_USER@$SERVER_HOST "echo 'PB_ENCRYPTION_KEY=${PB_ENCRYPTION_KEY:-"knok-knok-secret-key-2026"}' > $REMOTE_DIR/.env"

# 4. Запускаем Docker Compose
echo "🐳 Запускаю Docker контейнер..."
$SSH_CMD $SERVER_USER@$SERVER_HOST "cd $REMOTE_DIR && docker compose -f docker-compose.pb.yml up -d"

# 5. Ждем запуска сервера
echo "⏳ Ждем запуска сервера (10 сек)..."
sleep 10

# 6. Создаем суперпользователя через Docker Exec
echo "👤 Создаем суперпользователя $ADMIN_EMAIL..."
# Пробуем новую команду superuser (PB v0.23+), если не выйдет - старую admin
if $SSH_CMD $SERVER_USER@$SERVER_HOST "docker exec knock-knock-pb pocketbase superuser --help" >/dev/null 2>&1; then
    $SSH_CMD $SERVER_USER@$SERVER_HOST "docker exec knock-knock-pb pocketbase superuser create $ADMIN_EMAIL '$ADMIN_PASSWORD'"
    AUTH_PATH="api/collections/_superusers/auth-with-password"
else
    $SSH_CMD $SERVER_USER@$SERVER_HOST "docker exec knock-knock-pb pocketbase admin create $ADMIN_EMAIL '$ADMIN_PASSWORD'"
    AUTH_PATH="api/admins/auth-with-password"
fi

# 7. Импорт схемы через API (с вашего Mac прямо на сервер)
echo "📂 Импортирую схему коллекций..."

# Получаем токен админа
AUTH_RESPONSE=$(curl -s -X POST "http://$SERVER_HOST:8090/$AUTH_PATH" \
     -H "Content-Type: application/json" \
     -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $AUTH_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Ошибка: Не удалось получить токен администратора. Проверьте адрес и пароль."
    exit 1
fi

# Импорт схемы (Метод PUT для PB v0.23+)
IMPORT_RESPONSE=$(curl -s -X PUT "http://$SERVER_HOST:8090/api/collections/import" \
     -H "Authorization: $TOKEN" \
     -H "Content-Type: application/json" \
     -d @infra/home/pb_schema.json)

if [[ $IMPORT_RESPONSE == *"\"code\":200"* ]] || [[ $IMPORT_RESPONSE == *"[]"* ]] || [[ $IMPORT_RESPONSE == "" ]]; then
    echo "✅ Схема успешно импортирована!"
else
    echo "⚠️ Ответ сервера при импорте: $IMPORT_RESPONSE"
    echo "💡 Если автоматический импорт не сработал, импортируйте вручную файл infra/home/pb_schema.json через Admin UI (Settings -> Import Collections)."
fi

echo "✨ Готово! PocketBase развернут и настроен на http://$SERVER_HOST:8090/_/"
