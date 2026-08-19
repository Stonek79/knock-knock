# Архитектурный аудит Nemo

> **Первый снимок:** 11 августа 2026 года
> **Последняя сверка:** 19 августа 2026 года
> **Статус:** активный список технических рисков
> **Решение:** проект продолжает разработку; публичный production-релиз пока
> имеет статус `NO-GO`.

Этот документ фиксирует расхождения между кодом, схемой PocketBase,
инфраструктурой и заявленной моделью приватности. Он не означает, что
production-релиз планировался на текущем этапе.

## Что подтверждено

- frontend проходит `npm run lint` и `npm run build`;
- Compose-конфигурации проходили синтаксическую проверку на deployed-контуре;
  локальная проверка без operational `.env` не считается текущим deployment
  evidence;
- Dev и Prod используют разные PocketBase data directories и разные MinIO
  buckets/service accounts;
- MinIO слушает loopback-интерфейс домашнего сервера;
- маршрут VPS `127.0.0.1:19000` → домашний MinIO проверен HTTP health request;
- VPS gateway собран и запущен вручную, healthcheck отвечает, секрет передан в
  контейнер, а Nginx проходит `nginx -t`;
- FRPC настроен на Happ/Xray SOCKS с дополнительно включённым FRP TLS; новый
  TLS-сеанс успешно авторизовался, но takeover proxy ещё требует проверки;
- базовый frontend следует направлению `UI → services → repositories →
  PocketBase`.
- локальные frontend-тесты подтверждают исправление исходящего экрана звонка:
  `LiveKitRoom` монтируется уже в состоянии `CALLING`, кнопка завершения
  доступна, технический `roomId` не показывается, а закрытый/неизвестный
  `profile_type` получает нейтральное имя без аватара и username;
- для одноразовых комнат frontend скрывает действия аудио- и видеозвонка;
- дублирующее увеличение счётчика непрочитанных сообщений удалено в обработчике
  realtime; отдельный двухклиентский тест счётчика ещё нужен;
- локальная часть P0.3a реализована: owner-only snapshot, capability DTO,
  parameter binding и миграция frontend consumers проверены тестами; Dev
  authorization matrix владельца остаётся открытой;
- cache-first список чатов, защита от stale logout race, валидация кеша и
  локальная очистка user-scoped данных покрыты unit-тестами; browser/runtime
  IndexedDB и реальная crypto interoperability ещё не проверены;
- retry/backoff policy Outbox и переход в `failed` покрыты unit-тестами; полный
  Service Worker delivery-cycle остаётся открытым;
- монолит `infra/home/pb_hooks/main.pb.js` разбит на модули `main.01`–`main.08`;
  единый файл удалён после локальной проверки (`node --check`, hook
  static/contract tests). Каждый callback подключает зависимости локальным
  `require`, route/hook зарегистрирован ровно один раз в предсказуемом по
  именам порядке, ни один `*.pb.js` не импортирует другой. Dev runtime
  smoke-test двух принципалов остаётся ручной приёмкой владельца.

## P0: исправить до любого публичного пилота

### 1. Единый криптографический контракт

Текущий lifecycle ключей несовместим: генерация, публикация prekey, упаковка
room key и recovery используют разные алгоритмы или не ту пару ключей.

Нужно:

- определить версии ключевого протокола и назначения identity/signing и
  agreement/prekey ключей;
- исправить `generate → publish → wrap → unwrap → backup → restore` как единый
  flow;
- разделить keystore по `userId`;
- очищать room keys, media/history cache и Outbox при logout/смене пользователя;
- добавить migration/versioning старых ключей;
- подтвердить flow интеграционными тестами на двух клиентах.

До прохождения этих проверок Nemo нельзя описывать как проверенный E2EE-клиент.

### 2. Закрыть внутренний Push/LiveKit gateway — развернуто, частичная E2E-проверка

Статус: код исправлен по итогам ревью, локальные тесты проходят, gateway вручную
развернут на VPS. Реальная доставка push и выдача LiveKit-токена подтверждены.
P0 ещё не закрывается до полного звонка между двумя клиентами, проверки логов и
повторного security review.

Внесено в код и развернуто на Dev/VPS-контуре:

- server-to-server secret `PUSH_GATEWAY_SECRET` (заголовок
  `Authorization: Bearer`, постоянновременное сравнение `timingSafeEqual`,
  fail-closed: при отсутствии секрета gateway отвечает 503);
- браузерные запросы недопустимы: CORS удалён, Nginx отклоняет запросы без
  `Authorization` (403), gateway проверяет секрет (401/503);
- LiveKit token требует membership на стороне PocketBase:
  браузер → `/api/calls/token` (PB hook: auth + membership check) →
  `/api/livekit-token` (gateway, только s2s);
- порядок middleware: авторизация → rate limiter → handler (неавторизованные
  запросы не расходуют лимит PocketBase); лимиты env парсятся безопасно
  (NaN/0/отрицательные → default);
- формат подписок нормализован: gateway принимает и вложенный `keys.{p256dh,auth}`,
  и старый плоский формат (задачи, уже лежащие в task_queue); новые задачи
  создаются во вложенном формате;
