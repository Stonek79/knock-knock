---
title: "P0.4 — согласовать invite registration и закрыть прямой доступ к invites"
created_at: 2026-08-19
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
---

## Текущий статус

**Задача локальной реализации закрыта 19 августа 2026 года.** Каноническое
секретное поле — `invites.token`;
`invite_code` остаётся только именем входного поля клиента. Registration hook
проверяет token, TTL, max uses и запрещает использовать комнатный invite для
создания аккаунта; расходует регистрационный invite до сохранения пользователя
и отклоняет регистрацию, если запись расходования не сохранилась. `room` в
snapshot опциональна для регистрационных invites и обязательна по смыслу для
room-flow. Прямая list/view выдача коллекции закрыта.

Локальное evidence: `invite.contract.test.cjs` и расширенные route/schema
tests проходят без подключения к API или базе; общий hook-набор — `71/71`.
Конкурентное расходование использует общий условный атомарный `UPDATE` с
проверкой `rowsAffected()`.

Отдельный runtime-gate не является незавершённостью этой локальной задачи:
владелец применяет snapshot в preprod и выполняет valid, expired,
exhausted/used, foreign и повторное конкурентное использование с двумя
обычными пользователями. Prod не изменяется. До этой проверки P0.4 не считается
закрытым для release.

## Канонический контракт

- секрет приглашения хранится только в `invites.token` с unique index;
- `room` пуст для invite регистрации и заполнен для приглашения в комнату;
- `expires_at`, `max_uses`, `uses_count` проверяются server-side;
- room join записывает зашифрованный ключ в каноническое поле
  `room_keys.encrypted_key`;
- `users.invite_code` хранит внутренний id записи invite, не token;
- прямые `listRule` и `viewRule` коллекции `invites` равны `null`;
- проверка room invite выполняется через авторизованный `POST
  /api/custom/invites/validate` с token в JSON body и возвращает узкий DTO;
- присоединение к комнате выполняется server-side `/api/invites/join`.

## Acceptance

- [x] hook и snapshot schema используют одну модель без `code/status`;
- [x] valid/expired/exhausted/foreign/malformed сценарии покрыты локальными
  tests;
- [x] прямой публичный list/view доступ к invites закрыт в snapshot;
- [x] /api/custom/invites/validate возвращает узкий allowlist DTO
  `RoomInvitePreviewDto` (`id`, `room`, `expand.room`, `expires_at`,
  `max_uses`, `uses_count`) без `token`/`created_by`; тип используется в
  repository/service/`useJoinRoom`, runtime-валидация не ожидает полную запись;
- [x] детерминированные local contract-тесты validate endpoint (valid, expired,
  exhausted, registration invite без room, несуществующая комната, отсутствие
  `token` в ответе, allowlist полей) — без обращения к API;
- [x] ошибка проверки не вызывает `e.next()` и не продолжает регистрацию;
- [x] ошибка расходования invite отклоняет регистрацию; сырой ответ PocketBase
  не показывается пользователю, известные invite/network состояния локализованы;
- [ ] Preprod snapshot применён и фактические rules проверены владельцем;
- [x] **CONCURRENCY BLOCKER (локальный код)**: регистрация и room join используют
  общий `invite_consumption.js` с условным атомарным `UPDATE` и проверкой
  `rowsAffected()`. Local contract-тест проверяет отказ второго расхода одного
  single-use invite; прежний `get -> check -> save` удалён.
- [ ] **CONCURRENCY RUNTIME GATE**: закрепить версию PocketBase, применить
  snapshot/hooks в preprod и прогнать двухпользовательскую concurrent matrix без
  over-subscription. До этой проверки изменение считается локально
  реализованным, но не подтверждённым в развернутом runtime;
- [ ] Prod не изменялся.
