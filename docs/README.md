# Документация Nemo

Добро пожаловать в документацию проекта Nemo — защищенного мессенджера с P2P шифрованием.

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
- [Текущее состояние](./CURRENT_STATE.md) — актуальная deployed-схема и правила
  трех уровней профиля.
- [Архитектура](./ARCHITECTURE.md) — Общее описание системы.
- [Безопасность](./SECURITY_CONFIG.md) — Стандарты шифрования и хранения.

Исторические документы перемещены во внутренний архив:
`.agent/artifacts/docs-archive/`.
