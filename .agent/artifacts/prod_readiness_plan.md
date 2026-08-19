# План подготовки Nemo к пробному Production-релизу

> **Статус:** рабочий план; галочка означает подтверждённый результат, а не наличие файла или workflow
> **Связанные документы:** `GIT_MIGRATION.md`, `TAURY_PLAN.md`,
> `docs/CURRENT_STATE.md`, `docs/ARCHITECTURE_AUDIT.md`,
> `docs/TESTING_PLAN.md`

## 1. Цель пробного релиза

Подготовить ограниченный production-пилот Nemo с:

- рабочей PWA;
- desktop-клиентом Tauri только после прохождения его отдельных gates;
- публичным очищенным source-репозиторием;
- проверяемыми Docker/Tauri artifacts;
- полностью ручным deployment на VPS;
- зафиксированными процедурами backup, rollback и реагирования на инциденты.

Мобильные приложения Tauri, встроенный обход блокировок и полноценные background push не являются автоматической частью первого пилота. Они включаются только после отдельных feasibility и platform tests из `TAURY_PLAN.md`.

## 2. Правила статусов

- `[x]` — реализация найдена и результат проверен указанным acceptance test.
- `[ ]` — не реализовано или нет достаточного подтверждения.
- Наличие кода, workflow или ранее установленной галочки не заменяет повторяемую проверку.
- Любой release-blocker возвращает итоговый статус в `NO-GO`.

### Снимок аудита от 19 августа 2026 года

Текущий статус — `NO-GO`, что ожидаемо для активной разработки. Главные P0:

- несовместимый crypto lifecycle и общий keystore для аккаунтов устройства;
- Push/LiveKit gateway развернут и защищён S2S secret; локальные tests, VPS
  build, healthcheck, Nginx syntax, реальная доставка push и выдача LiveKit
  token проверены, но полный звонок между двумя клиентами и повторный security
  review ещё открыты (см. ARCHITECTURE_AUDIT.md §2);
- слишком широкие PocketBase rules для invites/media/presence/reactions и
  call-history операций;
- owner-only users локально реализованы, но Dev authorization matrix ещё не
  выполнена; invite registration локально согласована вокруг `invites.token`
  и закрытого list/view, но Dev runtime matrix и конкурентное расходование ещё
  не проверены;
- отсутствие управляемых PocketBase migrations/schema drift gate;
- небезопасный и невоспроизводимый prototype release-export.

Локальный frontend suite после последних срезов: 37 test files passed, 4
skipped; 196 tests passed, 6 skipped. `npm run lint`, `npm run build` и
`git diff --check` проходят. Пропуски — integration/browser-контуры без
разрешённого изолированного окружения; это не evidence Dev/Prod и не release
readiness.

Последнее локальное evidence относится к текущему рабочему срезу (19 августа
2026); команды выполнялись из `app`, без подключения к Dev/Prod API. Runtime claims
ниже считаются подтверждёнными только там, где отдельно указаны VPS/Dev
проверки владельца; локальный suite не заменяет их.

## 3. Зафиксировать production-архитектуру

- [x] Принято целевое решение для первого пилота: Dev PocketBase остаётся дома; Prod PocketBase будет перенесён на VPS; production MinIO остаётся дома из-за стоимости VPS.
- [x] Зафиксировано фактическое состояние текущего deployed окружения: Dev и Prod PocketBase пока работают дома; на VPS работают Nginx, FRP server, LiveKit и push-gateway.
- [ ] Утвердить единственную актуальную схему размещения PocketBase Prod, MinIO, LiveKit, push-gateway, Nginx и FRP в deployed compose.
- [x] Привести `docs/CURRENT_STATE.md`, compose-файлы и `GIT_MIGRATION.md` к одной схеме.
- [ ] Отделить публичные self-hosting templates от реальных operational-конфигов.
- [ ] Удалить из публичных templates реальные IP, пути, домены администратора и credentials.
- [ ] Составить data-flow diagram: текст, realtime, media, calls, push и administrative traffic.
- [ ] Зафиксировать trust boundaries и доступные извне порты.
- [ ] Зафиксировать degraded mode: при отключении дома API/auth/text продолжают работать, media операции переходят в retry.
- [x] Настроен VPS → home MinIO через исходящий FRP client; health endpoint на VPS `127.0.0.1:19000` проверен. FRPC идёт через Happ/Xray SOCKS с дополнительно включённым FRP TLS.
- [x] MinIO API и console на домашнем сервере привязаны к loopback; Dev/Prod используют отдельные bucket и service account. Ограничение политик проверено вручную.

