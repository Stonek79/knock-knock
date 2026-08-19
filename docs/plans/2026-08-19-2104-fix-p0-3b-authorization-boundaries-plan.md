---
title: "P0.3b — закрыть авторизацию presence, media и call history - Plan"
type: fix
date: 2026-08-19
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# P0.3b — закрыть авторизацию presence, media и call history - Plan

## Goal Capsule

- **Objective:** Обычный пользователь не может читать или изменять чужие записи `presence_status`, `media`, `message_reactions` и `call_logs`; штатные чат, медиа, реакции и звонки продолжают работать через серверные проверки membership/ownership.
- **Means:** Закрыть прямые PocketBase rules и перевести неоднозначные операции на узкие server-owned routes, сохранив текущий слой `repositories → PocketBase/adapters` (KTD1–KTD4).
- **Authority:** `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/ARCHITECTURE_AUDIT.md`, этот план и фактические контракты текущего кода. Клиентское состояние не является доказательством права.
- **Execution profile:** Локальный код, schema snapshot, contract/unit tests. Никаких подключений к Dev/Prod API. Runtime matrix выполняется владельцем отдельно на preprod.
- **Stop conditions:** Не ослаблять rules, не менять криптографический протокол, не реализовывать ephemeral runtime и не объявлять P0.3 закрытой без preprod evidence.

---

## Product Contract

### Summary

P0.3a закрыл прямое чтение чужих `users`, а P0.4 согласовал invites. Остались четыре коллекции, через которые можно обойти privacy boundary или подделать состояние: presence, реакции, media и история звонков. Этот срез закрывает их серверную авторизацию без подключения к рабочим контурам.

### Problem Frame

Текущий snapshot даёт auth-пользователю глобальное чтение `presence_status` и `message_reactions`, широкое чтение `media`, а `call_logs` и custom call routes не везде связывают действие с конкретным участником. Media также принимает `room` только внутри JSON `references`, поэтому сервер не может надёжно применить membership rule. Frontend уже вызывает эти пути, поэтому простое ужесточение snapshot без миграции consumers сломает чат.

### Requirements

#### Presence

- R1. Запись `presence_status` принадлежит одному пользователю; создание, heartbeat, typing-update и удаление разрешены только владельцу записи через серверный контракт.
- R2. Чтение presence возвращает только собственный статус или статусы пользователей, с которыми у запрашивающего есть подтверждённая общая комната; глобальный list/view обычного пользователя закрыт.
- R3. Проверка typing в комнате сначала проверяет membership запрашивающего, затем ограничивает выборку этой комнатой; `encrypted_user_id` не используется как доказательство права и не показывается как технический идентификатор.

#### Reactions

- R4. Реакция создаётся только авторизованным участником комнаты сообщения и только от имени текущего пользователя.
- R5. Реакция не редактируется после создания; удаление разрешено только её владельцу либо серверному cleanup-пути.
- R6. List/view реакций ограничены участниками комнаты сообщения. Если активного frontend-consumer коллекции нет, прямой клиентский доступ закрывается без добавления нового API.

#### Media

- R7. Постоянная запись `media` имеет обязательную server-visible связь с комнатой для chat media; JSON `references.roomId` остаётся только вспомогательными метаданными.
- R8. Создание, чтение, скачивание и удаление media проверяют membership/owner на сервере; room-less media допускается только для явно существующего server-owned vault/broadcast сценария.
- R9. Сервер применяет допустимый MIME/type и размер файла независимо от клиентской валидации; зашифрованные bytes не расшифровываются сервером.

#### Call history and status

- R10. Чтение `call_logs` ограничено участниками связанной комнаты и не раскрывает лишние profile fields через неконтролируемый `expand`.
- R11. Создание и обновление call log выполняются только через server-owned operation, проверяющую membership, инициатора/участника и допустимый переход статуса.
- R12. `call_log_id` из запроса не может обновить запись из другой комнаты или произвольный status; неизвестный ID, чужая комната и недопустимый переход возвращают детерминированную ошибку.

#### Общие ограничения

- R13. Ошибки авторизации fail-closed и не содержат raw PocketBase response, токены, push endpoints, plaintext или внутренние gateway URLs.
- R14. Все динамические PocketBase filters используют parameter binding; лимиты списка и размера входа проверяются на серверной границе.
- R15. Локальные tests не создают PocketBase client для Dev/Prod и не используют реальные URL или секреты.

