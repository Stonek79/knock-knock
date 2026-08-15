---
title: "Задание агенту: реализация P0.3a — защита чтения users"
plan: "p0-3a-users-read-authorization.md"
language: ru
---

# Задание агенту

Реализуй технический план
[`p0-3a-users-read-authorization.md`](p0-3a-users-read-authorization.md).
Документ является источником требований и критериев приёмки. Файл
`p0-3a-users-read-authorization.explained.md` используй только для понимания
контекста.

## Главный результат

Закрой прямое чтение чужих записей `users` обычным пользователем, не сломав
поиск публичных профилей, получение E2EE-ключей, создание комнат и realtime.
Профили, контакты и ключи должны выдаваться через отдельные минимальные
server-owned DTO.

## Обязательные правила работы

1. До изменений прочитай `AGENTS.md`, `docs/CURRENT_STATE.md`,
   `docs/ARCHITECTURE_AUDIT.md`, `docs/TESTING_PLAN.md` и оба файла плана.
2. Для поиска структуры кода сначала используй доступные graph-инструменты
   `codebase-memory-mcp`; для строк, схемы, hooks и Markdown используй `rg`,
   для TS/JS-синтаксиса — `ast-grep`. Не заявляй об использовании инструмента,
   если он недоступен.
3. Сохраняй все существующие незавершённые изменения. Не выполняй
   `git reset`, `git checkout`, массовое удаление, commit или push.
4. Агенту полностью запрещено подключаться к любой базе данных — прямо или
   косвенно. Нельзя использовать PocketBase SDK/REST, `curl`, Admin UI, Dev или
   Prod URL, integration-конфигурацию с реальным API, а также команды, которые
   через `VITE_*` или другие переменные окружения могут отправить запрос в PB.
   Runtime-проверку Dev выполняет владелец после работы агента.
5. Не меняй файлы непосредственно на сервере. Не добавляй секреты, токены,
   реальные пароли, production-адреса или ключи в код, тесты, логи и
   документацию. Тестовые учётные данные агенту не нужны.
6. Не ослабляй PocketBase rules и не переносите авторизацию в frontend.
   Клиентское поле `isAdmin`, `isOwnMessage` или заявление о membership не
   являются доказательством права.
7. Не меняй криптографический протокол. Не объявляй E2EE или release readiness
   закрытыми: crypto interoperability и остальные NO-GO остаются открытыми.
8. TypeScript strict: не добавляй `any`; на границах используй `unknown` и
   явную валидацию. Для PocketBase filter используй parameter binding.
9. Работай по TDD: сначала добавь/уточни падающий тест на требуемый контракт,
   затем внеси минимальную реализацию, затем упрости код без изменения
   поведения.

## Важное ограничение по Dev-схеме

Правила `users.listRule` и `users.viewRule` меняются владельцем через PocketBase
Admin UI на Dev-базе. Агент не должен открывать Admin UI, подключаться к PB,
симулировать runtime-проверку или импортировать snapshot вслепую. Агент может
только проверить локальный JSON snapshot и подготовить инструкции владельцу.

Runtime-доступ в рамках работы агента всегда считается недоступным. В отчёте
явно укажи, что runtime evidence должен предоставить владелец отдельным
ручным прогоном.

Владелец после работы агента должен проверить, что правила ровно:

```text
@request.auth.id != "" && id = @request.auth.id
```

для обоих правил (`listRule` и `viewRule`), затем экспортируй актуальный
`infra/home/pb_schema.json`. Не импортируй snapshot целиком для изменения двух
правил.

## Порядок реализации

### 1. Сначала зафиксируй текущих потребителей

Проверь callers и контракты для:

- `getAllUsers`, `getUserById`, `getByUsername`, `getProfilesByIds`,
  `getSecurityKeys` в `app/src/lib/repositories/user.repository.ts`;
- room creation/add-member в `app/src/lib/services/room/mutations.ts`;
- realtime key resolution в `app/src/lib/services/chat-realtime.ts`;
- `/api/custom/users/search` и `/api/custom/users/contacts` в
  `infra/home/pb_hooks/main.06-user-capabilities.pb.js`.

До удаления методов запиши, какие callers будут переведены на новый endpoint.
Не удаляй метод только потому, что он выглядит устаревшим: сначала докажи
отсутствие callers поиском/graph trace.

### 2. Server DTO и capability endpoints

В `infra/home/pb_hooks/main.06-user-capabilities.pb.js`:

- добавь явные allowlist-мапперы `toPublicProfileSearchDto`,
  `toContactProfileDto`, `toPublicKeyDto`;
- не используй `publicExport()` ни на одном обычном user route;
- сохрани `/api/custom/users/search`, но требуй record auth, валидируй и
  ограничивай `q`, `page`, `perPage`, применяй parameter binding;
- пустой обычный поиск не должен превращаться в выдачу всех user records;
- contacts должен быть отдельным membership-scoped DTO и fail-closed для
  private/unknown профилей; не отдавай им name/username/avatar/status/last_seen;
- добавь `POST /api/custom/users/keys` с телом `{ userIds, roomId? }`;
- дедуплицируй, валидируй и ограничь `userIds`; сервер сам проверяет для каждого
  target: self, public profile или подтверждённая общая существующая комната;
- ответ endpoint ключей должен содержать только
  `{ id, public_key_x25519, public_key_signing }`;
- пустые/невалидные ключи дают детерминированный отказ или missing-key error;
  fallback на прямое чтение `users` запрещён;
