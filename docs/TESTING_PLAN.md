# План восстановления тестов Nemo

> **Статус:** активный план. Существующие тесты частично устарели после
> рефакторинга и пока не являются release gate.

## Текущая база

На снимке от 12 августа 2026 года:

- `npm run lint` — успешно;
- `npm run build` — успешно;
- frontend suite после срезов 2.4–2.6 и hardening cleanup: 114 passed, 2 skipped;
  unit-сценарии зелёные, integration setup на production-like URL безопасно
  пропускается;
- после отложенной инициализации `RealtimeGateway` необработанных ошибок нет;
- PocketBase integration tests пропущены.

Падающие тесты нельзя просто удалить. Сначала для каждого теста определяется,
устарел ли только mock/ожидание или тест обнаруживает реальный дефект.

## Рабочий цикл обратной связи

Для новой наблюдаемой возможности или исправления используется один узкий
вертикальный срез: согласованная публичная test seam, один падающий тест,
минимальная реализация до зелёного результата. Нельзя сначала написать набор
тестов для предполагаемой архитектуры, а затем массово реализовывать их;
следующий срез выбирается только после результата предыдущего.

Граница теста должна быть зафиксирована в task/specification или отдельно
согласована с владельцем. Тест проверяет продуктовый контракт, а не внутренние
коллаборации, приватные методы или форму mock.

Для bug или регрессии до выдвижения гипотез требуется запустить feedback loop,
который воспроизводит точный симптом. Он должен быть agent-runnable,
детерминированным и достаточно быстрым для повторного запуска. Если такой
сигнал построить нельзя, нужно сообщить, что уже проверено, и запросить
безопасный redacted артефакт, доступ к воспроизводящему окружению либо
разрешение на временную диагностическую инструментализацию.

Ни fixture, ни вывод этого цикла не могут содержать секреты, plaintext,
полные endpoints, auth tokens, идентификаторы пользователей/комнат или данные
Dev/Prod. Отладочные логи помечаются уникальным префиксом и удаляются до
завершения задачи.

## Этап 1. Восстановить тестовый фундамент

- [x] убрать соединение `RealtimeGateway` как side effect импорта;
- добавить управляемый mock EventSource/realtime transport;
- создать единый PocketBase test adapter с актуальными `getOne`, `filter`,
  realtime и auth APIs;
- разделить unit и integration setup;
- запретить случайное обращение unit tests к Dev/Prod API;
- добиться завершения Vitest без unhandled errors.

**Gate:** [x] suite завершается детерминированно, даже если отдельные assertions
ещё падают. Оставшиеся падения ведутся отдельными вертикальными срезами этапа 2.

## Этап 2. Обновить существующие unit tests

Очередность:

1. [x] crypto backup/recovery;
2. [x] room creation и key distribution;
3. [x] message deletion и local-delete metadata;
4. [x] auth store и logout cleanup;
5. [x] chat actions/UI;
6. Outbox и Service Worker.

Для каждого изменённого теста проверяется, что он утверждает продуктовый
контракт, а не внутреннюю форму устаревшего mock.

**Срез 1 (crypto backup/recovery).** `useKeysBackup.test.ts` утверждал
устаревший контракт: моки `exportKeys`/`restoreKeys` возвращали raw-значение,
`null` и бросали исключение. Актуальный контракт `useKeystore` —
`Promise<Result<KeyBackup, AppError>>` / `Promise<Result<void, AppError>>`.
Тесты переписаны под Result-контракт (`ok`/`err`+`appError`), fixture бэкапа
содержит плейсхолдеры base64, а не реальные ключи. Заодно исправлен дефект
реализации `handleRestoreBackup`: `err` от `restoreKeys` теперь показывает
ошибку, а не success. Криптопротокол (`recovery.ts`) не менялся — ADR не
требуется. Проверено: 8/8 тестов зелёные, lint и build проходят.

