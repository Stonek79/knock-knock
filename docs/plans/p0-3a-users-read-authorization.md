---
title: "P0.3a — закрыть прямое чтение users и ввести capability-based profile DTO"
created_at: 2026-08-13
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
---

## Goal Capsule

Закрыть P0.3 в её первом вертикальном срезе: обычный пользователь PocketBase
видит напрямую только собственную запись `users`, а чтение чужих профилей,
поиск и получение публичных E2EE-ключей выполняются через узкие серверные
capability-эндпоинты с явными DTO. Изменение не должно раскрыть поля auth-record
и не должно сломать создание комнаты, добавление участников и realtime key
resolution.

Этот срез намеренно не закрывает crypto interoperability, доступ к media,
presence, reactions и call-status. Эти P0-риски остаются отдельными задачами.

## Product Contract

### Requirements

R1. У аутентифицированного обычного пользователя `users.listRule` и
`users.viewRule` разрешают только его собственный record. Superuser-операции
сохраняют штатное административное поведение PocketBase.

R2. Глобальный поиск показывает только профили с явным `profile_type = public`.
Ответ является allowlist DTO, а не `Record.publicExport()`: минимум `id`,
`profile_type`, `username`, `display_name`, `avatar` (только если эти поля
согласованы как публичные). В нём никогда нет email, settings, invite_code,
tokenKey, encrypted_profile, key_vault, signing/private key material или
необъявленных будущих полей.

R3. Публичные E2EE-ключи выдаются отдельной capability-операцией, не через
открытие `users` и не как побочный эффект search. Единственный response DTO:
`{ id, public_key_x25519, public_key_signing }`; пустой или отсутствующий
обязательный ключ даёт детерминированную ошибку без fallback к `users`. Операция
допускает: самого пользователя; public профиль; либо private-профиль, с которым
есть подтверждённая сервером общая комната. Для добавления ранее неизвестного
private-пользователя используется invite-flow, а не произвольное чтение его
ключа.

R4. Contacts остаётся отдельным, membership-scoped DTO. Для private/unknown
профиля он fail-closed: без name/username/avatar/status/last_seen и без
технических идентификаторов как UI fallback. Глобальный search DTO не заменяет
contacts DTO.

R5. Все custom routes требуют record auth, используют parameter binding и
ограничивают page/perPage. Ошибка либо отсутствие capability не расширяет
доступ и не подменяется «полезным» полным record.

R6. В текущем Dev-контуре schema change применяется через PocketBase Admin UI,
после чего актуальный `infra/home/pb_schema.json` коммитится вместе с кодом.
Отдельные `pb_migrations` в этот срез не входят. Snapshot фиксирует ожидаемое
состояние схемы; фактическое состояние Dev подтверждается runtime-тестом.

R7. Acceptance подтверждается владельцем на отдельной Dev PocketBase с двумя
обычными пользователями и тестовыми сущностями. Агент, реализующий код, не
подключается к любой БД прямо или косвенно и только подготавливает integration
tests. Cleanup выполняется только при явном флаге и разрешённом Dev/test URL;
Prod в этот срез не используется.

### Key Decisions

KTD1. Базовый API `users` становится owner-only, а не «auth-only».
Глобальное list/view-правило уже допускает чтение auth-record с чувствительными
полями. Правило: `@request.auth.id != "" && id = @request.auth.id`.
Governs R1, R6, U1, U4.

KTD2. DTO маппятся явно в hook, а не через `publicExport()` или клиентский
mapper. Это сохраняет privacy boundary при расширении schema и не полагается на
UI для авторизации. Governs R2, R4, R5, U2, U4.

KTD3. Публичный ключ не равен публичному профилю. `POST` capability endpoint
проверяет каждую requested identity на сервере; private key доступен только
самому владельцу или участнику общей комнаты. Governs R3, U2, U3, U4.

KTD4. Поведение contacts фиксируется отдельно: private presence metadata
считается приватной. Без явной будущей ADR не возвращать `status`/`last_seen`
для private или unknown profile. Governs R4, U2, U3, U4.

