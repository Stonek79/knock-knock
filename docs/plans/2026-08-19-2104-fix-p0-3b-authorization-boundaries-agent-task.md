---
title: "Задание агенту: реализация P0.3b — границы авторизации"
plan: "2026-08-19-2104-fix-p0-3b-authorization-boundaries-plan.md"
language: ru
---

# Задание агенту

Реализуй план
[`2026-08-19-2104-fix-p0-3b-authorization-boundaries-plan.md`](2026-08-19-2104-fix-p0-3b-authorization-boundaries-plan.md).
План является источником требований, технических решений и Definition of Done.
Работай по U1–U5 в порядке зависимостей.

## Главный результат

Закрой server-side authorization для `presence_status`,
`message_reactions`, `media` и `call_logs`. Сохрани рабочие heartbeat/typing,
чатовые media upload/download, реакции и звонки. Не расширяй scope до crypto,
ephemeral runtime или production rollout.

## Обязательные ограничения

1. До изменений прочитай `AGENTS.md`, `docs/CURRENT_STATE.md`,
   `docs/ARCHITECTURE_AUDIT.md`, `docs/TESTING_PLAN.md` и план P0.3b.
2. Для структурного поиска сначала используй доступные
   `codebase-memory-mcp` graph tools. Для строк, schema, hooks и Markdown
   используй `rg`; для JS/TS-синтаксиса — `ast-grep` после проверки совпадений.
   Не заявляй об использовании недоступного инструмента.
3. Сохраняй незавершённые изменения. Не выполняй `git reset`, `git checkout`,
   массовое удаление, commit или push.
4. Не подключайся к Dev/Prod/preprod API или базе прямо или косвенно. Не
   используй PocketBase SDK с реальным URL, `curl`, Admin UI, integration
   config, реальные `.env`, credentials или секреты. Runtime gate выполняет
   владелец отдельно на preprod.
5. Не меняй файлы непосредственно на серверах. Секреты не добавляй в код,
   tests, logs или документацию.
6. Не ослабляй PocketBase rules и не переноси авторизацию в frontend.
   `isOwn`, `isAdmin`, `roomId`, `references.roomId` и client membership claim
   не являются доказательством права.
7. Не меняй crypto protocol, ephemeral storage model, MinIO deployment,
   gateway secrets или VPS deploy.
8. Не редактируй `app/src/lib/types/pocketbase-types.ts` вручную. После
   согласования `infra/home/pb_schema.json` запусти только проектный
   `npm run typegen:pb` из `app` и проверь получившийся diff.
9. TypeScript strict: не добавляй `any`; на внешних границах используй
   `unknown` и явную проверку. Для PocketBase filters используй parameter
   binding.
10. Применяй узкий TDD-цикл: один согласованный contract seam → failing test →
    минимальная реализация → focused verification. Не удаляй падающие тесты
    ради зелёного результата.

## Порядок работы

### U1 — контракты и инвентаризация

- Сначала проверь текущие schema rules и callers через graph trace.
- Зафиксируй direct consumers presence/media/call и отсутствие активного
  `message_reactions` consumer, если это подтверждается поиском.
- Подготовь изолированные test doubles для auth, membership, malformed input и
  PocketBase failures.
- Tests должны падать на текущем широком доступе или небезопасном handler
  behavior, а не проверять форму внутреннего mock.

### U2 — presence

- Закрой глобальный collection access обычных клиентов.
- Добавь узкие server-owned операции для собственного upsert/heartbeat/typing
  и room-scoped чтения с auth + membership checks.
- Переведи `presence.repository.ts`, `chat-realtime.ts` и typing indicator на
  новый контракт без изменения публичных Result/error semantics.
- Проверь, что realtime callback не отдаёт неавторизованные записи и что
  `encrypted_user_id` не используется как privacy guarantee.

Обязательные тесты: self create/update/delete, forged foreign ID, member vs
non-member room typing read, missing auth, malformed room, not-found/network
mapping и безопасная realtime cleanup.

### U3 — reactions и media

- Для `message_reactions` закрой list/view, оставь только owner create/delete
  для участника комнаты, запрети update. Не придумывай frontend API, если
  consumer не найден.
- Сделай `media.room` обязательным для chat media и сохрани только явно
  проверенный server-owned vault/broadcast exception.
- Отправляй `room` отдельным FormData relation; `references.roomId` оставь
  метаданными, но не authorization input.
- Добавь server-side MIME/size validation и membership/owner checks для
  create/read/download/delete. Зашифрованные bytes не расшифровывай сервером.
- После schema snapshot запускай typegen, не изменяй generated types руками.

Обязательные тесты: reaction owner/member allow, cross-room deny, immutable
foreign reaction; media member upload с real room relation, room-less chat
deny, non-member read/delete deny, forged owner deny, oversized/disallowed MIME
deny, opaque ciphertext и отсутствие consumer у legacy reactions.

### U4 — call history/status

- Оставь direct `call_logs` update/delete закрытыми.
- Усиль `/api/calls/status`: membership, actor/initiator/participant check,
  target room consistency и allowed transition table.
- Не принимай произвольный status или call ID из другой комнаты.
- Историю переведи на privacy-safe response/allowlisted expand; не возвращай
  лишние profile fields.
- Сохрани PB membership и S2S-secret gate для LiveKit token route; не возвращай
  raw gateway response или внутренний URL.

Обязательные тесты: allowed transition, foreign/non-member call deny,
room mismatch, invalid status, illegal transition, safe history fields,
missing gateway secret и generic error response.

### U5 — типы, локальные проверки и документы

- Запусти `npm run typegen:pb` из `app` после schema changes.
- Выполни только локальные hook/frontend tests, lint, build, read-only security
  scans и `git diff --check` по плану. Не запускай integration config и любые
  команды, которые могут обратиться к API.
- Обнови `docs/ARCHITECTURE_AUDIT.md`, `docs/CURRENT_STATE.md`,
  `docs/TESTING_PLAN.md` и `.agent/artifacts/prod_readiness_plan.md` только по
  фактическим local results. Не ставь P0.3 или release в Done до preprod.
- Удали временную диагностику, abandoned code и dead fixtures.

## Критерии честного отчёта

Верни:

1. Результат по каждому U-ID и список изменённых файлов.
2. Команды и точные результаты локальных проверок.
3. Отдельный список preprod runtime checks для владельца; не выдавай их за
   выполненные агентом.
4. Незакрытые проблемы, включая schema/runtime drift или не найденный consumer.
5. Статус: `готово к review`, `частично готово` или `заблокировано`.

Commit и push не выполняй.

