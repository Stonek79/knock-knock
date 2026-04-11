# Документация Knock-Knock

Добро пожаловать в документацию проекта Knock-Knock — защищенного мессенджера с P2P шифрованием.

## Технологический стек
- **Frontend**: React 19, TypeScript, Vite
- **Backend**: PocketBase v0.26+ (JS Hooks, SQLite, Realtime SSE)
- **Offline Storage**: Dexie.js (IndexedDB)
- **Media**: WebCodecs API + mp4-muxer (Accelerated processing)
- **Crypto**: Web Crypto API (E2E AES-GCM)

## Структура папок
- `/app` — Исходный код фронтенд-приложения (Vite, React, Radix UI).
- `/infra` — Конфигурации инфраструктуры (Docker, Nginx, WireGuard).
- `/docs` — Проектные правила и технические спецификации.

## Ключевые разделы
- [Архитектура](./ARCHITECTURE.md) — Общее описание системы.
- [Дорожная карта (Roadmap)](./ROADMAP.md) — Статус и планы разработки.
- [План реализации v2](./IMPLEMENTATION_PLAN_v2.md) — Детальный план текущих работ.
- [Безопасность](./SECURITY_CONFIG.md) — Стандарты шифрования и хранения.
- [Медиа-система v3](./plans/media_system_v3.md) — План современной обработки медиа.