**Срез 2 (room creation и key distribution).** `room.test.ts` утверждал
устаревшие моки PocketBase: `getFullList` вместо актуального `getOne` для
профилей, прямой `collection().create` вместо `pb.createBatch()`+
`batch.send()`, отсутствие `pb.filter()`. Моки переписаны под реальные API
через локальный тестовый адаптер (в рамках test scope, production PocketBase
API не менялся). Тесты утверждают продуктовый контракт
`createRoom -> Result<{ roomId, roomKey }, RoomError>`: нет участников или
отсутствует профиль/ключ участника -> `MISSING_KEYS_ERROR` со списком
отсутствующих ID; сетевая ошибка получения профиля (не 404) -> `DB_ERROR`;
успех -> room key генерируется и шифруется отдельно на каждого участника,
`createRoomWithMembersAndKeys` получает корректные room/members/keys,
возвращаются `roomId` и `roomKey`; ошибка `encryptRoomKeysForMembers` не
создаёт комнату (`CRYPTO_ERROR`); ошибка `batch.send` -> `DB_ERROR`;
дублирующиеся user IDs не дублируют участников; в payload создания нет
сырых ключей или plaintext. Заодно исправлен доказанный production-дефект в
`userRepository.getProfilesByIds`: `Promise.all`+`getOne` отвергал весь
батч при одном 404, делая недостижимым код `MISSING_KEYS_ERROR` со списком
отсутствующих ID в `createRoom` и `addMembersToGroup`. Заменено на
`Promise.allSettled`: 404 пропускается (вызывающий код вычисляет
отсутствующих), прочие ошибки распространяются как `NETWORK_ERROR`.
Криптопротокол не менялся — ADR не требуется. Проверено: 11/11 тестов
зелёные, lint и build проходят, full suite без unhandled errors. Остаточные
падения (9) относятся к этапам 2.3–2.5 (message deletion, auth store, chat
actions/UI) и не затрагивают room creation.

**Дополнение к срезу 2 (типобезопасная обработка ошибок repository).** В
`userRepository.getProfilesByIds` сохранён стандартный discriminant
`PromiseSettledResult.status === "fulfilled"`; самодельная константа не нужна.
Для `PromiseRejectedResult.reason` используется `unknown` и явный type guard:
только объект с числовым `status === 404` считается отсутствующим профилем;
malformed-значения и остальные статусы возвращаются как `NETWORK_ERROR`.
Добавлены 7 repository-level тестов с реальным `ClientResponseError`,
структурным 404 и malformed rejection. Проверено: 7/7 тестов зелёные.

**Срез 3 (message deletion и local-delete metadata).** `message.test.ts`
утверждал устаревшие моки и ожидания. Падения были stale mocks/expectations, а
не дефектами удаления:

- тест «своё сообщение» мокал только `update` и ожидал soft-delete, тогда как
  фактический контракт: сервис сначала вызывает `getMessageById` (`getOne`),
  затем для своего/admin сообщения вызывает `hardDeleteMessage` (`pb delete`);
- тест «чужое сообщение» ожидал оператор `{"deleted_by+": "my-id"}`, тогда как
  фактический контракт пишет `metadata.deleted_by` как массив внутри поля
  `metadata` через `updateMessage`, сохраняя остальные metadata.

Тесты переписаны под фактический PocketBase-контракт с локальным тестовым
адаптером (`getOne/update/delete`, мок `mediaService`/`mediaDb` — без
IndexedDB/облака). Покрыто 12 сценариев: своё (hard delete) и его идемпотентность,
чужое (добавление `currentUserId` в `metadata.deleted_by` с сохранением остальных
metadata) и его идемпотентность, NOT_FOUND (очистка локальных media + success,
без лишнего update/delete), ошибки repository update/delete → `DB_ERROR` без
ложного success, media cleanup (в т.ч. не-фатальный сбой облачной очистки).

Заодно исправлен доказанный производственный дефект в
`messageRepository.getMessageById`: он маппил ЛЮБУЮ ошибку `getOne` в
`NOT_FOUND_ERROR`, из-за чего сетевой сбой при загрузке сообщения попадал в ветку
«не найдено → успех» и `deleteMessage` возвращал ложный success. Теперь только
настоящий `status === 404` маппится в `NOT_FOUND_ERROR`, прочие ошибки —
в `NETWORK_ERROR`, поэтому `deleteMessage` возвращает `DB_ERROR` при сетевом
сбое (по шаблону `userRepository.getProfilesByIds`). Криптопротокол и
authorization rules не менялись; клиентский `isOwnMessage`/`isAdmin` не является
server-side авторизацией и unit-тестами не подтверждается. Путь удаления
(messages/room_members) на сервере не менялся, ADR не требуется.

