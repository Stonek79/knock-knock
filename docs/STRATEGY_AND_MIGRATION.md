# Мастер-документ: Стратегия развития Knock-Knock (v7.0 + Vite 8)

> **Дата**: 19.03.2026
> **Статус**: 📋 На рассмотрении
> **Контекст**: Миграция Supabase → PocketBase + оценка перехода на Vite 8

---

## I. ТЕКУЩЕЕ СОСТОЯНИЕ ПРОЕКТА

### Технологический стек
| Компонент | Версия | Состояние |
|:---|:---|:---|
| React | 19.2.0 | ✅ Актуально |
| Vite | **7.3.1** | ⚠️ Вышел Vite 8 |
| TypeScript | 5.9.3 | ✅ Актуально |
| Vitest | 4.0.18 | ✅ Актуально |
| @vitejs/plugin-react | **5.1.2** | ⚠️ Вышел v6 |
| Supabase JS | 2.90.1 | ❌ Будет удалён |
| Biome | 2.3.13 | ✅ Актуально |
| Storybook | 10.2.6 | ✅ Актуально |
| Playwright | 1.58.1 | ✅ Актуально |

### Инфраструктура Staging
| Компонент | Статус | Проблема |
|:---|:---|:---|
| БД (PostgreSQL) | ✅ Работает | — |
| Auth (GoTrue) | ✅ Работает | — |
| Nginx (VPS) | ✅ Работает | — |
| **Realtime (v2.72.0)** | **❌ Не работает** | Крипто-ловушка AES-128-ECB |

---

## II. ПЛАН МИГРАЦИИ: Supabase → PocketBase (Мастер-план v7.0)

### Обоснование решения
Supabase Realtime v2.72.0 оказался **несовместим** с self-hosted инфраструктурой из-за обязательного шифрования метаданных тенантов (AES-128-ECB). После 6+ неудачных попыток (plain SQL, эмуляция AES на Node.js, SINGLE_TENANT) принято решение о миграции на PocketBase — легковесный бэкенд с встроенным Realtime (SSE).

### Ключевые цифры миграции
| Метрика | Значение |
|:---|:---|
| Файлов затронуто | **43** |
| Файлов на удаление | 11+ (mock-система, SQL-скрипты) |
| Файлов на создание | 4 (pocketbase.ts, типы, offline, docker) |
| Файлов на рефакторинг | ~28 (все слои: auth, CRUD, realtime, хуки) |
| Расчетное время | **~5 дней** |
| Фаз | 9 |

### Пофазный план

#### Фаза 1: Инфраструктура (День 1) ✅ ВЫПОЛНЕНО
- Остановка Supabase (`docker compose -p staging down -v`)
- Настройка Nginx: `http2`, `proxy_buffering off`, `proxy_read_timeout 86400s`
- Запуск PocketBase через Docker
- Создание суперадмина

#### Фаза 2: Схемы и безопасность (День 1–2) ✅ ВЫПОЛНЕНО
- Создание 7 коллекций: `profiles`, `rooms`, `room_members`, `messages`, `room_keys`, `favorites`, `presence_status`
- API Rules для каждой коллекции
- Индексы на критические поля

#### Фаза 3: Ядро (День 2) ✅ ВЫПОЛНЕНО
- `npm install pocketbase`, удаление `@supabase/supabase-js`
- Новый `pocketbase.ts` (сервисный слой)
- Обновление `env.ts` (`VITE_PB_URL`)

#### Фаза 4: Auth (День 2–3) ✅ ВЫПОЛНЕНО
- Миграция на `pb.authStore`
- Работающая регистрация и логин через PocketBase

#### Фаза 5: CRUD-сервисы (День 3) ✅ ВЫПОЛНЕНО
- `MessageService`, `RoomService` переведены на PocketBase
- Реализован слой репозиториев для абстракции от SDK

#### Фаза 6: Realtime + Presence (День 3–4) ⚠️ В ПРОЦЕССЕ
- `useMessageSubscription` → ✅ Работает (SSE)
- `useChatListSubscription` → ✅ Работает
- `usePresence` — 🏗 Требуется реализация через коллекцию `presence_status` (heartbeat)

#### Фаза 7: Хуки чтения (День 4) ✅ ВЫПОЛНЕНО
- Миграция всех основных хуков (`useChatList`, `useMessages`, `useUnreadCounts`) на новую архитектуру

#### Фаза 8: Тесты (День 4–5) 🏗 В ПРОЦЕССЕ
- Обновление Vitest под слой репозиториев (см. `test_fixes_plan.md`)
- Удаление остатков моков Supabase

#### Фаза 9: Очистка и Документация (День 5) 🏗 В ПРОЦЕССЕ
- [MODIFY] ARCHITECTURE.md, README.md (✅ Сделано)
- [MODIFY] TESTING.md, SECURITY_CONFIG.md (🏗 В процессе)

---

## III. АНАЛИЗ РИСКОВ PocketBase