**Gate:** новый оператор может по документации однозначно объяснить, где находятся данные и какой сервис имеет к ним доступ; документы не противоречат deployed compose.

## 4. PWA и offline-поведение

В коде обнаружены UI установки/сети, Dexie Outbox и обработчик `sync-outbox`. Их ещё нужно подтвердить end-to-end.

### 4.1. Installation и network UX

- [x] `InstallPromptModal` подключён в root layout.
- [x] `NetworkStatusBanner` подключён в root layout.
- [ ] Проверить A2HS на поддерживаемом Android Chromium.
- [ ] Проверить корректный fallback на iOS/Safari, где `beforeinstallprompt` отсутствует.
- [ ] Проверить отсутствие ложного статуса online при недоступном API.

### 4.2. Outbox

- [x] Таблица Outbox присутствует в Dexie schema.
- [x] Offline-ветка отправки сохраняет сообщение в Outbox.
- [x] Service Worker содержит обработку `sync-outbox`.
- [ ] Проверить идемпотентность: повторная доставка не создаёт дубликат сообщения.
- [x] Локальная retry/backoff policy и переход в `failed` покрыты unit-тестами;
  полный Service Worker delivery-cycle ещё не подтверждён.
- [ ] Проверить порядок нескольких сообщений после восстановления сети.
- [ ] Проверить вложения, отмену, logout и смену пользователя при непустом Outbox.
- [ ] Проверить fallback без Background Sync API.

**Gate:** тесты воспроизводят offline → enqueue → reconnect → однократную доставку и корректный UI-status на Chromium и Safari fallback.

### 4.3. Cache-first список чатов и logout cleanup

- [x] Локальная cache-first стратегия, валидация кеша, запрет показа
  ciphertext, session generation guard и очистка user-scoped QueryClient/
  IndexedDB-кеша при logout покрыты unit-тестами.
- [ ] Подтвердить поведение Dexie/IndexedDB, реальную расшифровку и отмену
  сетевых запросов в браузере при logout.

## 5. Realtime и восстановление соединения

В репозиториях используется `RealtimeGateway`, но production-готовность требует проверки поведения при разрывах.

- [x] Репозитории сообщений, комнат, presence и звонков используют общий gateway.
- [x] `RealtimeGateway` не открывает соединение при импорте; listeners создаются
  лениво при первой подписке и покрыты seam-тестом.
- [ ] Проверить отсутствие параллельных legacy subscriptions вне gateway.
- [ ] Проверить exponential backoff с jitter и верхним пределом.
- [ ] Проверить отмену reconnect после logout/unmount.
- [ ] Проверить повторную авторизацию после истечения token.
- [ ] Реализовать или подтвердить gap recovery после reconnect.
- [ ] Проверить дедупликацию и порядок событий.
- [ ] Проверить отсутствие утечек listeners после многократной смены комнат.

**Gate:** автоматический тест разрывает соединение, пропускает серверные события и подтверждает восстановление согласованного состояния без дублей.

## 6. Безопасность и приватность приложения