KTD5. Для этого Dev-среза не создавать отдельную migration-инфраструктуру.
Владелец меняет Admin UI и экспортирует snapshot; агент проверяет только
локальные файлы и тесты, без подключения к БД. Runtime-проверка выполняется
владельцем отдельно. Полноценные migrations и pin образов остаются отдельной
будущей задачей, если появятся CI, новый staging или production rollout.
Governs R6, U1, U5.

## Planning Contract

### Scope

В scope: rule `users`, изменение Dev-схемы через Admin UI, DTO/capability
routes, frontend consumers чужого profile/key, два principal integration tests,
ADR и честное обновление состояния.

Не в scope: изменение криптографического протокола, invite registration,
массовая смена media/presence/reactions/call rules, импорт production data,
автоматический deploy или commit/push.

### Evidence

E1. `infra/home/pb_schema.json` сейчас задаёт для `users` auth-wide list/view
rules, хотя auth-record содержит profile, key и account-related fields.

E2. `app/src/lib/repositories/user.repository.ts` всё ещё имеет прямые чужие
reads (`getAllUsers`, `getUserById`, `getByUsername`, `getProfilesByIds`,
`getSecurityKeys`). `getProfilesByIds` используется room mutations, а
`getSecurityKeys` — realtime key resolution.

E3. `infra/home/pb_hooks/main.pb.js` parameter-binds search, но отдаёт
`publicExport()` и contacts возвращает private `status`/`last_seen`.

E4. `app/vitest.integration.config.ts` уже подключает реальный Dev/Staging
контур, а `isDatabaseCleanupAllowed()` разрешает cleanup только для явного
флага и известного test/staging URL. Для текущего этапа этого достаточно:
отдельный disposable runner не нужен.

E5. `docs/ARCHITECTURE_AUDIT.md` P0.3 и `docs/SECURITY_CONFIG.md` уже требуют
owner-only users и отдельные узкие server DTO.

### Rollout Safety

Сначала подготовить и проверить hooks, DTO и frontend-потребителей в рабочем
дереве. Затем владелец применяет точечное изменение правил `users` в Dev Admin
UI, экспортирует актуальный `pb_schema.json` и выполняет двухпользовательскую
проверку. После успешной проверки код и snapshot коммитятся вместе. При ошибке
код можно вернуть на предыдущий Git commit, а Dev-схему вернуть через Admin UI
или пересоздать Dev-базу из принятого seed. Git rollback сам по себе не меняет
уже работающую базу. Prod в этот срез не изменяется; его проверка будет
отдельным шагом перед открытием доступа.

## Implementation Units

### U1. Apply the Dev schema change and record the snapshot

**Files:** `infra/home/pb_schema.json`, `infra/home/pb_hooks/__tests__/pb_schema_auth_options.test.cjs`.

1. После локальной проверки server/frontend-пути владелец проверяет Dev/Prod
   разделение и в Dev Admin UI меняет только
   `users.listRule` и `users.viewRule` на KTD1. Агент к Admin UI не подключается.
2. Владелец экспортирует результат в `infra/home/pb_schema.json`; агент
   проверяет локальный snapshot и обновляет node schema test.
3. Агент записывает в ADR процедуру, которую должен выполнить владелец: Admin UI,
   Dev runtime smoke test и rollback/reseed. Resolve existing duplicate
   `0002-*` numbering before allocating the next ADR id.

**Acceptance:** локальный snapshot имеет ожидаемые rules; фактическую активность
правил в Dev подтверждает владелец отдельным runtime-прогоном.

### U2. Replace broad profile exports with explicit server capabilities

**Files:** `infra/home/pb_hooks/main.pb.js`, `app/src/lib/constants/routes.ts`,
`app/src/lib/types/user.ts`, `app/src/lib/types/index.ts`,
`infra/home/pb_hooks/__tests__/main.users.dto.test.cjs` (new).