### Success Criteria

- Для каждой из четырёх коллекций есть локальный contract-test, который доказывает отказ чужого пользователя и успешный разрешённый сценарий.
- Frontend repository/service consumers используют только новый или ужесточённый контракт и сохраняют существующие Result/error semantics.
- `infra/home/pb_schema.json`, hooks и сгенерированные `pocketbase-types.ts` согласованы; generated file изменён только через `npm run typegen:pb` из `app`.
- Документы отделяют локальное evidence от обязательной ручной preprod authorization matrix.

### Scope Boundaries

В scope входят schema rules, PocketBase hooks/routes, media upload payload, call status transitions, активные repository consumers и локальные contract/unit tests.

Не входят: crypto interoperability и E2EE protocol, ephemeral runtime, MinIO deployment/backup policy, автоматический VPS deploy, изменение секретов, UI redesign, полная browser E2E и runtime-проверка Dev/Prod.

### Deferred to Follow-Up Work

- Preprod two-principal matrix для всех четырёх коллекций.
- Полный двухклиентский audio/video call и realtime/FRP soak.
- Versioned PocketBase migrations, pinned image versions и schema-drift gate.
- Отдельный volatile service для одноразовых комнат и их media.

---

## Planning Contract

### Key Technical Decisions

- KTD1. Для `presence_status` закрыть прямой collection API и использовать узкие server-owned операции, потому что текущая схема не содержит relations, достаточных для безопасного declarative membership filter.
- KTD2. Для `message_reactions` не создавать новый frontend API без найденного consumer; сначала закрыть list/view и оставить только минимальные create/delete правила для существующего server/client contract.
- KTD3. Сделать `media.room` обязательным для chat media и передавать его отдельным FormData-полем, потому что `references.roomId` нельзя использовать как server-side authorization input.
- KTD4. Call status обновляется через существующий `/api/calls/status` после проверки membership, ownership и перехода из конечного набора статусов; прямой updateRule остаётся закрытым.
- KTD5. Schema changes проходят через локальный snapshot и typegen-скрипт; фактическое применение и runtime rollback выполняет владелец на preprod. Это продолжает границу P0.3a/P0.4 и не создаёт скрытую migration-инфраструктуру.
- KTD6. Room-less broadcast media не открывается через общее collection rule:
  server-owned marker разрешён только trusted path и защищён на create/update,
  authenticated custom route проверяет marker/creator/filename и стримит файл
  через PocketBase filesystem. Frontend получает Blob URL через bearer-запрос
  для image/video/audio/document/lightbox, поэтому file auth не обходится.

### High-Level Technical Design

```mermaid
flowchart TD
  Client[Frontend repository/service] -->|auth request| Route[PB custom route or constrained collection rule]
  Route --> Auth[auth + ownership/membership check]
  Auth --> Data[(PocketBase collection)]
  Data --> DTO[allowlisted response / neutral error]
  Client -->|media file| MediaRoute[media create/read/delete boundary]
  MediaRoute --> MediaCheck[room relation + membership + MIME/size]
  MediaCheck --> Media[(media + protected file)]
  Client -->|call status| CallRoute[/api/calls/status]
  CallRoute --> Transition[membership + actor + allowed transition]
  Transition --> Calls[(call_logs)]
```

The route boundary owns authorization. PocketBase collection rules remain a second fail-closed layer where the relation model supports it. No client-provided `isOwn`, `isAdmin`, `roomId` claim or `references` JSON is accepted as sufficient proof by itself.

### Research and Current Patterns

- `infra/home/pb_schema.json` currently has auth-wide rules for `presence_status` and `message_reactions`, broad `media` list/view, optional `media.room`, and closed direct `call_logs` update rules.
- `infra/home/pb_hooks/security.pb.js` already centralizes field-level security and test-marker protection; new rules should extend this boundary rather than add client-side checks.
- `app/src/lib/repositories/presence.repository.ts` is consumed by `chat-realtime.ts` and `useTypingIndicator.ts`; it currently performs direct collection reads/writes.
- `app/src/lib/repositories/media.repository.ts` is consumed by `mediaService`, message upload and outbox paths; upload currently sends room only inside `references`.
- `app/src/lib/repositories/call.repository.ts` is consumed by `logsSlice` and call session flows; history currently requests `expand: "room,initiator"`.
- `message_reactions` has schema/types/constants but no active repository/service caller in the current app graph. The implementation must verify this before adding or removing a route.

