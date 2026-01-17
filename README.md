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
   Создайте файл `app/.env.local` и укажите URL вашего Supabase инстанса:
   ```env
   VITE_SUPABASE_URL=https://yourdomain.com
   VITE_SUPABASE_ANON_KEY=your-anon-key-from-supabase
   ```