1. Define server-owned DTO mappers in `main.pb.js`: `toPublicProfileSearchDto`,
`toContactProfileDto`, and `toPublicKeyDto`. Each mapper has an allowlist and
does not call `publicExport()`.
2. Keep `GET /api/custom/users/search`, but require auth, reject/normalise
invalid query input, clamp pagination, bind all filter values, and return only
the public DTO. Preserve the explicit superuser-only branch for administrative
user listing, but give it a separate minimal Admin DTO; ordinary empty search
must not become a full-record listing.
3. Tighten `/api/custom/users/contacts`: query only records with a proven
membership relationship, use bindings for all dynamic filters, and omit private
or unknown identity/presence metadata per KTD4.
4. Add `POST /api/custom/users/keys` with a typed `{ userIds, roomId? }`
request. Require auth; deduplicate, cap and validate IDs; make one server-side
capability decision per target (self, public, or shared existing room). Return
exactly `{ id, public_key_x25519, public_key_signing }`, validate that both key
values are non-empty strings and otherwise return an explicit denied-or-missing
key error. Never accept a client claim of membership and never disclose a
private key for an arbitrary id.
5. Model response/error envelopes in strict TypeScript as narrow DTOs. Boundary
parsers use `unknown` plus validation, not `any` nor casts of full PocketBase
records.

**Acceptance:** static hook tests prove no `publicExport()` remains on a user
route, parameter binding remains present, and DTO examples omit every sensitive
field in R2.

### U3. Migrate frontend consumers without widening repository authority

**Files:** `app/src/lib/repositories/user.repository.ts`,
`app/src/lib/repositories/user.repository.test.ts`,
`app/src/lib/services/room/mutations.ts`, `app/src/lib/services/room.test.ts`,
`app/src/lib/services/chat-realtime.ts`, and its focused test or a new adjacent
test file.

1. Retain a direct `users.getOne` only for the authenticated caller’s own
profile; make the ownership precondition explicit in the repository API.
2. Delete or replace unused cross-user methods after tracing their callers.
Replace `getProfilesByIds` and `getSecurityKeys` with the key-capability route,
passing room context only where an existing server-side membership check is
semantically valid.
3. Update room creation/add-member flows: public profile selection receives
only public keys; attempting to add an unknown/private profile without a
capability must fail closed with a user-safe error and directs the product flow
to invite, not a local fallback request to `users`.
4. Adapt contacts/search UI to the DTO type. For private/unknown records it
uses the existing neutral identity treatment and never displays omitted fields
or a technical id.
5. Keep administrative actions separated from the ordinary-user repository
contract; do not rely on a forged frontend `isAdmin`/`isOwnMessage` flag.

**Acceptance:** unit tests cover successful public key lookup, denied private
lookup, missing/invalid DTO fields, room creation public path, and fail-closed
private path. Typecheck confirms no removed direct foreign read remains.

### U4. Prepare authorization proof for two Dev principals

**Files:** `app/vitest.integration.config.ts`, `app/src/test/helpers/`,
`app/src/test/security-users-authorization.integration.test.ts` (new),
`app/src/test/security-parameter-binding.integration.test.ts` (extend only for
shared harness helpers).

1. Подготовь тесты для существующего Dev integration config с cleanup guard;
   сам агент этот config не запускает и не задаёт URL/API credentials.
2. Use two dedicated Dev test accounts A/B and mark created test entities with
`is_test=true`. Do not delete shared Dev seeds or ordinary user records.
3. Assert direct API boundaries: A can get/list itself; A cannot get B; a list
does not reveal B’s auth record. Verify unauthenticated custom routes reject.
4. Seed public B and private B. Assert public B appears in search with exactly
the search DTO fields; private B is absent; neither response contains sensitive
keys/account/profile fields.
5. Assert key capability: A receives its own and public B’s exact two public
keys; A is
denied private B before a shared room; after a server-seeded common room, A can
receive only the key DTO for private B. Assert malformed/duplicated/oversized
IDs cannot widen the result.
6. Assert contacts of a shared private user do not expose the metadata barred
by R4. Ensure afterAll cleanup deletes dependent membership before its room, or
uses the allowed test-administration cleanup path, so an owner-removal policy
does not turn cleanup into a false acceptance failure.

**Acceptance:** тесты готовы к ручному запуску владельцем; их зелёный runtime
результат, cleanup и отсутствие подключения к Prod фиксируются владельцем.

### U5. Record decision, run proportionate verification, and update status