### Assumptions

- Existing server-owned hook code can perform membership queries and save records without exposing superuser credentials to the browser.
- Current PocketBase runtime supports the relation/filter syntax used by the exported schema; if a local contract test disproves this, keep collection rules closed and route the operation through a hook instead of weakening access.
- Existing broadcast/vault media paths are identified before making `room` mandatory; no legacy path may silently become room-less chat media.

### Sequencing

U1 establishes contract tests and exact current consumers. U2 closes presence and migrates its callers. U3 closes reactions and media together with generated types. U4 hardens call history and status transitions. U5 runs local verification and updates current-state documentation. Preprod acceptance starts only after all local units are reviewed.

### Risks and Dependencies

- Tightening presence rules without migrating `chat-realtime` causes silent offline/typing failures. U2 must keep heartbeat and typing error mapping observable.
- Making media room mandatory can break broadcast or vault uploads. U1 must enumerate those paths before U3 changes the schema.
- Call status transitions can reject legitimate reconnect/accept flows if the state machine omits an existing transition. U4 must derive the allowed transitions from `sessionSlice`, hook behavior and current call tests.
- Generated types can drift if edited manually. U3/U5 must run the repository typegen script only after the schema snapshot is settled.

---

## Implementation Units

### U1. Freeze authorization contracts and consumer inventory

**Goal:** Add deterministic local tests that describe the four collection boundaries and record every active caller before changing rules.

**Requirements:** R1–R15.

**Dependencies:** None.

**Files:** `infra/home/pb_schema.json`, `infra/home/pb_hooks/security.pb.js`, `infra/home/pb_hooks/__tests__/pb_schema_auth_options.test.cjs`, `infra/home/pb_hooks/__tests__/presence.contract.test.cjs` (new), `infra/home/pb_hooks/__tests__/media.contract.test.cjs` (new), `infra/home/pb_hooks/__tests__/calls.pb.test.cjs`, `app/src/lib/repositories/presence.repository.ts`, `app/src/lib/repositories/media.repository.ts`, `app/src/lib/repositories/call.repository.ts`.

**Approach:**

1. Capture current schema rules and explicitly assert the desired closed/default state for the collections under change.
2. Use graph traces and string search to list active presence, media and call consumers; confirm that `message_reactions` has no active consumer before deciding its client surface.
3. Define red-capable route/handler test doubles that model auth, membership, malformed input and PocketBase errors without creating a real PB client.

**Execution note:** Start with contract tests that fail against the current broad rules or handler behavior. Do not implement a broad refactor before the failing boundary is specific.

**Test scenarios:**

- Authenticated user A is denied global list/view for presence, reactions and media.
- User A is denied a call log whose room has no membership for A.
- Missing auth, malformed IDs and missing room relations return deterministic errors without raw responses.
- The consumer inventory test or static assertion identifies the current direct calls that U2–U4 must migrate.

**Verification:** The tests name the intended owner/member boundary and fail before implementation; no test starts a network client.

### U2. Replace direct presence access with an owner/member boundary

**Goal:** Preserve heartbeat, typing and realtime behavior while preventing forged or global presence access.

**Requirements:** R1–R3, R13–R15.

**Dependencies:** U1.

**Files:** `infra/home/pb_hooks/presence.pb.js` (new or existing hook boundary), `infra/home/pb_hooks/security.pb.js`, `infra/home/pb_schema.json`, `infra/home/pb_hooks/__tests__/presence.contract.test.cjs`, `app/src/lib/repositories/presence.repository.ts`, `app/src/lib/services/chat-realtime.ts`, `app/src/features/chat/message/hooks/useTypingIndicator.ts`, focused presence/realtime tests.

**Approach:**

1. Close direct collection list/view/create/update/delete for ordinary clients unless a rule is provably owner-safe.
2. Add narrow server operations for own presence upsert/heartbeat/typing and room-scoped presence read; each operation checks auth, record ownership and room membership server-side.
3. Keep the existing domain methods and Result errors at the repository boundary so UI does not learn PocketBase authorization details.
4. Ensure realtime subscriptions and returned records are filtered to authorized room/self scope; do not use the misleading `encrypted_user_id` field name as a privacy claim.