**Вынос общего type-guard'а.** Проверка «error это 404» вынесена в общий
`isNotFoundError(reason: unknown)` в `@/lib/utils/errors.ts` (cast-free
narrowing через `unknown`: только объект с числовым `status === 404`). Guard
используется во всех call-site'ах, убрав дублирование и касты
`as { status?: number }`: `messageRepository.getMessageById`,
`userRepository.getByUsername`/`getProfilesByIds`,
`roomRepository` (3 места) и `pushRepository.findByEndpoint`. Семантика guard
для 404/network совпадает с прежней, поэтому поведение и тесты не изменились.

Проверено targeted: `message.test.ts` 12/12, `user.repository.test.ts`,
`room.test.ts`, `RealtimeGateway.test.ts`, `useKeysBackup.test.ts` зелёные;
`npm run lint` и `npm run build` без ошибок.

**Срез 4 (auth store и logout cleanup).** `auth.test.ts` содержал stale
expectation и не покрывал перенос refresh-throttle между аккаунтами:

- тест «валидная инициализация» вызывал `expect(UserMapper.toDomain)
  .toHaveBeenCalledWith(...)`, хотя `UserMapper` не мокался (мокался только
  `AuthService`). Убрано; тест теперь проверяет наблюдаемое состояние
  (`pbUser`, `profile.id`/`profile.username`, `loading`), а не внутренний вызов
  mapper;
- тест «ошибка инициализации» мокал `NETWORK_ERROR` и ждал полной очистки
  `pbUser`/`profile`. Это противоречит фактическому контракту `fetchProfile`:
  сетевая ошибка не разлогинивает («сетевая ошибка — сохраняем сессию»), а
  очистка происходит только при `UNAUTHORIZED_ERROR` (401). Сценарий разбит на
  два: 401 → полная очистка + `AuthService.logout`; сетевая ошибка → локальная
  сессия сохраняется, `loading` завершается, logout не вызывается;
- падение `loading === true` было вызвано модульным throttle refresh (10s),
  который живёт вне zustand-состояния и не сбрасывается `setState`. Тест смены
  аккаунта сначала воспроизвёл, что второй `refreshSession` не вызывается при
  быстром logout/login; `signOut` теперь сбрасывает throttle текущей сессии,
  после чего сценарий проходит без искусственного ожидания 11 секунд. Для
  изоляции остальных тестов используется monotonic fake `Date` в `beforeEach`.

Подтверждённый store-level auth/logout контракт (тестами, 5/5):

- `initialize` валидным пользователем → `pbUser` = актуальный record,
  `profile` = доменный профиль текущего пользователя, `loading` = false;
- ошибка 401 → `signOut` (очистка `pbUser`/`profile` + `AuthService.logout`),
  `loading` = false, ложный success исключён;
- сетевая ошибка → `loading` = false, локальная сессия сохраняется;
- `signOut` вызывает `AuthService.logout()` и
  `ChatRealtimeService.destroy()`, сбрасывает `pbUser`/`profile` и throttle
  refresh текущей сессии. Внутренние эффекты этих сервисов (`pb.authStore.clear`,
  `chatCryptoService.clearCache`, unsubscribes и `clearInterval`) этим тестом не
  проверяются.
- смена аккаунта: после `signOut` состояния предыдущего пользователя нет,
  повторная инициализация другого пользователя не сохраняет `id` предыдущего.

Реально проверено на уровне store: вызовы cleanup seams для auth state и
realtime. Внутренняя очистка PocketBase auth session и realtime требует
отдельных service-level тестов. Keystore (room keys), media/history cache, Outbox и CacheStorage при
logout НЕ очищаются — это открытые пункты P1 в `ARCHITECTURE_AUDIT.md`
(«очищать CacheStorage и IndexedDB при logout»), а не текущий контракт
`signOut`. По правилу «не расширять cleanup до новых хранилищ без evidence»
добавлять их в этот срез не стали. Криптопротокол и authorization rules не
менялись; ADR не требуется. Изменены `app/src/stores/auth/auth.test.ts`,
`app/src/stores/auth/index.ts` и этот план.

**Срез 5 (chat actions/UI и chat.unread).** Исправлены stale test doubles и
fixtures, без изменений production-кода:

- `chat.actions.test.tsx`: fixture использует доменное поле `sender`, а не
  устаревшее `sender_id`; проверки удаления и редактирования используют
  фактические объектные контракты `{ messageId, isOwnMessage }` и
  `{ messageId, newContent }`;
- mock `@/lib/services/room` возвращает `getChatRoomData` с минимальным
  корректным `Result`, необходимым для рендера `ChatRoom`, и сохраняет
  `RoomService.findOrCreateDM`;