- не принимай от клиента заявление о membership.

Добавь hook-тесты (например,
`infra/home/pb_hooks/__tests__/main.users.dto.test.cjs`), которые проверяют
allowlist, отсутствие sensitive-полей и сохранение parameter binding.

### 3. Схема Dev

После того как владелец применит изменение через Admin UI и отдельно сообщит
результат:

- проверь snapshot `infra/home/pb_schema.json`;
- обнови существующий
  `infra/home/pb_hooks/__tests__/pb_schema_auth_options.test.cjs`;
- убедись, что node schema test требует owner-only rules.

Если для ADR нужен новый номер, сначала проверь существующие ADR и устрани
дублирование номера, не переписывая историю без необходимости.

### 4. Frontend/repository migration

В `app/src/lib/repositories/user.repository.ts` и связанных сервисах:

- прямой `users.getOne` оставь только для собственного профиля и вырази
  ownership-precondition в API;
- замени cross-user `getProfilesByIds` и `getSecurityKeys` вызовом capability
  endpoint;
- передавай `roomId` только когда он относится к существующей комнате и
  сервер сам проверяет membership;
- room creation/add-member для неизвестного/private пользователя должен
  завершаться fail-closed и направлять в invite-flow;
- contacts/search переведи на новые DTO-типы и нейтральное отображение без
  технических id fallback;
- не смешивай admin actions с обычным user repository.

Добавь или обнови unit-тесты для:

- собственного и public key lookup;
- отказа private lookup без общей комнаты;
- missing/invalid DTO;
- public room creation path;
- fail-closed private/invite path.

### 5. Dev integration tests (только подготовка, без запуска агентом)

Создай `app/src/test/security-users-authorization.integration.test.ts` либо
расшири существующий harness, не дублируя его cleanup-логику. Агент только
пишет тесты и проверяет их статически; не запускай этот файл и не запускай
`vitest.integration.config.ts`.

Владелец после передачи изменений запускает существующий integration config на
Dev URL:

- `VITE_ALLOW_DB_CLEANUP=true`;
- URL должен проходить существующий allowlist cleanup;
- два выделенных Dev-аккаунта A/B;
- создаваемые сущности помечай `is_test=true`;
- не удаляй shared seeds или обычных пользователей.

Обязательные проверки:

1. A получает себя; A не получает B по `getOne`; список A не раскрывает B.
2. Неаутентифицированные custom routes отклоняются.
3. Public B виден в search ровно с DTO-полями; private B отсутствует.
4. Search/contact ответы не содержат email, settings, invite_code, tokenKey,
   encrypted_profile, key_vault или ключевые поля, не входящие в контракт.
5. A получает свои и public B keys; private B до общей комнаты отклоняется.
6. После server-seeded общей комнаты A получает private B только в key DTO.
7. Дубликаты, malformed и oversized `userIds` не расширяют доступ.
8. Contacts shared private user не раскрывает запрещённые metadata.
9. `afterAll` удаляет зависимые memberships до room либо использует разрешённый
   test-admin cleanup, чтобы owner-removal policy не давала ложный failure.

Не добавляй новые `skip` и не меняй существующий guard, чтобы скрыть отсутствие
runtime. В отчёте отделяй подготовленные тесты от фактически выполненных
владельцем runtime-проверок.

## Документация и статус

Создай ADR следующего свободного номера с решениями KTD1–KTD5:

- owner-only `users`;
- явные DTO вместо `publicExport()`;
- отдельная capability-операция ключей;
- отдельный fail-closed contacts contract;
- Dev Admin UI + committed snapshot, без migrations в этом срезе.

Обнови `docs/TESTING_PLAN.md`, `docs/ARCHITECTURE_AUDIT.md` и
`docs/CURRENT_STATE.md` только по фактическим результатам. Не ставь `[x]` и не
пиши «P0.3 закрыта», пока нет runtime evidence на двух Dev principals.
Crypto interoperability, media/presence/reactions/call и release NO-GO должны
остаться открытыми.

## Проверки перед отчётом

Запусти из `app` только проверки, не требующие внешнего API. Перед общим
`npm test` сначала проверь конфигурацию Vitest; если она потенциально включает
integration-файлы или создаёт PB-клиент с внешним URL, не запускай общий suite,
а выполни только явно unit/static test-файлы.

```text
npm run lint
npm run build
npm test -- --run   # только если конфигурация доказанно не обращается к PB
```

Дополнительно запусти focused hook/schema tests, repository/room/realtime tests
(только unit/static варианты) и `git diff --check`. Не запускай security
integration tests и любые команды, которые могут обратиться к PB. Полный suite
может содержать
известные pre-existing failures: не удаляй тесты, не скрывай failures и укажи
точные результаты `passed/failed/skipped`.

Запусти read-only Semgrep на изменённых hook/TS-файлах, исключив
`node_modules`, `dist`, `coverage`, caches и secret files. Findings не подавляй
автоматически; классифицируй их в отчёте.

## Формат финального отчёта агента

Верни:

1. краткое резюме результата;
2. список изменённых файлов и зачем изменён каждый;
3. список выполненных команд с точными результатами;
4. отдельный список runtime-проверок, которые должен выполнить владелец; не
   выдавай их за выполненные агентом;
5. незакрытые проблемы и почему они не входят в этот срез;
6. честный статус: `готово к review`, `частично готово` или `заблокировано`.

Commit и push не выполняй. После отчёта изменения будут отдельно проверены и
только затем подготовлены к коммиту.
