#!/usr/bin/env bash

# Переходим в директорию app
cd "$(dirname "$0")/.." || exit 1

# Загружаем переменные из .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found"
  exit 1
fi

if [ -z "$SUPABASE_CLI_PASSWORD" ] || [ -z "$SUPABASE_HOME_IP_ADDRESS" ]; then
  echo "Error: SUPABASE_CLI_PASSWORD and SUPABASE_HOME_IP_ADDRESS must be set in .env"
  exit 1
fi

echo "Generating types directly on the remote server ($SUPABASE_HOME_IP_ADDRESS)..."

# Поскольку Supabase CLI железобетонно требует наличие запущенного Docker daemon,
# а локально у нас его нет, мы выполним генерацию прямо на сервере, где крутится база!

# Обрати внимание на порт 5432 в docker ps: он проброшен через контейнер supabase-pooler
# Мы подключаемся к localhost сервера: postgresql://postgres.your-tenant-id:<password>@127.0.0.1:5432/postgres

REMOTE_FILE="/tmp/knock_database_types_$$.ts"
SOCK="/tmp/supabase-ssh-socket"
rm -f "$SOCK"

echo "Please enter your SSH password ONCE to connect..."

# Открываем единый SSH-канал (ControlMaster) в фоне
ssh -M -S "$SOCK" -fnNT -q alex@$SUPABASE_HOME_IP_ADDRESS

if [ $? -ne 0 ]; then
  echo "❌ Failed to connect via SSH."
  exit 1
fi

# Гарантируем закрытие канала при завершении скрипта
function cleanup {
  ssh -S "$SOCK" -O exit alex@$SUPABASE_HOME_IP_ADDRESS 2>/dev/null
}
trap cleanup EXIT

echo "Generating types on the server..."

# 1. Запускаем генерацию
ssh -S "$SOCK" alex@$SUPABASE_HOME_IP_ADDRESS << EOF
  npx supabase gen types typescript --db-url "postgresql://postgres.your-tenant-id:${SUPABASE_CLI_PASSWORD}@127.0.0.1:5432/postgres" > $REMOTE_FILE
EOF

if [ $? -ne 0 ]; then
  echo "❌ Failed to generate types on the remote server."
  exit 1
fi

echo "Copying file to local machine..."

# 2. Скачиваем файл с сервера
ssh -S "$SOCK" alex@$SUPABASE_HOME_IP_ADDRESS "cat $REMOTE_FILE" > src/lib/types/database.types.ts

# 3. Подчищаем мусор и проверяем результат
if [ -s src/lib/types/database.types.ts ]; then
  ssh -S "$SOCK" alex@$SUPABASE_HOME_IP_ADDRESS "rm -f $REMOTE_FILE"
  echo "✅ Types successfully up to date in src/lib/types/database.types.ts!"
else
  echo "❌ Downloaded file is empty. Something went wrong."
  exit 1
fi
