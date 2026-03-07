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

echo "Generating types from $SUPABASE_HOME_IP_ADDRESS..."

npx supabase gen types typescript --db-url "postgresql://postgres.your-tenant-id:${SUPABASE_CLI_PASSWORD}@${SUPABASE_HOME_IP_ADDRESS}:5432/postgres" > src/lib/types/database.types.ts
if [ $? -eq 0 ]; then
  echo "✅ Types successfully generated in src/lib/types/database.types.ts"
else
  echo "❌ Failed to generate types."
  exit 1
fi