- [ ] Повторно проверить модель E2E: генерация, хранение, ротация, recovery и удаление ключей.
- [ ] Проверить, что серверные logs/push payload не содержат plaintext сообщений.
- [ ] Проверить authorization всех custom PocketBase routes и file endpoints.
- [ ] Проверить rate limits для auth, invitations, search, uploads и push.
- [ ] Проверить MIME/type/size limits и защиту media processing.
- [ ] Настроить production CSP без `csp: null`; документировать необходимые исключения.
- [ ] Проверить отсутствие secrets в source, Git history, Docker layers и frontend bundle.
- [ ] Выполнить dependency audit для npm, Cargo и container images.
- [ ] Подготовить `SECURITY.md`, vulnerability contact и supported versions.
- [ ] Проверить privacy-sensitive telemetry: по умолчанию она отсутствует либо явно opt-in.
- [x] Исправить и покрыть локальными тестами базовое privacy-safe отображение
  профилей в звонках/шапке комнаты, исходящий экран звонка и доступность
  завершения звонка; полный двухклиентский E2E остаётся открытым.
- [x] Локальная часть P0.3a реализована: owner-only snapshot, capability DTO,
  parameter binding и миграция frontend consumers; Dev authorization matrix
  владельца остаётся открытой.
- [x] Локально подтверждены fail-closed обработка ошибки invite и parameter
  binding; valid/expired/exhausted/foreign contract tests и условный атомарный
  `UPDATE` с проверкой `rowsAffected()` покрывают локальный concurrent-use
  контракт, но не подтверждают Dev runtime.
- [x] Согласовать hook/schema модель `invites`; локально покрыть
  valid/expired/exhausted/foreign/malformed и прямой list/view denial.
- [ ] Пройти Dev runtime-сценарии valid/expired/used/foreign invite после
  deploy и проверить конкурентное расходование.
- [x] В schema snapshot отключены новые-device login alerts; применение в
  работающем Dev выполняется владельцем через Admin UI.

**Gate:** все Critical/High findings исправлены или формально приняты с ограничением пилота и сроком устранения.

## 7. Production-инфраструктура

### 7.1. Контейнеры и сеть

- [ ] Зафиксировать версии всех images; не использовать `latest` для stateful и критичных сервисов.
- [ ] Проверить healthchecks, restart policy и resource limits.
- [ ] Закрыть прямой внешний доступ к PocketBase/Redis/administrative ports.
- [ ] Проверить firewall для HTTP(S), LiveKit media и выбранного TURN-варианта.
- [ ] Проверить TLS renewal и alert до истечения сертификата.
- [ ] Убедиться, что Nginx и TURN/TLS не конкурируют за один `IP:443`.
- [ ] Проверить degraded mode при недоступности домашнего MinIO/FRP.
- [ ] Проверить, что frontend не теряет media upload/download при временном отказе MinIO и показывает retry-state.
- [ ] Провести FRP soak-test: REST и realtime без `heartbeat timeout` не менее
  30 минут, затем повторить после restart Happ/Xray и FRPC.
- [ ] Убедиться, что после restart FRPC на FRPS не остаются конфликтующие
  регистрации `proxy already exists`.

### 7.2. Данные

- [x] Создан и проверен ручной локальный backup текущего Prod PocketBase.
- [x] Создан и проверен ручной локальный backup MinIO objects.
- [ ] Автоматизировать расписание Prod backups после утверждения retention; Dev backup не требуется.
- [ ] Добавить вторую физическую копию: backup на том же домашнем диске не защищает от отказа диска.
- [ ] Проверить восстановление media object и соответствующей PocketBase metadata record совместно.
- [ ] Зашифровать backups и отделить их credentials от production.
- [ ] Выполнить реальное восстановление в изолированном окружении.
- [ ] Зафиксировать RPO/RTO пилота.
- [ ] Перед каждым schema migration создавать проверенный restore point.

### 7.3. Наблюдаемость

- [ ] Добавить uptime/health monitoring без содержимого пользовательских сообщений.
- [ ] Настроить alerts для API, storage, certificate, disk, queue и LiveKit.
- [ ] Определить retention и redaction логов.
- [ ] Проверить корректность времени и ротацию логов на узлах.

**Gate:** staging deployment переживает restart, потерю одного dependency и rollback без потери подтверждённых данных.