- логи и ответы gateway и хуков не содержат полных push endpoints, `res.raw`,
  внутренних URL и деталей ошибок (только статус-код и обобщённые сообщения);
- body limit (`100 KB`), rate limits (120 push/min, 60 token/min по умолчанию);
- Nginx: `limit_req` (зона `push_gateway`, 240r/m, burst 30),
  `client_max_body_size 64k`; блокировка `/push/` без `Authorization`;
- `PUSH_GATEWAY_SECRET` в Compose не переопределяется пустой строкой: домашний
  PocketBase читает секрет из `app/.env` (`env_file`), VPS gateway — из
  `infra/vps_new/.env` (то же значение).

Открыто:

- [x] локальные unit/contract тесты gateway и хуков: gateway 19/19,
  PocketBase hooks 71/71 (локальный срез 19.08.2026);
- [x] Nginx `nginx -t`, Docker build и gateway healthcheck проверены на VPS
  (11.08.2026);
- [x] env/Compose-путь секрета для домашнего PocketBase проверен локально
  (11.08.2026);
  наличие непустого `PUSH_GATEWAY_SECRET` в VPS gateway подтверждено без вывода
  значения;
- [x] проверить реальную доставку push (Dev/VPS, 11.08.2026);
- [x] проверить выдачу LiveKit token и запуск исходящего звонка (Dev/VPS,
  11.08.2026);
- [ ] проверить полный аудио- и видеозвонок между двумя клиентами, завершение с
  обеих сторон, корректное отображение закрытых профилей и отсутствие утечек в
  логах;
- [ ] проверить внешний отказ `/push/` без секрета и с неверным секретом;
- [ ] удаление маршрута `/push/` из Nginx после переноса Prod PocketBase на VPS
  (vps_new compose уже использует внутренний `http://whoami-push:4000/`);
- [ ] повторный формальный security review.

#### Инцидент FRP 11 августа 2026 года

После перезапуска `whoami-frpc` для применения MinIO proxy проявились частые
`heartbeat timeout`: FRPS закрывал listener’ы `8090/9090`, а Nginx возвращал
`502`. PocketBase локально оставался healthy; MinIO не участвовал в запросах
комнат и realtime.

История показала, что SOCKS через Happ/Xray и `tls.enable = false` были добавлены
раньше, но домашний deploy намеренно не перезапускает tunnel. Поэтому эта
комбинация фактически активировалась только при ручном restart FRPC 9 августа.
11 августа `tls.enable = true` возвращён при сохранении SOCKS-маршрута. Новый
FRPC-сеанс успешно подключился, но при старте proxy получил `proxy already
exists`; приложение в тот же момент восстановило доступ к API, потенциально
через ещё живую старую регистрацию. Поэтому TLS-изменение пока является
проверяемым исправлением, а не окончательно подтверждённой причиной. Открытые
проверки:

- отсутствие `heartbeat timeout` и `i/o deadline reached` на интервале не менее
  10 минут, затем длительный soak-test;
- исчезновение предупреждений `proxy already exists` после истечения старой
  FRPS-сессии либо контролируемого перезапуска FRPS;
- стабильность REST и `/api/realtime` одновременно;
- повторная проверка после restart Happ/Xray, FRPC и VPS-контейнеров.

### 3. Исправить PocketBase authorization

Открытыми остаются только следующие границы:

- изменение чужого message metadata — нужен отдельный read-ack/update DTO;
- call-history `expand` и фактическая runtime authorization matrix;
- применение schema snapshot и проверка file endpoint в preprod.

Коллекции `invites`, `presence_status` и `message_reactions` закрыты для
прямого клиентского чтения/изменения; media требует room/owner scope, серверную
проверку multipart MIME/размера и protected-файлы. Статусы звонка ограничены
room membership, ролью инициатора/приглашённого участника и таблицей переходов.

Базовое чтение `users` должно быть owner-only. Для поиска открытых профилей и
общих контактов нужны отдельные серверные DTO endpoints с минимальным набором
разрешённых полей.

Локальная часть защиты чтения профилей теперь реализована: snapshot содержит
owner-only `listRule`/`viewRule`, а search/contacts/keys используют отдельные
allowlist DTO и parameter binding. Эти consumer-пути больше не читают чужие
`users` напрямую. Отдельный call-history путь всё ещё должен быть проверен:
`call.repository` запрашивает связанный контекст через `expand`, поэтому это не
является доказательством privacy-safe DTO для истории звонков. Фактическое
правило в preprod и двухпользовательскую authorization matrix владелец проверяет
отдельно; crypto interoperability и release `NO-GO` остаются открытыми.