**Patterns to follow:** `infra/home/pb_hooks/main.08-room-read.pb.js` for authenticated membership checks and `app/src/lib/utils/result.ts` for error mapping.

**Test scenarios:**

- A can create or upsert only A’s presence and heartbeat it; a forged user ID is rejected.
- A can read typing presence for a room where A is a member; A cannot read a non-member room or global presence list.
- A cannot update or delete B’s presence record even when A knows its record ID.
- Invalid room/user IDs and missing auth return 400/401/403 without leaking record data.
- Repository methods map denied/not-found/network failures to the existing typed Result errors and keep realtime cleanup safe.

**Verification:** Local hook/repository tests pass; direct presence collection calls from active consumers are gone or provably limited to owner-safe operations.

### U3. Close reactions and make media room authorization enforceable

**Goal:** Prevent cross-room reaction/media access and make the server-visible media relation match the client upload contract.

**Requirements:** R4–R9, R13–R15.

**Dependencies:** U1.

**Files:** `infra/home/pb_schema.json`, `infra/home/pb_hooks/security.pb.js`, `infra/home/pb_hooks/media.pb.js` (new or existing hook boundary), `infra/home/pb_hooks/__tests__/media.contract.test.cjs`, `infra/home/pb_hooks/__tests__/pb_schema_auth_options.test.cjs`, `app/src/lib/repositories/media.repository.ts`, `app/src/lib/services/media.ts`, `app/src/lib/schemas/media.ts`, `app/src/lib/types/media.ts`, `app/src/lib/types/pocketbase-types.ts` (generated only), media/message upload tests, and any verified reaction consumer/test file.

**Approach:**

1. Set `message_reactions` list/view to membership-scoped rules, keep create/delete owner checks, reject updates, and add a server hook where declarative relation checks cannot express the intended boundary.
2. Make `media.room` required for chat media, preserve an explicit server-owned exception for verified vault/broadcast paths, and stop treating `references.roomId` as authorization input.
3. Send `room` as a real FormData relation in `mediaService`, validate that the caller is a room member before upload/read/delete, and keep ciphertext opaque to the server.
4. Add server-side max-size and MIME checks matching the accepted attachment types; reject oversized or mismatched files before persistence.
5. Run `npm run typegen:pb` from `app` after the schema snapshot is settled. Never hand-edit generated types.

**Patterns to follow:** `app/src/lib/services/media.ts` for the existing encryption/cache flow; `app/src/lib/repositories/media.repository.ts` for Result mapping; PocketBase relation fields and `security.pb.js` for server-side invariants.

**Test scenarios:**

- A can react to a message in a shared room and delete A’s own reaction; B’s reaction cannot be edited or deleted by A.
- A cannot list/view reactions for a room where A is not a member; malformed message IDs do not widen the result.
- A can upload encrypted media with a real `room` relation when A is a member; the payload still contains no plaintext.
- A cannot upload media for a non-member room, omit the room on chat media, or change `created_by` to B.
- Oversized and disallowed MIME uploads are rejected by the server even when the client bypasses local validation.
- Media read/delete by a non-member or wrong owner fails closed; permitted member reads return only the allowlisted record/file metadata.
- If no live reaction consumer is found, the test proves collection closure without inventing a new client API.

**Verification:** Schema snapshot, hook tests, media repository/service tests and generated types agree; existing message upload and outbox unit seams remain green.

### U4. Harden call history and status transitions

**Goal:** Make call history and status updates participant-scoped and transition-safe without breaking token membership checks.

**Requirements:** R10–R13, R15.

**Dependencies:** U1.

**Files:** `infra/home/pb_hooks/calls.pb.js`, `infra/home/pb_hooks/__tests__/calls.pb.test.cjs`, `infra/home/pb_hooks/__tests__/calls.status.contract.test.cjs` (new), `infra/home/pb_schema.json`, `app/src/lib/repositories/call.repository.ts`, `app/src/lib/services/call.service.ts`, `app/src/features/calls/store/sessionSlice.ts`, `app/src/features/calls/store/logsSlice.ts`, focused call tests.

**Approach:**