- mock `@/lib/services/room/queries` стал partial mock через `importOriginal`:
  переопределяется только `getRoomUnreadCounts`, остальные exports, включая
  `findOrCreateDM`, сохраняются;
- targeted acceptance: `chat.actions.test.tsx` 5/5 и
  `chat.unread.test.tsx` 2/2.

**Полный snapshot suite (после среза 2.5):** 98 passed, 2 skipped; 2 test files
failed (100 тестов всего). Оставшиеся два failure — guarded integration setup:
`media.repository.integration.test.ts` и `message.integration.test.ts` блокируют
очистку при текущем production-like PB URL. Они не являются unit-регрессиями и
должны запускаться только на изолированном staging.

**Gate Stage 2.5:** targeted chat actions/unread, lint и build зелёные. Unit
gate закрыт; integration/release evidence на изолированном staging ещё не
получен. Commit пока не выполнялся.

**Дополнение после среза 2.5 (безопасный integration setup).** Два
интеграционных файла больше не падают в `beforeAll` на production-like PB URL:
`isDatabaseCleanupAllowed()` используется как условие `describe.skipIf`. При
обычном unit-запуске небезопасный контур получает `skipped`, а на изолированном
staging с явным `VITE_ALLOW_DB_CLEANUP=true` тесты по-прежнему выполняются.
Защитный throw в `cleanupDatabase` сохранён. Cleanup требует одновременно
этот флаг и URL из allowlist локальных test/staging-контуров; production и
неизвестные URL запрещены даже при флаге. Проверено: полный suite —
`22 passed | 2 skipped` test files, `98 passed | 2 skipped` tests; lint, build и
`git diff --check` зелёные. Это не является эксплуатационным evidence staging.

**Hardening integration cleanup policy.** `isDatabaseCleanupAllowed()` теперь
требует одновременно `VITE_ALLOW_DB_CLEANUP=true` и URL из явного allowlist
локальных/test/staging-контуров (`localhost`, `127.0.0.1`, `dev-api`,
`staging-api`, `test-api`). Production и неизвестные URL запрещены даже при
флаге. Добавлены 11 unit-проверок policy; полный suite после изменения —
`26 passed | 2 skipped` test files, `114 passed | 2 skipped` tests. Это не
заменяет server-side запрет записи `is_test` пользователем и не является
эксплуатационным staging evidence.

Server-side hook в `infra/home/pb_hooks/security.pb.js` теперь запрещает
обычному пользователю выставлять, снимать или менять `is_test` во всех
коллекциях, где поле присутствует; superuser seed-контур сохранён. Runtime
Негативный runtime-тест добавлен в
`src/test/is-test-policy.integration.test.ts`, но запуск 12 августа 2026 года
заблокирован недоступностью DNS `dev-api.whoami.ninja` (`ENOTFOUND`). Поэтому
его результат остаётся `NO-GO` до запуска из сети с доступом к staging.

Полный локальный suite после добавления guarded integration-файла:
`26 passed | 3 skipped` test files, `114 passed | 4 skipped` tests. Browser-only
test setup теперь безопасно загружается и в Node integration-конфиге.

В `infra/home/pb_hooks/main.pb.js` фильтры проверки `invite_code` и поиска
пользователей по `q` переведены на PocketBase parameter binding. Эти значения
больше не конкатенируются в filter expression; runtime-проверка endpoint’ов
остаётся частью следующего security integration среза.

**Срез 6a (Outbox persistence contract).** Добавлены unit-тесты публичного
`outboxDb` без подключения к PocketBase или реальной IndexedDB:

- `add`/`getPending` возвращают только сообщения со статусом `pending` и не
  смешивают пользовательские базы;
- `updateStatus` изменяет статус и `retryCount`, `remove` удаляет запись;
- targeted acceptance: `media-db.outbox.test.ts` 2/2.

Это только persistence-wrapper evidence. Background Sync в `sw.ts`, повторная
отправка, восстановление room key, retry после сети и logout-очистка Outbox ещё
не подтверждены и не позволяют отметить пункт 6 как завершённый.

**Полный snapshot suite (после среза 6a):** 100 passed, 2 skipped; 23 test
files passed, 2 skipped. Lint, build и `git diff --check` зелёные.

**Срез 6b (Background Sync retry policy).** Retry-решение вынесено в чистый
`getOutboxFailureUpdate` и подключено в `sw.ts`:

- при `retryCount < 5` сообщение остаётся `pending`, счётчик увеличивается на 1;
- при `retryCount >= 5` сообщение получает статус `failed`, повторный retry не
  планируется;
- targeted acceptance: `outbox-retry.test.ts` 2/2.

Это проверяет только детерминированную policy-функцию. Реальный Service Worker
цикл (`sync` event, перечисление IndexedDB, room-key recovery, upload и
доставка) ещё не запускался в браузере и не считается подтверждённым.

**Полный snapshot suite (после среза 6b):** 102 passed, 2 skipped; 24 test
files passed, 2 skipped. Lint, build и `git diff --check` зелёные.

**Срез 6c (регистрация Service Worker).** Добавлена явная регистрация PWA
worker через `virtual:pwa-register` в `main.tsx`; до этого `sw.ts` собирался,
но браузерный worker не регистрировался. Добавлен Playwright smoke-тест
`e2e/service-worker.spec.ts`, проверяющий `navigator.serviceWorker.ready`,
scope и активный `sw.js`.

Проверено в локальном Chromium mock-проекте: smoke 1/1. Это подтверждает
регистрацию worker, но не полный Background Sync с реальным Outbox,
IndexedDB, room-key recovery и доставкой сообщения.

Повторная проверка Background Sync API показала: локальный Chromium видит
`registration.sync`, но отклоняет `sync.register("sync-outbox")` с
`UnknownError: Background Sync is disabled`; тест фиксирует это как `skipped`,
а не как зелёное runtime-доказательство. В staging/браузере с включённым
Background Sync этот тест должен быть выполнен отдельно.

Генерируемые Playwright-файлы теперь направляются в игнорируемые
`playwright-report/` и `test-results/`; соответствующие пути зафиксированы в
`app/playwright.config.ts` и `app/.gitignore`. Исторический tracked
`app/e2e-report` оставлен без изменений, чтобы не создавать удаления в
текущем рабочем коммите.

## Этап 3. Security integration tests

Поднимать изолированный PocketBase с versioned migrations и проверять минимум:

- invite нельзя перечислить или прочитать напрямую;
- регистрация без valid invite отклоняется;
- private user не виден через list/search;
- пользователь вне комнаты не читает media/messages/call logs;
- нельзя изменить чужой presence, message metadata или call status;
- LiveKit token нельзя получить без membership;
- push gateway отклоняет запрос без внутреннего секрета;
- server-side upload limits работают;
- Dev и Prod credentials/buckets не пересекаются.

## Этап 4. Crypto interoperability tests

Обязательный сценарий использует два независимых клиента:

1. оба генерируют и публикуют ключи;
2. клиент A создаёт room key;
3. клиент B разворачивает его своей agreement private key;
4. сообщения и media расшифровываются в обе стороны;
5. backup создаётся реальными production-функциями;
6. чистое устройство восстанавливает ключи;
7. смена пользователя не получает доступ к ключам предыдущего аккаунта;
8. logout уничтожает согласованные локальные данные.

## Этап 5. Offline/realtime/E2E

- offline → Outbox → reconnect → ровно одна доставка;
- истёкший auth token во время background delivery;
- gap recovery и дедупликация realtime events;
- logout при непустом Outbox;
- смена пользователя и очистка CacheStorage;
- media upload/download через MinIO;
- звонок двух участников и закрытой группы;
- restart PocketBase, gateway и потеря домашнего MinIO.

## Этап 6. Одноразовые комнаты

Эти тесты добавляются вместе с отдельным volatile runtime, не поверх обычных
PocketBase collections:

- invite персональный, одноразовый и протухает;
- reconnect до 2 минут сохраняет сессию;
- после 2 минут lease и server state отсутствуют;
- выход участника не закрывает комнату для остальных;
- закрытие создателем уничтожает комнату;
- после рестарта сервера одноразовые данные не восстанавливаются;
- сообщения, media, keys и push payload не появляются в PocketBase, MinIO,
  task queue, logs и backups;
- следующий запуск клиента очищает локальные данные по deadline/epoch.

## Правила CI

- быстрые unit tests выполняются на каждый pull request;
- integration/E2E работают только с изолированными disposable services;
- Dev и Prod endpoints запрещены в CI;
- flaky test не перезапускается молча: сначала сохраняются причина и diagnostic;
- release gate требует lint, typecheck/build, unit, security integration и smoke;
- количество skipped tests публикуется и не может незаметно увеличиваться.
