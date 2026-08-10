# План восстановления тестов Nemo

> **Статус:** активный план. Существующие тесты частично устарели после
> рефакторинга и пока не являются release gate.

## Текущая база

На снимке от 9 августа 2026 года:

- `npm run lint` — успешно;
- `npm run build` — успешно;
- unit suite: 13 failed, 50 passed, 2 skipped;
- Vitest сообщил о 5 необработанных ошибках `EventSource is not defined`;
- PocketBase integration tests пропущены.

Падающие тесты нельзя просто удалить. Сначала для каждого теста определяется,
устарел ли только mock/ожидание или тест обнаруживает реальный дефект.

## Этап 1. Восстановить тестовый фундамент

- убрать соединение `RealtimeGateway` как side effect импорта;
- добавить управляемый mock EventSource/realtime transport;
- создать единый PocketBase test adapter с актуальными `getOne`, `filter`,
  realtime и auth APIs;
- разделить unit и integration setup;
- запретить случайное обращение unit tests к Dev/Prod API;
- добиться завершения Vitest без unhandled errors.

**Gate:** suite завершается детерминированно, даже если отдельные assertions ещё
падают.

## Этап 2. Обновить существующие unit tests

Очередность:

1. crypto backup/recovery;
2. room creation и key distribution;
3. message deletion и local-delete metadata;
4. auth store и logout cleanup;
5. chat actions/UI;
6. Outbox и Service Worker.

Для каждого изменённого теста проверяется, что он утверждает продуктовый
контракт, а не внутреннюю форму устаревшего mock.

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
