# Документация Nemo

Nemo — разрабатываемый приватный мессенджер. E2EE является целевой функцией, но
текущий криптографический lifecycle проходит переработку и пока не должен
считаться подтверждённым security-аудитом. Звонки используют LiveKit SFU, а не
чистую P2P-топологию.

## Технологический стек
- **Frontend**: React 19, TypeScript, Vite
- **Backend**: PocketBase v0.26+ (JS Hooks, SQLite, Realtime SSE)
- **Offline Storage**: Dexie.js (IndexedDB)
- **Media**: WebCodecs API + mp4-muxer (Accelerated processing)
- **Crypto**: Web Crypto API (E2E AES-GCM)

## Структура папок
- `/app` — Исходный код фронтенд-приложения (Vite, React, Radix UI).
- `/infra` — конфигурации Docker, Nginx, FRP, LiveKit, PocketBase и MinIO.
- `/docs` — Проектные правила и технические спецификации.

## Ключевые разделы
- [Текущее состояние](./CURRENT_STATE.md) — актуальная deployed-схема и правила
  трех уровней профиля.
- [Архитектурный аудит](./ARCHITECTURE_AUDIT.md) — подтверждённые риски и
  порядок исправления.
- [План восстановления тестов](./TESTING_PLAN.md) — программа обновления unit,
  integration и E2E tests.
- [Архитектура](./ARCHITECTURE.md) — проектные принципы; отдельные утверждения
  требуют повторной проверки по аудиту.
- [Безопасность](./SECURITY_CONFIG.md) — целевые требования, а не сертификат
  текущей реализации.
- [Аутентификация](./AUTH_STRATEGY.md) — рабочая спецификация, которую нужно
  привести к трём уровням профиля.

Исторические документы перемещены во внутренние архивы:

- `.agent/artifacts/docs-archive/` — прежняя пользовательская и техническая
  документация;
- `.agent/artifacts/.archive/` — завершённые или заменённые implementation
  plans.