## 8. Tauri desktop

Текущий код содержит каркас Tauri, tray и базовые плагины. Прокси-sidecar, безопасное хранение, динамическая сеть и release signing пока не реализованы.

- [x] Базовый `src-tauri` и tray присутствуют.
- [ ] Пройти Gate 0 из `TAURY_PLAN.md`: доказать рабочий сетевой путь PocketBase HTTP/SSE/media через xray.
- [ ] Реализовать desktop MVP отдельно для Windows, macOS и Linux.
- [ ] Отключить PWA Service Worker в Tauri build.
- [ ] Настроить production CSP и минимальные Tauri capabilities.
- [ ] Проверить lifecycle sidecar, recovery после crash и отсутствие orphan processes.
- [ ] Проверить local notification при работающем tray-процессе.
- [ ] Не заявлять background remote push после полного завершения процесса.
- [ ] Подписать Windows artifacts; подписать и notarize macOS artifacts.
- [ ] Опубликовать SHA-256 checksums, SBOM и связь artifact → tag → commit.

Android/iOS вынесены в отдельный post-pilot этап: desktop sidecar и tray-модель нельзя считать переносимыми на mobile без отдельной архитектуры.

**Gate:** чистая машина каждой заявленной desktop-платформы устанавливает подписанный клиент, подключается через выбранный маршрут, выполняет основной пользовательский flow и корректно удаляет приложение.

## 9. Публичный release pipeline

- [ ] Сделать dev-репозиторий private; ротировать ранее опубликованные secrets.
- [ ] Реализовать безопасный allowlist-export согласно `GIT_MIGRATION.md`.
- [ ] Добавить secret/identity/path scan экспортированной директории.
- [ ] Проверить сборку Docker и Tauri именно из экспортированной копии.
- [ ] Подготовить public README, LICENSE, SECURITY.md, privacy/threat model и self-hosting guide.
- [ ] Настроить отдельные SSH key и local Git identity проекта.
- [ ] Настроить public CI с минимальными permissions и actions, закреплёнными по SHA.
- [ ] Публиковать Docker version/SHA tags и immutable digest.
- [ ] Запретить GitHub Actions доступ к VPS и production network.
- [ ] Реализовать ручной deployment точного digest по SSH.
- [ ] Отрепетировать rollback на предыдущий digest.

**Gate:** публичный tag можно собрать независимо, checksums совпадают, а VPS обновляется и откатывается без `git pull`, build и автоматического deploy.

## 10. Финальный QA

Подробная программа восстановления и расширения тестов находится в
`docs/TESTING_PLAN.md`.

- [ ] Unit, integration и E2E suites проходят из чистого checkout.
- [ ] Проверены auth, registration, recovery, contacts, rooms, messages, replies и moderation.
- [ ] Проверены offline/reconnect/background transitions.
- [ ] Проверены upload/download больших media и исчерпание quota/disk.
- [ ] Проверены WebRTC: прямой UDP, TCP fallback и выбранный TURN/TLS маршрут.
- [ ] Выполнен Lighthouse/bundle audit для PWA.
- [ ] Выполнен soak-тест realtime и очередей.
- [ ] Проведён smoke-test после production-like deployment.
- [ ] Известные ограничения опубликованы в release notes.

## 11. Go/No-Go для пилота

Релиз получает `GO`, только если:

- [ ] нет открытых Critical/High security defects;
- [ ] backup и restore подтверждены практическим тестом;
- [ ] rollback укладывается в заявленный RTO;
- [ ] основной PWA flow проходит на двух целевых браузерных семействах;
- [ ] опубликованный source соответствует artifacts;
- [ ] production deployment остаётся полностью ручным;
- [ ] monitoring и incident contact работают;
- [ ] все заявленные платформы реально протестированы.

Если Tauri не проходит собственные gates, это блокирует только desktop-релиз, но не обязательно PWA-пилот. Решение фиксируется явно в release notes.
