# Backlog & Technical Debt

## Architecture
- [x] **Realtime Event Bus Refactoring**: Рассмотреть вопрос перехода с разрозненных подписок (PocketBase Realtime) на Централизованный шлюз (Realtime Gateway / Event Bus) по паттерну крупных мессенджеров (Telegram, WhatsApp). Цель: инкапсулировать работу с WebSocket в одном месте и раздавать события через `EventEmitter` или `Observer` в нужные доменные области (Чаты, Звонки, Статусы), чтобы жестко соблюдать Single Responsibility и Clean Architecture.
