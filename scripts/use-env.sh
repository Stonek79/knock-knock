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

# Проверяем существование файла
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: File $ENV_FILE not found"
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

# Создаем резервную копию текущего .env (если существует)
if [ -f "$TARGET_FILE" ]; then
  cp "$TARGET_FILE" "$TARGET_FILE.backup.$(date +%Y%m%d%H%M%S)"
  echo "📦 Backed up current .env file"
fi

# Копируем выбранный файл
cp "$ENV_FILE" "$TARGET_FILE"

echo "✅ Switched to '$ENV_NAME' environment"
echo ""
echo "Configuration loaded from: $ENV_FILE"
echo ""

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
