# План восстановления тестов Nemo

> **Статус:** активный план. Существующие тесты частично устарели после
> рефакторинга и пока не являются release gate.

## Текущая база

На снимке от 12 августа 2026 года:

- `npm run lint` — успешно;
- `npm run build` — успешно;
- frontend suite: 9 failed, 77 passed, 2 skipped (после срезов Stage 2.1 и
  2.2; room/repository slices зелёные);
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
3. message deletion и local-delete metadata;
4. auth store и logout cleanup;
5. chat actions/UI;
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

**Gate:** все актуальные unit tests зелёные; устаревшие сценарии либо переписаны,
либо удалены с объяснением в commit.

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
