---
title: "Разбиение PocketBase hooks на изолированные функциональные модули"
created_at: 2026-08-14
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
---

## Цель

Разделить `infra/home/pb_hooks/main.pb.js` на небольшие функциональные
модули, сохранив поведение Nemo и порядок регистрации обработчиков. После
разбивки каждый route/hook должен самостоятельно получать свои зависимости и
работать в изолированном PocketBase JSVM-контексте.

Единого файла-входа для PocketBase не требуется: PocketBase автоматически
загружает файлы `*.pb.js` из каталога hooks. Файлы обрабатываются в порядке имён,
поэтому имена новых модулей должны явно фиксировать порядок там, где он влияет
на результат.

## Почему текущий файл опасен

`main.pb.js` одновременно содержит:

- lifecycle hooks регистрации и удаления пользователя;
- ограничение регистрации по invite;
- доставку push после создания сообщения;
- cron/bootstrap-обработчики;
- admin broadcast routes;
- contacts/search/keys routes;
- invite generation и отметку сообщений прочитанными.

Кроме размера, есть runtime-риск: часть обработчиков замыкает переменные,
объявленные в верхнем уровне (`UsersDto`, `USERS_ROUTE_LIMITS`,
`SUPERUSERS_COLLECTION_NAME`, `parseJsonBody`). В PocketBase обработчики
регистрации и route callbacks могут выполняться в изолированном контексте, поэтому
зависимости должны быть доступны внутри самого обработчика через локальный
`require` или локальное определение.

