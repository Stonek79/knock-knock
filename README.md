# Knock-Knock (PrivMessenger)

PWA мессенджер с фокусом на безопасность, Ghost Mode и WebRTC звонки.

## Архитектура
Проект построен по схеме **Self-Hosted Hybrid**:
- **Frontend**: Vite + React 19 + TanStack (Router, Query, Form, Virtual).
- **Backend**: Supabase (PostgreSQL, Realtime, Auth, Storage) на домашнем сервере.
- **Infrasctructure**: VPS (Nginx + Coturn) <--> WireGuard <--> Home Server.

## Стек технологий
- **Язык**: TypeScript
- **UI**: Radix UI + CSS Modules
- **State**: Zustand
- **Crypto**: Web Crypto API + IndexedDB (Client-side E2E encryption)
- **Calls**: WebRTC (P2P + TURN on VPS)

## Структура проекта
```
/infra        # Конфигурационные файлы для деплоя
  /vps        # Конфиги для публичного сервера (Nginx, WireGuard, Coturn)
  /home       # Конфиги для домашнего сервера (Supabase, WireGuard)
/app          # Исходный код Frontend приложения (Vite)
/docs         # Документация проекта
```

## Установка и запуск (Разработка)

1. **Предварительная настройка**:
   Убедитесь, что инфраструктура развернута (см. [DEPLOYMENT.md](./DEPLOYMENT.md)).

2. **Запуск фронтенда**:
   ```bash
   cd app
   npm install
   npm run dev
   ```

3. **Переменные окружения**:
   Скопируйте шаблон и заполните значениями:
   ```bash
   cd app
   cp .env.example .env.local
   # Отредактируйте .env.local
   ```

## Тестирование

### Unit-тесты (Mock)
```bash
cd app
npm run test
```

### E2E тесты (Staging)
```bash
# 1. Настройте тестовое окружение
./scripts/use-env.sh staging

# 2. Запустите приложение
npm run dev

# 3. Запустите тесты в другом терминале
npx playwright test
```

📖 **Подробная документация:**
- [TESTING.md](./docs/TESTING.md) — Полное руководство по тестированию
- [TEST_ENV_SETUP.md](./docs/TEST_ENV_SETUP.md) — Настройка тестового окружения
- [SECURITY_CONFIG.md](./docs/SECURITY_CONFIG.md) — Безопасность конфигурации

## Документация

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — Архитектура проекта
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Руководство по развертыванию
- [DESIGN.md](./docs/DESIGN.md) — Дизайн-система
- [ROADMAP.md](./docs/ROADMAP.md) — План развития
- [RULES.md](./docs/RULES.md) — Правила разработки

## Безопасность

⚠️ **Важно:** Никогда не коммитьте `.env` файлы в git! Все секреты хранятся локально.

📖 См. [SECURITY_CONFIG.md](./docs/SECURITY_CONFIG.md) для подробностей.
