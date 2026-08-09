#!/bin/bash

# Скрипт Дистилляции проекта Nemo (Очистка перед Prod-релизом)
# Этот скрипт создает чистую копию проекта, готовую к пушу в публичный/анонимный репозиторий.

set -e

SOURCE_DIR=$(pwd)
DEST_DIR="../nemo-release"

echo "🚀 Начинаем дистилляцию проекта Nemo..."

# 1. Очистка или создание папки релиза
if [ -d "$DEST_DIR" ]; then
    echo "⚠️  Папка $DEST_DIR уже существует. Очищаем..."
    rm -rf "$DEST_DIR"
fi
mkdir -p "$DEST_DIR"

echo "📂 Копируем исходные файлы..."
# 2. Копируем только разрешенные папки и файлы
cp -R app "$DEST_DIR/"
mkdir -p "$DEST_DIR/infra"
cp -R infra/vps_new "$DEST_DIR/infra/prod"
cp -R infra/home/pb_hooks "$DEST_DIR/infra/prod/"
cp infra/home/pb_schema.json "$DEST_DIR/infra/prod/"
cp Dockerfile.app "$DEST_DIR/"
cp README.md "$DEST_DIR/"
cp .gitignore "$DEST_DIR/"

echo "🧹 Очищаем мусор и dev-файлы..."
# 3. Удаляем мусорные папки внутри скопированного
find "$DEST_DIR" -name "node_modules" -type d -prune -exec rm -rf '{}' +
find "$DEST_DIR" -name "dist" -type d -prune -exec rm -rf '{}' +
find "$DEST_DIR" -name ".env" -type f -delete
find "$DEST_DIR" -name ".env.local" -type f -delete
find "$DEST_DIR" -name ".DS_Store" -type f -delete
rm -rf "$DEST_DIR/app/src-tauri/target"

echo "🛡 Создаем чистый .env.example..."
cat << 'EOF' > "$DEST_DIR/app/.env.example"
VITE_PB_URL=https://api.yourdomain.com
VITE_LIVEKIT_URL=wss://api.yourdomain.com
EOF

cat << 'EOF' > "$DEST_DIR/infra/prod/.env.example"
# Секреты для Push и LiveKit
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
EOF

echo "✨ Дистилляция завершена!"
echo "➡️  Чистый проект находится в папке: $DEST_DIR"
echo ""
echo "Следующие шаги:"
echo "1. cd ../nemo-release"
echo "2. git init && git add -A && git commit -m 'Initial release'"
echo "3. git remote add origin git@github-nemo:Nemo-Messenger/nemo-messenger.git"
echo "4. git push -u origin main --force"