Официальные ограничения загрузки и изоляции: [PocketBase JS overview](https://pocketbase.io/docs/js-overview/).

## Границы

Входит:

1. Разделение `main.pb.js` без изменения API-контрактов и бизнес-правил.
2. Устранение неявных замыканий между hook-файлами.
3. Вынос переиспользуемых чистых функций в `.js`-модули.
4. Статические, unit- и локальные runtime-проверки.
5. ADR и обновление текущего архитектурного состояния.

Не входит:

- изменение PocketBase schema или правил доступа;
- изменение криптографического протокола;
- подключение агента к Dev/Prod PocketBase, SSH, FRP или Admin UI;
- миграция `pb_migrations`;
- изменение endpoint-путей, DTO и клиентских repository-контрактов, кроме
  исправлений, необходимых для сохранения текущего поведения;
- commit, push и deploy.

## Целевое устройство файлов

Файлы остаются плоскими в `infra/home/pb_hooks/`: PocketBase должен видеть их
автоматически, без собственного index-файла и без `require()` одного `*.pb.js`
из другого.

Предлагаемая последовательность:

| Файл | Ответственность |
|---|---|
| `main.01-user-lifecycle.pb.js` | создание self-room/invite-связей и cleanup после удаления пользователя |
| `main.02-registration.pb.js` | проверка регистрации и invite-ограничения |
| `main.03-message-delivery.pb.js` | post-create message и постановка push-задач |
| `main.04-scheduled-tasks.pb.js` | bootstrap и cron cleanup/broadcast jobs |
| `main.05-admin-broadcast.pb.js` | создание broadcast-задачи, history и preview routes |
| `main.06-user-capabilities.pb.js` | contacts, public search и keys routes |
| `main.07-invites.pb.js` | генерация invite-кода |
| `main.08-room-read.pb.js` | route отметки сообщений прочитанными |
| `hook_constants.js` | только неизменяемые имена маршрутов, лимиты и локальные значения |
| `request_utils.js` | чистый разбор/нормализация request body без PocketBase side effects |
| `db.js`, `users_dto.js`, `task_helpers.js` | сохраняются как существующие pure/helper modules; API не расширять без необходимости |

Имена `main.01`–`main.08` являются предложением, а не требованием. Перед
переносом нужно зафиксировать фактический порядок регистрации и проверить, что
новые файлы по алфавиту сохраняют нужный порядок относительно `calls.pb.js`,
`invites.pb.js`, `security.pb.js` и `tasks.pb.js`. Нельзя удалять старый файл,
пока все его регистрации не перенесены и не прошли проверки.

## Правила модульной границы

1. `*.pb.js` регистрирует только свои hooks/routes и не экспортирует
   регистрацию через `module.exports`.
2. Один `*.pb.js` не делает `require()` другого `*.pb.js`.
3. Каждый callback получает `DB`, DTO, константы и request helpers локально;
   запрещены свободные ссылки на переменные из другого callback или верхнего
   уровня, если они нужны во время исполнения callback.
4. Pure helpers (`hook_constants.js`, `request_utils.js`) не открывают сеть,
   не создают PocketBase client и не имеют import-time side effects.
5. Все строки маршрутов, имена коллекций, поля и лимиты берутся из существующих
   константных модулей; новые магические строки не добавлять.
6. Комментарии объясняют причину ограничения или порядок загрузки, но не
   ссылаются на внутренние номера задач/планов вроде `P0.3a`.
7. Сохранить parameter binding и `requireAuth` на существующих маршрутах.
8. Ошибки и статус-коды не менять только ради разбиения; каждое изменение
   поведения должно быть отдельным явно отмеченным исправлением.

## Последовательность реализации

### U1. Инвентаризация и characterization baseline

**Файлы:** `infra/home/pb_hooks/main.pb.js`, все `infra/home/pb_hooks/*.pb.js`,
`infra/home/pb_hooks/__tests__/`.

- Составить таблицу всех `routerAdd`, `onRecord*`, `onBootstrap` и cron
  регистраций: файл, порядок, коллекция/route, используемые зависимости.
- Зафиксировать существующие пути, middleware, status-коды, лимиты и
  parameter binding до переноса.
- Проверить, какие обработчики используют общие переменные и какие имеют
  побочные эффекты при загрузке модуля.
- Не подключаться к любой БД или API; baseline строится по локальному коду и
  тестовым doubles.

**Приёмка:** таблица покрывает все регистрации, а список зависимостей и порядок
загрузки приложены к плану/ADR или представлены в тестируемом локальном
артефакте без секретов и реальных данных.

### U2. Вынос чистых общих зависимостей

**Файлы:** `infra/home/pb_hooks/hook_constants.js`,
`infra/home/pb_hooks/request_utils.js`, при необходимости существующие
`users_dto.js` и `task_helpers.js`.

- Перенести только действительно общие значения и pure functions.
- Сохранить имена и типы существующих значений, чтобы не менять route contract.
- Добавить unit-тесты для body parsing, лимитов и нормализации; покрыть пустое,
  повреждённое и слишком большое тело.
- Не выносить PocketBase `$app`, `$security`, `$apis`, `Record` или `routerAdd`
  в обычные modules: они доступны только в JSVM callback-контексте.

**Приёмка:** helper tests проходят; helpers не имеют сетевых/import-time
side effects; `node --check` проходит для всех hooks.

### U3. Перенос lifecycle, registration, delivery и jobs

**Файлы:** новые `main.01-user-lifecycle.pb.js`–
`main.04-scheduled-tasks.pb.js`; исходный `main.pb.js` временно сохраняется.

- Переносить по одному функциональному блоку.
- В каждом callback добавить локальные `require` зависимостей.
- Не менять SQL/filter semantics, порядок `e.next()`, обработку ошибок,
  idempotency self-room и расписание jobs.
- После каждого блока удалить его регистрацию из временного `main.pb.js` и
  проверять отсутствие двойной регистрации.

**Приёмка:** static registration test подтверждает ровно одну регистрацию для
каждого ожидаемого route/hook; тесты cleanup, registration, push и task helpers
остаются зелёными.

### U4. Перенос routes отдельными capability-модулями

**Файлы:** `main.05-admin-broadcast.pb.js`,
`main.06-user-capabilities.pb.js`, `main.07-invites.pb.js`,
`main.08-room-read.pb.js`.

- Разнести admin broadcast, user capability routes, invite generation и room
  read route по разным файлам.
- Внутри каждого callback локально подключать `db.js`, `users_dto.js`,
  `hook_constants.js` и `request_utils.js` только при использовании.
- Сохранить `$apis.requireAuth()`, admin/membership checks, parameter binding,
  DTO allowlists и fail-closed ответы.
- Для user capability routes отдельно проверить contacts/search/keys, чтобы
  разбиение не вернуло прямой `publicExport()` или широкий users read.
- После переноса выполнить поиск по старому файлу и убедиться, что там не
  осталось route/hook registrations.

**Приёмка:** route contract tests подтверждают paths, auth middleware,
parameter binding, allowlist DTO, лимиты и error statuses; нет дубликатов routes.

### U5. Удаление монолита и документация

**Файлы:** `infra/home/pb_hooks/main.pb.js`,
`docs/ARCHITECTURE_AUDIT.md`, `docs/CURRENT_STATE.md`, `docs/TESTING_PLAN.md`,
`docs/adr/0004-pocketbase-hook-module-boundaries.md`.

- Удалить `main.pb.js` только после полного переноса и локальной проверки.
- Если в репозитории сохраняется bootstrap-only `main.pb.js`, он должен быть
  минимальным и не импортировать другие `*.pb.js`; это исключение нужно явно
  обосновать в ADR.
- Зафиксировать, что PocketBase auto-loads flat `*.pb.js`, а порядок задаётся
  именами файлов.
- Описать запрет на свободные верхнеуровневые зависимости в callbacks и
  правило локального `require`.
- Разрешить конфликт нумерации ADR-0002 до создания нового ADR-0004; не
  перезаписывать существующие ADR.
- В `CURRENT_STATE` отметить, что разбивка проверена локально, но Dev runtime
  smoke-test выполняется владельцем отдельно.

## Проверки

Порядок локальных проверок после каждого значимого этапа:

1. `node --check` для всех `infra/home/pb_hooks/*.js`.
2. Hook unit/static tests, включая проверку единственной регистрации,
   отсутствие route duplicate, отсутствие `publicExport()` на user routes и
   наличие локальных dependency requires.
3. В `app`: `npm run build` и targeted repository/service tests, затронутые
   capability routes.
4. `npm test -- --run` для полного frontend suite.
5. `npm run lint` и `git diff --check`.
6. Read-only `semgrep` по hooks (ruleset для JS security/correctness) и
   `gitleaks` с redacted output; findings не подавлять автоматически.
7. Владелец выполняет отдельный Dev runtime smoke-test двух principals,
   поскольку агент не подключается к БД/API. Проверяются один раз каждый route,
   auth failure, обычный успешный путь и fail-closed ошибка.

## Риски и откат

- **Двойная регистрация:** старый и новый файл одновременно регистрируют route
  или hook. Митигируется static registration test и удалением блока только
  после проверки.
- **Изменение порядка hooks:** числовые имена должны сохранять порядок;
  критичные lifecycle/интеграционные проверки выполняются после каждого блока.
- **JSVM ReferenceError:** все callback dependencies локальны; добавляется
  статическая проверка свободных ссылок и локальный require contract test.
- **Скрытое изменение API:** пути, DTO и коды ответа сравниваются с baseline.
- **Смешение старого и нового кода:** `main.pb.js` удаляется последним.

Откат локального кода — обычный возврат к предыдущему Git commit. Изменения
Dev/Prod PocketBase в этой задаче не выполняются, поэтому rollback базы не
требуется.

## Результат и критерий готовности

Работа готова, когда:

- в `main.pb.js` не осталось функционального монолита или он удалён;
- каждый callback имеет явные локальные зависимости;
- routes/hooks зарегистрированы ровно один раз в предсказуемом порядке;
- локальные hook/frontend проверки зелёные либо каждое оставшееся падение
  классифицировано как pre-existing и явно отражено в документации;
- ADR и состояние проекта описывают новую структуру без внутренних номеров
  задач в runtime-комментариях;
- Dev runtime smoke-test подтверждён владельцем отдельно.

