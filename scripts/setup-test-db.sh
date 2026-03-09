#!/usr/bin/env bash
# scripts/setup-test-db.sh

# Скрипт для подготовки тестовой базы данных Knock-Knock.
# Он сбрасывает миграции и наполняет базу начальными данными.

set -e

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}==> Подготовка тестовой базы данных...${NC}"

# Переключаемся на staging окружение, если скрипт use-env.sh существует
if [ -f "./scripts/use-env.sh" ]; then
    bash ./scripts/use-env.sh staging
else
    echo -e "${RED}Ошибка: scripts/use-env.sh не найден${NC}"
    exit 1
fi

# Проверка переменных окружения
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}Ошибка: VITE_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY не заданы в .env${NC}"
    exit 1
fi

echo -e "${BLUE}==> Сброс и применение миграций...${NC}"
# Мы используем supabase cli для пуша миграций в тестовую базу.
# DB_URL должен быть настроен на порт Staging базы (54323).
if [ -z "$DB_URL" ]; then
    # Пытаемся сконструировать DB_URL если его нет (требуется пароль в .env)
    if [ -z "$SUPABASE_CLI_PASSWORD" ] || [ -z "$SUPABASE_HOME_IP_ADDRESS" ]; then
         echo -e "${RED}Ошибка: DB_URL или (SUPABASE_CLI_PASSWORD + SUPABASE_HOME_IP_ADDRESS) не заданы${NC}"
         exit 1
    fi
    DB_URL="postgresql://postgres:${SUPABASE_CLI_PASSWORD}@${SUPABASE_HOME_IP_ADDRESS}:54323/postgres"
fi

# Применяем миграции
npx supabase db push --db-url "$DB_URL"

echo -e "${BLUE}==> Наполнение базы тестовыми данными (Seed)...${NC}"
cd infra/scripts
node seed_data.cjs

echo -e "${GREEN}✅ Тестовая база данных готова к работе!${NC}"
