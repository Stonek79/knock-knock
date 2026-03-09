#!/bin/bash
# Скрипт переключения между средами (local, staging, production)
# Usage: ./scripts/use-env.sh <environment>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="$PROJECT_ROOT/app"

if [ -z "$1" ]; then
  echo "❌ Usage: ./scripts/use-env.sh <environment>"
  echo ""
  echo "Available environments:"
  echo "  local       - Local development with Mock DB"
  echo "  staging     - Remote test Supabase (home server)"
  echo "  production  - Production Supabase"
  echo ""
  exit 1
fi

ENV_NAME="$1"
ENV_FILE="$APP_DIR/.env.$ENV_NAME"
TARGET_FILE="$APP_DIR/.env"

# Валидация: проверяем существование файла-источника
echo "🔍 Validating environment file..."

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: Environment file not found: $ENV_FILE"
  echo ""
  echo "Available environment files:"
  ls -la "$APP_DIR"/.env.* 2>/dev/null | grep -v ".env.example" || echo "  (none found)"
  echo ""
  echo "To create a new environment file:"
  echo "  1. Copy .env.example to .env.$ENV_NAME"
  echo "  2. Edit .env.$ENV_NAME with your configuration"
  echo "  3. Run this script again"
  exit 1
fi

# Валидация: проверяем, что файл не пустой
if [ ! -s "$ENV_FILE" ]; then
  echo "❌ Error: Environment file is empty: $ENV_FILE"
  echo ""
  echo "Please populate the file with required environment variables"
  echo "See .env.example for reference"
  exit 1
fi

# Валидация: проверяем наличие обязательной переменной VITE_SUPABASE_URL
if ! grep -q "VITE_SUPABASE_URL" "$ENV_FILE"; then
  echo "⚠️  Warning: VITE_SUPABASE_URL not found in $ENV_FILE"
  echo ""
  echo "This variable is required for the application to work properly"
  echo "Add it to the file or use a different environment"
  echo ""
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "✅ Validation passed"
echo ""

# Создаем резервную копию текущего .env (если существует)
if [ -f "$TARGET_FILE" ]; then
  BACKUP_FILE="$TARGET_FILE.backup.$(date +%Y%m%d%H%M%S)"
  if cp "$TARGET_FILE" "$BACKUP_FILE"; then
    echo "📦 Backed up current .env file to $(basename "$BACKUP_FILE")"
  else
    echo "⚠️  Warning: Failed to create backup of current .env"
  fi
fi

# Копируем выбранный файл
if cp "$ENV_FILE" "$TARGET_FILE"; then
  echo "✅ Switched to '$ENV_NAME' environment"
  echo "Configuration loaded from: $(basename "$ENV_FILE")"
else
  echo "❌ Error: Failed to copy $ENV_FILE to $TARGET_FILE"
  exit 1
fi

# Показываем краткую информацию о среде
case "$ENV_NAME" in
  local)
    echo "📝 Local Development Mode:"
    echo "   - Mock Supabase (in-memory)"
    echo "   - No real database connection"
    echo "   - Perfect for unit tests and UI development"
    echo ""
    echo "🚀 Start development server:"
    echo "   cd app && npm run dev"
    ;;
  staging)
    echo "🧪 Staging Mode:"
    echo "   - Remote Supabase on home server (port 8001)"
    echo "   - Real database with test data"
    echo "   - Use for E2E and integration tests"
    echo ""
    echo "⚠️  Make sure home server is accessible via VPN"
    echo ""
    echo "🚀 Start development server:"
    echo "   cd app && npm run dev"
    echo ""
    echo "🧪 Run E2E tests:"
    echo "   npx playwright test --project=staging"
    ;;
  production)
    echo "⚠️  PRODUCTION MODE ⚠️"
    echo "   - Real production database"
    echo "   - All changes are PERMANENT"
    echo "   - DO NOT run automated tests in this mode!"
    echo ""
    echo "🚀 Start development server:"
    echo "   cd app && npm run dev"
    echo ""
    echo "⚠️  Remember to switch back to staging after testing!"
    ;;
esac

echo ""
echo "💡 Tip: Check current configuration:"
echo "   cat $TARGET_FILE | grep -v '^#' | grep -v '^$'"