**Files:** `docs/adr/<next-id>-user-profile-read-capabilities.md` (new),
`docs/TESTING_PLAN.md`, `docs/ARCHITECTURE_AUDIT.md`,
`docs/CURRENT_STATE.md`, `AGENTS.md` (only if a durable migration/testing rule
is not already present).

1. ADR records KTD1–KTD5, alternatives rejected (open `users`; generic
`publicExport`; client-side filtering), privacy implications, Dev rollback by
Admin UI/reseed, and follow-up slices. It explicitly records that migrations
are deferred for this Dev-only stage.
2. Агент запускает focused hook/schema tests, repository/service unit tests,
`npm run lint`, `npm run build`, relevant full unit suite и `git diff --check`.
Dev security integration tests запускает только владелец. Run Semgrep read-only
with a rule set and explicitly exclude dependencies, build output, coverage,
caches and secrets; report findings without suppressions.
3. Update TESTING_PLAN only with exact command/result evidence. Mark this slice
done only after two-principal Dev runtime evidence. Leave crypto,
media/presence/reactions/call and release `NO-GO` entries open.
4. Do not change Prod in this task. All hook/schema updates remain delivered
through Git; a later Prod rollout must repeat the Admin UI change and smoke test.

**Acceptance:** documentation distinguishes implemented, runtime-verified and
remaining work; no claim makes P0.3 or release readiness fully closed.

## Verification Contract

## Текущий статус реализации (2026-08-14)

Локальная часть плана реализована и проверена без подключения к Dev/Prod API:
owner-only snapshot, search/contacts/keys DTO, frontend capability consumers и
parameter binding. Hook/schema tests — `10/10`, repository/room capability
tests — `6/6` и `11/11`, полный unit suite — `113 passed`, `6 skipped`, lint,
build и `git diff --check` — зелёные.

Это не является runtime-приёмкой: владелец должен отдельно проверить в Dev
двухпользовательскую matrix из U4 после применения правил через Admin UI.
До этого Definition of Done ниже не отмечается как полностью выполненный.

| Layer | Command or evidence | Required result |
| --- | --- | --- |
| Dev schema | владелец меняет Admin UI и экспортирует `pb_schema.json`; агент проверяет snapshot и node schema contract test | snapshot aligned; running Dev rules verified владельцем |
| Hooks | focused `infra/home/pb_hooks/__tests__/` DTO/route tests | explicit allowlists; no route uses `publicExport()` |
| App units | `cd app && npm test -- --run src/lib/repositories/user.repository.test.ts src/lib/services/room.test.ts <realtime-test>` | public path works; denied path fail-closed |
| Security integration | владелец запускает existing Dev integration config for `security-users-authorization.integration.test.ts` and parameter-binding test | two-principal authorization matrix passes; Prod excluded |
| App quality | `cd app && npm run lint && npm run build && npm test -- --run` (без PB) | report exact pass/fail/skip, do not hide legacy failures |
| Security review | read-only Semgrep scoped to changed source and hooks | findings reviewed; no automatic suppression |
| Runtime evidence | ручное выполнение владельцем после Admin UI change | required before marking this slice verified |

## Definition of Done

- [ ] `users` direct read is owner-only in the running Dev database and in the
      committed schema snapshot.
- [ ] Public search, contacts and key exchange use explicit, minimal server DTOs;
      no user route serializes `publicExport()`.
- [ ] Room and realtime consumers no longer depend on direct arbitrary user
      records and deny unavailable private-key capability safely.
- [ ] Владелец отдельным ручным прогоном подтвердил Dev integration suite с
      двумя пользователями и cleanup, учитывающий ownership policy.
- [ ] ADR and testing/audit/current-state documents contain precise evidence;
      unrelated P0 and release NO-GO items remain open.
- [ ] Focused tests, lint, build, applicable full suite and diff check have
      recorded results; no commit, push or production change occurred implicitly.

## Appendix

Relevant PocketBase semantics must be verified against the running Dev version:
[API rules and filters](https://pocketbase.io/docs/api-rules-and-filters/),
[JS records](https://pocketbase.io/docs/js-records/). Full migrations remain a
future infrastructure task and are not an acceptance condition for P0.3a.