После review локально закрыты дополнительные границы P0.3b: presence больше не
подписывается напрямую на коллекцию с `null` rules, собственный DTO возвращает
id только своей записи, а shared/typing DTO документируют `user_id` как
room-scoped correlation key; media upload валидирует multipart-файл через
PocketBase request event и fail-closed отклоняет нечисловой размер, основной
media-файл protected. Room-less broadcast media не получает ослабленное
collection rule: его marker нельзя подделать обычным create/update-запросом,
а выдаёт файл только auth-маршрут через PocketBase filesystem; frontend
загружает его bearer-запросом в Blob URL.
Join звонка сверяет `call_log_id` с фактической комнатой и терминальным
статусом, запрещает инициатору принимать собственный ringing-call до запроса
токена, статусный маршрут учитывает actor role, а call push task содержит
обязательный `type`. Это только статическая/schema и contract evidence; runtime
authorization matrix, проверка реального file endpoint и полный двухклиентский
call flow остаются открытыми.

### 4. Исправить приглашения и регистрацию

Локальный hook/schema contract согласован вокруг единого секрета
`invites.token`: клиентское поле `invite_code` сохранено только как имя входа,
а в users записывается внутренний id invite. Регистрационные invites могут не
иметь `room`; комнатные invites используют тот же token и обязательную room-
ветку. Проверяются TTL, max uses, exhausted/foreign room invite, а ошибки
обработки fail-closed; регистрационный invite расходуется до сохранения user и
ошибка его записи отклоняет регистрацию. Прямая list/view выдача invites закрыта (`null` rules),
проверка комнатного invite вынесена в авторизованный POST DTO endpoint; token не
передаётся в URL.

Конкурентное расходование больше не использует `get -> check -> save`: оба
расходующих пути вызывают общий условный SQL `UPDATE` и проверяют
`rowsAffected()`, поэтому один SQLite writer не может выдать один и тот же
usage slot двум конкурентным запросам. Остаётся runtime-gate: текущий образ
PocketBase не закреплён, поэтому preprod concurrent matrix и проверка фактического
snapshot ещё обязательны.

Локальное evidence: hook/schema contract tests и route tests проходят; токены не
попадают в логи. P0.4 всё ещё не закрывается полностью: владелец должен
применить snapshot в preprod и выполнить runtime valid/expired/used/foreign matrix,
проверить конкурентное повторное использование и подтвердить, что фактические
rules совпадают со snapshot. Prod не изменяется.

### 5. Ротировать секреты

Похожие на рабочие секреты обнаружены в `scripts/keys_gen.cjs` и
`scripts/pb-setup-server.sh`. Если они когда-либо применялись, значения нужно
считать раскрытыми, заменить и удалить из Git history перед публикацией.

## P1: высокий приоритет разработки

- создать versioned PocketBase migrations и проверку schema drift;
- закрепить версии PocketBase, LiveKit, frontend image и остальных контейнеров;
- исправить task queue: типы задач, планирование, ownership и минимизацию
  payload;
- [x] исправить формат call push subscription: новые задачи используют вложенный
  `keys`, gateway сохраняет совместимость со старым плоским форматом;
- [x] убрать side effect подключения `RealtimeGateway` при импорте; проверено
  отдельным Vitest seam-тестом и полным suite без unhandled `EventSource` errors;
- исправить lifecycle silent refresh;
- зашифровать либо исключить чувствительные данные Outbox;
- очищать CacheStorage и IndexedDB при logout;
- определить log redaction и retention;
- ограничить PocketBase Admin UI и административный SSH firewall-правилами;
- добавить `.dockerignore`, healthchecks и container hardening.

## Одноразовый runtime

Текущий `isPrivate/isEphemeral` не является реализацией согласованного режима и
не должен показываться пользователю как готовая одноразовая комната.

Целевой контур отделён от обычных PocketBase, MinIO и task queue:

- персональный одноразовый invite с TTL;
- серверное состояние только в памяти;
- reconnect lease — 2 минуты;
- выход участника удаляет только его lease и ключи;
- закрытие создателем уничтожает комнату для всех;
- без multi-device;
- neutral push содержит только непрозрачный wake-up handle;
- сообщения и медиа находятся только в памяти устройств;
- никаких durable logs, backups и записей в обычных коллекциях.

После двух минут сервер не обязан хранить команду очистки. Клиент должен иметь
локальный deadline/epoch и самостоятельно уничтожить данные при следующем
запуске. Сервер может хранить только краткоживущий непрозрачный tombstone в
памяти, но не идентификаторы комнаты или участников.

Для больших файлов нужно явно выбрать одно из ограничений:

1. передача только когда отправитель и получатель онлайн; либо
2. отдельный ограниченный relay, хранящий зашифрованные chunks только в памяти.

## Release pipeline

Текущий `scripts/distill_prod.sh` является временным прототипом и не должен
публиковать release. Его должен заменить безопасный allowlist-export:

- фиксированный staging path и защита от удаления неверной директории;
- отсутствие глобальной замены строк в исходниках;
- secret/path/domain/email scan;
- удаление tests/stories/dev scripts по явному manifest;
- lint, test и build именно из экспортированной копии;
- LICENSE, SECURITY.md, threat model и воспроизводимый public CI;
- связь `commit → tag → artifact → checksum/SBOM`;
- без `--force` и без доступа public CI к VPS.

## Критерий закрытия аудита

Аудит закрывается подтверждением каждого P0:

- кодом и migration;
- автоматическими тестами;
- повторным security review;
- обновлением `CURRENT_STATE.md` и production checklist.