| Риск | Вероятность | Влияние | Митигация |
|:---|:---|:---|:---|
| **SSE лимит (6 соединений на домен в HTTP/1.1)** | Средняя | Высокое | HTTP/2 в Nginx (обязательно) |
| **SQLite "Database is locked"** | Низкая | Среднее | WAL режим (включен по умолчанию), индексы |
| **Нет Presence API** | 100% | Высокое | Коллекция `presence_status` + PATCH heartbeat |
| **Другая модель File Storage** | 100% | Среднее | Файлы как поля коллекций, рефакторинг `uploadMedia.ts` |
| **Авто-обновление токенов на мобилках** | Средняя | Среднее | `pb.authStore.isValid` + `authRefresh()` на `focus` |
| **Nginx "душит" SSE** | Высокая без конфига | Критическое | `proxy_buffering off`, `proxy_cache off`, `proxy_read_timeout 24h` |

---

## IV. ОЦЕНКА ПЕРЕХОДА НА VITE 8

### Что нового в Vite 8
| Фича | Описание | Ценность для нас |
|:---|:---|:---|
| **Rolldown** | Замена esbuild + Rollup на единый Rust-бандлер | 🟢 Быстрее билды в 10-30x |
| **Oxc трансформации** | Замена esbuild для JS/TS transforms | 🟢 Быстрее dev-сервер |
| **lightningcss** | Встроенная CSS минификация | 🟢 Лучше CSS, -1 зависимость |
| **@vitejs/plugin-react v6** | Babel убран, используется Oxc | 🟢 Меньше install size |
| **tsconfig paths** | Встроенная поддержка алиасов | 🟡 Можно убрать плагин, если используем |
| **Browser console forwarding** | Логи браузера → терминал | 🟢 Удобно для агентного кодинга |
| **Vite Devtools** | Встроенные дебаг-инструменты | 🟡 Опционально |

### Анализ совместимости с нашим проектом

| Аспект | Наш статус | Риск |
|:---|:---|:---|
| **Node.js** | 20.19+ / 22.12+ (тот же, что в Vite 7) | ✅ Нет проблем |
| **vite.config.ts** | Стандартный, без кастомного `esbuild` | ✅ Совместимость из коробки |
| **@vitejs/plugin-react v5** | Работает с Vite 8 (официально подтверждено) | ✅ Можно обновить позже |
| **Vitest 4.x** | Нужно чекнуть совместимость с Vite 8 | ⚠️ Возможно потребуется обновление |
| **Storybook 10.x** | @storybook/react-vite | ⚠️ Нужна проверка |
| **vite-plugin-pwa** | Может потребовать обновление | ⚠️ Нужна проверка |
| **@tanstack/router-plugin** | Может потребовать обновление | ⚠️ Нужна проверка |
| **manualChunks** (object form) | Удалено в Vite 8 | ✅ Мы не используем |

### Стоимость перехода
| Действие | Трудозатраты | Блокирует ли основную работу? |
|:---|:---|:---|
| `npm install vite@8` | 1 мин | Нет |
| Проверка `vite build` | 10 мин | Нет |
| Обновление `plugin-react` до v6 | 5 мин | Нет |
| Проверка Vitest совместимости | 15 мин | Возможно |
| Проверка Storybook | 15 мин | Возможно |
| Проверка PWA плагина | 10 мин | Возможно |
| **Итого** | **~1 час** | **Нет** |

### Рекомендация по Vite 8

> [!IMPORTANT]
> **Рекомендация: Обновить на Vite 8 ПЕРЕД миграцией на PocketBase.**
>
> **Обоснование:**
> 1. Миграция на Vite 8 минимально рискованна (~1 час работы).
> 2. 10-30x ускорение билдов пригодится во время интенсивного рефакторинга PocketBase.
> 3. `@vitejs/plugin-react` v5 совместим с Vite 8 (можно обновить позже).
> 4. Лучше делать одно обновление за раз — сначала бандлер, потом бэкенд.

---

## V. РЕКОМЕНДУЕМЫЙ ПОРЯДОК ДЕЙСТВИЙ

```
                    ┌────────────────────┐
                    │  1. Vite 7 → 8     │  ~1 час
                    │  (низкий риск)     │
                    └────────┬───────────┘
                             │
                    ┌────────▼───────────┐
                    │  2. Тесты + Lint   │  ~30 мин
                    │  (верификация)     │
                    └────────┬───────────┘
                             │
              ┌──────────────▼──────────────┐
              │  3. PocketBase Migration    │  ~5 дней
              │  (Мастер-план v7.0)         │
              └─────────────────────────────┘
```

---

## VI. ССЫЛКИ

- [Мастер-план v7.0 (PocketBase)](file:///Users/alexstone/.gemini/antigravity/brain/3a5bd481-64f4-4c04-9a5b-01af81372558/implementation_plan.md.resolved)
- [PocketBase Risk Mitigation](file:///Users/alexstone/.gemini/antigravity/brain/3a5bd481-64f4-4c04-9a5b-01af81372558/pocketbase_risks_mitigation.md.resolved)
- [Vite 8 Release Blog](https://vite.dev/blog/announcing-vite8)
- [Vite 8 Migration Guide](https://vite.dev/guide/migration)
- [STAGING_MASTER_HANDOVER.md](file:///Users/alexstone/WebstormProjects/knock-knock/docs/STAGING_MASTER_HANDOVER.md) — История Staging
