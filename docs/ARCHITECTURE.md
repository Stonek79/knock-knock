# Архитектура Nemo

> **Статус:** описание подтверждённой реализации и утверждённых границ.
> Размещение сервисов: [CURRENT_STATE.md](./CURRENT_STATE.md).
> Открытые риски: [ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md).

## 1. Назначение системы

Nemo — приватный мессенджер в активной разработке. Постоянные чаты используют
PocketBase для данных/realtime, MinIO для media, Web Push для нейтральных
уведомлений и LiveKit SFU для звонков.

E2EE и минимизация серверных данных являются обязательными требованиями, но
текущий crypto lifecycle ещё не прошёл interoperability-аудит. Термины
«проверенное E2EE» и «абсолютный Zero Knowledge» пока не применяются.

## 2. Текущее размещение

```text
Клиент PWA
   │ HTTPS / SSE / WebSocket
   ▼
VPS: Nginx
   ├── FRP ──► дом: Dev/Prod PocketBase
   ├── LiveKit SFU
   └── Push/LiveKit gateway

Дом:
   ├── Dev PocketBase + отдельный pb_data
   ├── Prod PocketBase + отдельный pb_data
   └── MinIO: отдельные Dev/Prod buckets и service accounts
```

Цель пилота — вручную перенести Prod PocketBase на VPS, оставив MinIO дома из-за
стоимости хранения. До этого переноса deployed-состоянием остаётся схема выше.

## 3. Frontend

Основное направление зависимостей:

```text
pages/features/components
          ↓
      hooks/services
          ↓
      repositories
          ↓
PocketBase, IndexedDB, browser/native adapters
```

Правила:

- UI не выполняет прямые запросы к PocketBase;
- repositories не импортируют feature/UI-код;
- network connection не создаётся как side effect импорта;
- server state хранится через TanStack Query, локальный UI state — локально или
  в небольших Zustand stores;
- browser-specific APIs скрываются за adapters, чтобы PWA tests и Tauri build
  могли использовать другие реализации.

Сейчас `RealtimeGateway` нарушает часть этих правил и требует рефакторинга.

## 4. Постоянные данные

### Сообщения

Комнаты, участники и сообщения сохраняются в PocketBase и распространяются
через Realtime SSE. Серверные hooks выполняют системные операции, push queue и
часть проверок целостности.

Серверная авторизация обязана проверять membership/ownership. Клиентские
фильтры и скрытие UI не считаются защитой.

### Media

Для постоянных чатов клиент шифрует media до upload. PocketBase создаёт запись,
а file storage направляется в MinIO через S3-compatible API. Room relation,
membership rules, server size/MIME limits и cleanup должны обеспечиваться на
сервере; текущая schema требует исправления по аудиту.

Локальные IndexedDB caches являются частью threat model. Сейчас некоторые
media/Outbox данные сохраняются открыто и не полностью очищаются при logout.

### Звонки и push

LiveKit передаёт аудио/видео через SFU. Это не чистая P2P-топология. PocketBase
должен проверять membership до выдачи LiveKit token. Gateway является
внутренним сервисом и не должен доверять запросу браузера.

Push для постоянного чата должен быть минимальным и не содержать plaintext
сообщения, имя комнаты или состав участников. Credentials подписки не должны
логироваться.

## 5. Профили

- **Открытый:** доступен через безопасный search DTO; общается с открытым
  уровнем.
- **Закрытый:** не перечисляется глобально; использует внутренний
  регистрационный ID/псевдоним; общается с закрытым уровнем.
- **Одноразовый:** существует только внутри персонально приглашённой временной
  сессии.

Schema сейчас реализует только часть `public/private`, а сервер не обеспечивает
все межуровневые ограничения. Одноразовый режим не реализован.

## 6. Одноразовый runtime

Одноразовые комнаты нельзя строить поверх обычных rooms/messages/media и
task_queue. Требуется отдельный volatile service:

- состояние только в RAM;
- персональный one-use invite;
- reconnect lease 2 минуты;
- уничтожение комнаты создателем и персональный выход участника;
- no multi-device;
- media только в памяти устройств;
- нейтральный push с непрозрачным wake-up handle;
- клиентский deadline/epoch для очистки после долгого offline;
- отсутствие durable logs, PocketBase, MinIO и backups.

Техническое ограничение: большие media без временного relay передаются только
когда необходимые устройства онлайн.

## 7. Schema и migrations

`pb_schema.json` пока является snapshot, а не надёжным механизмом deployment.
Целевая модель:

1. все изменения оформляются versioned `pb_migrations`;
2. PocketBase image закреплён по версии/digest;
3. staging поднимается с нуля из migrations;
4. CI сравнивает ожидаемую и фактическую schema;
5. перед production migration создаётся проверенный restore point.

## 8. Operational boundaries

- VPS deployment только вручную по SSH и точному image digest;
- GitHub Actions не имеет ключей или маршрута к VPS;
- секреты хранятся в отдельных `.env` сервисов вне Git;
- публичные self-hosting templates не содержат реальную topology;
- logs редактируются и имеют ограниченный retention;
- backup на том же домашнем диске не считается защитой от отказа диска.

## 9. Проверки

Архитектурное изменение считается завершённым, когда согласованы code,
PocketBase migrations, TypeScript contracts, tests и документы. Программа
восстановления test suite находится в [TESTING_PLAN.md](./TESTING_PLAN.md).