1. Keep direct `call_logs` update/delete closed and make `/api/calls/status` the only client status path.
2. Verify the target call’s room membership and actor role before every transition; do not trust a caller-supplied room or status context.
3. Define the allowed status transition table from the current call flow, including accept, reject, missed, end and reconnect paths; reject arbitrary jumps.
4. Replace history `expand` with a privacy-safe response contract or an allowlisted expand validated on the server, preserving public/private/group participant display rules.
5. Keep gateway token issuance behind the existing membership and S2S secret checks; do not expose internal gateway response data.

**Test scenarios:**

- A can update a call log in A’s room through an allowed transition; the response contains only the safe status/id DTO.
- A cannot update B’s call log, a call in a non-member room, or a call ID paired with a different room.
- Invalid status values and illegal transitions return deterministic 400/403/409 errors and do not save.
- History for a shared room returns only the approved participant context; private/unknown profiles remain neutral.
- Token route still rejects non-members and missing gateway secret, and its error response contains no URL/raw body.

**Verification:** Hook and frontend call tests cover both valid transitions and BOLA attempts; no direct client update of `call_logs` remains.

### U5. Regenerate types, update evidence and prepare preprod gate

**Goal:** Make the local snapshot, generated contracts, documentation and handoff reflect the completed local slice without claiming runtime completion.

**Requirements:** R13–R15 and all success criteria.

**Dependencies:** U2, U3, U4.

**Files:** `app/src/lib/types/pocketbase-types.ts` (generated), `docs/ARCHITECTURE_AUDIT.md`, `docs/CURRENT_STATE.md`, `docs/TESTING_PLAN.md`, `.agent/artifacts/prod_readiness_plan.md`, `docs/plans/p0-3a-users-read-authorization.md` only if cross-reference drift is found.

**Approach:**

1. Run the repository typegen script and inspect the diff for schema-only changes.
2. Record local tests and explicitly leave preprod runtime matrix unchecked.
3. Add an owner-run preprod matrix for each collection: allowed self/member action, cross-user denial, malformed input, no data leak, and rollback note.

**Test scenarios:**

- Generated types compile against every changed repository consumer.
- Documentation contains no claim that P0.3 or release is closed before preprod evidence.
- Static scans find no new secrets, raw endpoints, plaintext payloads or manual edits to generated types.

**Verification:** Local lint/build/focused tests and diff checks pass; documentation accurately separates local proof from preprod acceptance.

---

## Verification Contract

| Gate | Applies to | Completion signal |
|---|---|---|
| Hook syntax and contract tests | U1–U4 | Changed hooks load in isolated test doubles; allow/deny/error cases pass. |
| Frontend focused tests | U2–U4 | Presence, media/upload/outbox and call tests pass without external API. |
| Type generation and strict build | U3, U5 | `npm run typegen:pb`, `npm run lint`, `npm run build` from `app` complete; generated diff is expected. |
| Static security checks | U1–U5 | Read-only Semgrep/gitleaks checks are redacted; findings are classified, not suppressed. |
| Diff hygiene | U1–U5 | `git diff --check` passes; no secrets or unrelated mass changes. |
| Preprod runtime gate | Owner after handoff | Two-principal matrix confirms actual rules, media access and call transitions. This is not run by the implementing agent. |

No integration config, Dev/Prod URL, PocketBase Admin UI, curl, or real credentials may be used by the implementing agent.

Последующий review добавил локальные контракты для broadcast media route и
защиты marker на create/update, собственного presence DTO `id`, запрета
initiator join, некорректного размера upload и всех frontend media paths.
Runtime-проверка этих границ всё ещё относится к preprod gate.

---

## Definition of Done

- [ ] Presence collection and routes enforce owner/member authorization, and active frontend callers use the safe contract.
- [ ] Reactions have no global read or mutable foreign-record path; no unused client API was invented.
- [ ] Chat media has a required server-visible room relation, membership checks, and server-side MIME/size limits; verified vault/broadcast exceptions remain explicit.
- [ ] Call status and history are participant-scoped, transition-safe and privacy-safe; token membership/S2S behavior remains intact.
- [ ] Schema snapshot and generated TypeScript types are synchronized through the project typegen script.
- [ ] Local hook/frontend tests, lint, build, static scans and diff check pass with exact results recorded.
- [x] Documentation marks the local slice accurately and leaves preprod runtime and release NO-GO gates open.
- [ ] Abandoned experimental code, temporary diagnostics and dead test fixtures are removed before handoff.
