# ADR-0004 — Границы модулей PocketBase hooks

**Статус:** Принято для локальной проверки; Dev runtime smoke-test выполняется владельцем отдельно
**Дата:** 2026-08-14

## Контекст

Единый `infra/home/pb_hooks/main.pb.js` содержал lifecycle-хуки,
ограничение регистрации, доставку push, bootstrap/cron-задачи и
admin/user/invite/room-read routes. Часть callbacks захватывала переменные
верхнего уровня (`UsersDto`, `USERS_ROUTE_LIMITS`, `SUPERUSERS_COLLECTION_NAME`,
`parseJsonBody`). В PocketBase обработчики могут выполняться в изолированном
JSVM-hook-контексте, поэтому неявные замыкания — это runtime-риск
`ReferenceError` и скрытые связи между регистрациями.

Дополнительно в `docs/adr/` существует коллизия нумерации: два файла с номером
ADR-0002 (`0002-lazy-realtime-connection-initialization.md` и
`0002-test-data-marker-and-environment-isolation.md`). Существующие ADR не
перезаписываются; новое решение получает свободный уникальный номер 0004.

## Решение

PocketBase auto-loads плоские `*.pb.js` в алфавитном порядке имён, поэтому
порядок регистрации фиксируется числовыми именами. Монолит разбит на модули:

- `main.01-user-lifecycle.pb.js` — self-room и каскадная очистка пользователя;
- `main.02-registration.pb.js` — контроль регистрации и invite-ограничения;
- `main.03-message-delivery.pb.js` — post-create message и push-задачи;
- `main.04-scheduled-tasks.pb.js` — bootstrap и cron cleanup/broadcast;
- `main.05-admin-broadcast.pb.js` — admin broadcast и миграция системных комнат;
- `main.06-user-capabilities.pb.js` — contacts, public search, keys;
- `main.07-invites.pb.js` — генерация invite-кода;
- `main.08-room-read.pb.js` — отметка сообщений прочитанными.

Чистые зависимости вынесены в `db.js`, `users_dto.js`, `task_helpers.js`,
`hook_constants.js` (имена маршрутов, лимиты, `_superusers`) и `request_utils.js`
(разбор body). Единый `main.pb.js` удалён.

Правила модульной границы:

- `*.pb.js` регистрирует только свои hooks/routes и не экспортирует регистрацию
  через `module.exports`;
- ни один `*.pb.js` не выполняет `require()` другого `*.pb.js`;
- каждый callback подключает `db.js`, DTO, константы и request-хелперы локальным
  `require` внутри себя; свободных ссылок на верхний уровень в callbacks нет;
- строки маршрутов, используемые при `routerAdd`, — registration-time и берутся
  из констант (`hook_constants.js`) на верхнем уровне модуля;
- порядок загрузки задаётся полным алфавитным порядком имён: существующие
  `calls.pb.js` и `invites.pb.js`, затем `main.01`…`main.08`, затем
  `security.pb.js` и `tasks.pb.js`.

## Альтернативы

- Оставить единый файл: сохранялась бы связность, но росла бы сложность и
  оставались бы рискованные верхнеуровневые замыкания.
- Экспортировать регистрации через `module.exports` и вызывать их из одного
  index-файла: противоречит авто-загрузке PocketBase и добавляет явный порядок
  загрузки, который и так задаётся именами файлов; создаёт зависимости между
  `*.pb.js`.

## Последствия

Разбивка проверена локально: `node --check`, hook static/contract tests, app
build/lint/test и `git diff --check` зелёные. Dev runtime smoke-test двух
принципалов выполняется владельцем отдельно и не является подтверждением
production. Schema, API-контракты, DTO и business logic не менялись.
