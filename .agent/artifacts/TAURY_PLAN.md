# План Tauri v2 для Nemo: desktop-клиент и встроенный обход блокировок

> **Статус:** проектирование; реализация начинается с обязательного сетевого spike
> **Первый scope:** Windows, macOS и Linux
> **Отдельный post-MVP scope:** Android и iOS
> **Критерии:** работоспособность, проверяемая безопасность и воспроизводимый публичный релиз
> **Связанные gates:** `docs/ARCHITECTURE_AUDIT.md`, `docs/TESTING_PLAN.md`,
> `.agent/artifacts/prod_readiness_plan.md`

## 1. Цель

Собрать desktop-клиент Nemo на Tauri v2, который:

- использует существующий React UI;
- не зависит от браузерного Service Worker;
- при необходимости направляет API/realtime/media трафик через встроенный xray-core VLESS/Reality;
- сохраняет WebRTC-маршрут управляемым и имеет проверенный TURN fallback;
- публикуется из очищенного публичного репозитория как подписанный artifact;
- не требует build или автоматического deployment на production VPS.

План не обещает «невидимость» для DPI или полную анонимность. Устойчивость маршрута подтверждается только тестами из целевых сетей и пересматривается при изменении блокировок.

## 2. Текущее подтверждённое состояние

В `app/src-tauri/` уже есть:

- Tauri v2 skeleton;
- desktop window и tray menu;
- плагины log, notification, dialog, fs, http и os;
- icons и базовые capabilities;
- GitHub Actions matrix для macOS, Linux и Windows.

Пока отсутствуют:

- Tauri commands и proxy manager;
- `tauri-plugin-shell` и xray sidecar;
- доказанный способ направить PocketBase SDK HTTP/SSE/media через локальный прокси;
- Stronghold и схема bootstrap/rotation credentials;
- production CSP;
- `tauri:dev`/`tauri:build` scripts;
- code signing/notarization и проверенный release pipeline;
- подтверждённые desktop builds на чистых машинах.

Следовательно, Tauri нельзя считать готовым только потому, что skeleton и workflow уже существуют.

## 3. Исправленные архитектурные допущения

### 3.1. Desktop и mobile — разные проекты

`externalBin` и обычный дочерний процесс подходят для desktop-модели. Нельзя автоматически переносить desktop xray sidecar на Android/iOS:

- mobile имеет другой lifecycle и ограничения фоновой работы;
- Android обычно требует архитектуры на основе `VpnService` или нативной библиотеки;
- iOS требует отдельного Network Extension подхода, entitlements и проверки правил распространения;
- desktop tray и «процесс всегда жив» не являются mobile push-моделью.

Первый релиз ограничивается desktop. Android/iOS получают отдельный feasibility document после desktop MVP.

### 3.2. SOCKS-порт не является PocketBase API

Нельзя заменить `https://api.example` на `http://127.0.0.1:<socks-port>`: SOCKS5 не является HTTP origin, а WebView/PocketBase SDK не начнут использовать его автоматически.

Перед основной реализацией необходимо выбрать и доказать один транспорт:

1. **Local application bridge — предпочтительный кандидат.** Локальный HTTP/SSE/WebSocket bridge принимает только разрешённые Nemo routes и отправляет upstream через xray SOCKS.
2. **Native network layer.** HTTP, realtime и uploads выполняются Rust-кодом через proxy-aware client, а UI вызывает узкие Tauri commands. Безопаснее по поверхности API, но требует большого рефакторинга PocketBase SDK.
3. **WebView proxy configuration.** Допускается только после одинакового proof на Windows/macOS/Linux; нельзя считать переносимой возможностью по умолчанию.

Выбор фиксируется ADR после Gate 0.

### 3.3. Push и local notifications — разные функции

`tauri-plugin-notification` показывает локальное OS notification, но сам по себе не принимает APNs/FCM remote push.

Desktop MVP:

- пока приложение работает в tray, realtime listener может инициировать local notification;
- при явном Quit процесс завершается и уведомления не гарантируются;
- startup-at-login может быть отдельной opt-in функцией;
- payload дешифруется только на клиенте, если это совместимо с текущей E2E-моделью.

Полноценный remote push для закрытого mobile-приложения — отдельная platform-specific задача.

### 3.4. Sidecar lifecycle не даёт абсолютной гарантии

`tauri-plugin-shell` используется из-за scoped capabilities и стандартного bundling API. Однако нельзя утверждать, что любой `kill -9`, crash или OS failure гарантированно уничтожит дочерний процесс.

Нужны:

- хранение handle и штатный stop/kill;
- cleanup при normal exit;
- проверка stale PID/process identity при следующем запуске;
- OS-specific tests для crash/forced termination;
- watchdog с ограниченным restart budget и backoff.

### 3.5. Reality-параметры нельзя рандомизировать произвольно

SNI/serverName, fingerprint, short ID и серверная конфигурация должны быть совместимы. Случайный выбор неподдерживаемого SNI приведёт к отказу подключения и может ухудшить fingerprint.

Клиент использует только подписанный сервером набор profiles. Ротация выполняется как атомарное обновление profile с fallback на предыдущий, а не независимой случайной заменой полей.

## 4. Целевая desktop-архитектура

```text
React UI / PocketBase-facing adapter
               │
               ▼
Local application bridge или native network layer
               │
               ▼
xray local SOCKS inbound
               │
               ▼
VLESS/Reality endpoint
               │
               ├── PocketBase API + realtime
               └── media endpoints

LiveKit/WebRTC ── отдельная проверяемая policy:
                 direct UDP → LiveKit TCP/TURN fallback
```

Local bridge, если выбран, должен:

- bind только на loopback и случайный свободный порт;
- принимать только allowlist upstream hosts/routes;
- использовать per-session capability token;
- ограничивать методы, headers, body size и redirects;
- поддерживать streaming uploads/downloads, SSE и WebSocket;
- не логировать auth tokens, plaintext messages или media;
- завершаться вместе с приложением и не предоставлять общий open proxy.

API adapter и UI не должны узнать VLESS credentials. Rust-слой отвечает за lifecycle, profile storage и route selection.

## 5. Gate 0: сетевой feasibility spike

До добавления UI и полного proxy manager создать минимальный desktop prototype только для одной платформы.

### Обязательные сценарии

- [ ] Запустить pinned xray sidecar через `tauri-plugin-shell`.
- [ ] Дождаться готовности SOCKS через timeout и проверку реального запроса, а не только открытого TCP-порта.
- [ ] Выполнить PocketBase health/auth request через выбранный transport.
- [ ] Получить список records.
- [ ] Поддержать realtime subscription и reconnect.
- [ ] Загрузить и скачать media streaming без помещения всего файла в память.
- [ ] Подтвердить, что DNS resolution для upstream не обходит выбранный proxy route.
- [ ] Проверить отказ при неверном/отозванном profile.
- [ ] Проверить normal shutdown, xray crash и restart budget.
- [ ] Зафиксировать latency и memory overhead относительно PWA.

### Решение Gate 0

По результату создаётся ADR:

- выбранный transport;
- покрываемые протоколы HTTP/SSE/WebSocket/media;
- известные platform differences;
- threat boundaries localhost bridge;
- критерии отказа и fallback UX.

Если Gate 0 не пройден, встроенный xray исключается из первого desktop-релиза; Tauri может выпускаться как обычная оболочка с явным требованием внешнего VPN.

## 6. Этап 1: desktop proxy core

### 6.1. Зависимости

Добавить после Gate 0:

- `tauri-plugin-shell` для scoped sidecar spawn;
- async runtime/network dependencies, выбранные ADR;
- `tauri-plugin-stronghold` только после определения password bootstrap;
- минимальные serialization/error dependencies.

Не добавлять `sysinfo`, если задача решается сохранённым child handle и platform-specific lifecycle без глобального поиска процессов.

### 6.2. Модули Rust

Рекомендуемое разделение:

```text
src-tauri/src/
├── proxy/
│   ├── manager.rs      # state machine и lifecycle
│   ├── profile.rs      # validation и rotation
│   ├── sidecar.rs      # spawn, stdout/stderr, stop
│   ├── readiness.rs    # end-to-end readiness
│   └── bridge.rs       # только если выбран local bridge
├── notifications.rs
└── lib.rs
```

State machine:

```text
Stopped → Starting → Ready → Degraded → Restarting
                 ↘ Failed
```

`start_proxy` становится идемпотентным. Одновременные вызовы не создают несколько процессов. Команда возвращает Ready только после end-to-end request через туннель.

### 6.3. Sidecar bundling

В `tauri.conf.json` указывается один base path:

```json
{
  "bundle": {
    "externalBin": ["binaries/xray"]
  }
}
```

Build preparation создаёт файл `xray-<target-triple>` для текущего target. Нельзя перечислять каждый suffixed binary как отдельный `externalBin`.

Capabilities предоставляют только `shell:allow-spawn`/kill для конкретного sidecar и допустимых аргументов. Общие `shell:allow-execute` и произвольные args не выдаются frontend-коду.

### 6.4. Readiness и recovery

Readiness состоит из двух уровней:

1. локальный port/process отвечает;
2. тестовый upstream request успешно проходит через нужный outbound.

При timeout процесс останавливается, временный config удаляется, а UI получает типизированную ошибку. Restart использует exponential backoff с jitter, верхним пределом и circuit breaker.

## 7. Этап 2: credentials и profile delivery

### 7.1. Что является секретом

- client UUID/token и другие данные, дающие право подключения, считаются credentials;
- Reality public key и SNI сами по себе не являются секретами;
- E2E message keys не смешиваются с proxy profile без отдельного решения threat model.

### 7.2. Bootstrap-проблема

Фраза «скачать proxy config с заблокированного API» создаёт циклическую зависимость. До реализации необходимо определить bootstrap channel:

- bundled bootstrap endpoints без user credential;
- user-imported signed profile;
- несколько независимых discovery endpoints;
- ограниченный enrollment token.

Profile должен быть подписан сервером, иметь version, expiry и rollback protection. Клиент валидирует signature до применения.

### 7.3. Stronghold

Stronghold подходит для encrypted local storage, но не решает автоматически происхождение master password. Нужно выбрать и протестировать:

- user PIN/passphrase;
- OS-protected secret, из которого открывается Stronghold;
- другой platform-specific key storage.

Нельзя использовать захардкоженный или детерминированный «device-derived password» без анализа его извлекаемости. Capabilities ограничиваются `stronghold:default` или ещё более узким набором.

### 7.4. Rotation

- хранить current и last-known-good profiles;
- загрузить и проверить новый profile;
- проверить соединение;
- атомарно переключить current;
- при ошибке вернуть last-known-good;
- не логировать credentials.

## 8. Этап 3: frontend integration

- [ ] Создать единый runtime detector без прямого чтения нестабильных globals в разных местах.
- [ ] Отключить регистрацию Service Worker в Tauri runtime.
- [ ] Отключить VitePWA plugin для Tauri build mode.
- [ ] Ввести network adapter; не создавать новый PocketBase singleton до Ready.
- [ ] Исключить гонку между app startup, profile unlock и API requests.
- [ ] Добавить состояния UI: Starting, Ready, Degraded, Failed, External VPN required.
- [ ] Реализовать явный retry и диагностический export без secrets.
- [ ] Проверить logout: очистка session, subscriptions и чувствительных временных файлов.

IndexedDB/Dexie и Web Crypto требуют platform tests. Поддержка в базовом WebView не гарантирует одинаковые quota, persistence и background semantics на всех ОС.

## 9. Этап 4: notifications и lifecycle

### Desktop MVP

- [ ] Перехватывать close окна и скрывать его в tray только после явного согласия пользователя.
- [ ] Tray menu содержит Open, Connection status и Quit.
- [ ] Quit штатно закрывает listener, bridge и xray.
- [ ] Realtime listener использует существующую auth/session model.
- [ ] Local notification не содержит plaintext на locked screen по умолчанию.
- [ ] Клик открывает нужный экран без доверия к произвольному route payload.
- [ ] Поведение при sleep/resume и смене сети протестировано.

### Не входит в desktop MVP

- получение уведомлений после явного Quit;
- APNs/FCM remote push через один только `tauri-plugin-notification`;
- mobile background service.

## 10. Этап 5: LiveKit и TURN

LiveKit уже содержит встроенный TURN; добавлять отдельный coturn без причины не требуется. Выбор должен учитывать текущий Nginx на `443`.

### Требуемое решение

- [ ] Проверить direct UDP и LiveKit TCP fallback.
- [ ] Включить и протестировать embedded TURN/TLS либо документировать отдельный coturn.
- [ ] Использовать доверенный сертификат и совпадающий TURN domain.
- [ ] Разрешить необходимые media ports в firewall.
- [ ] Решить конфликт `IP:443`: отдельный public IP, L4 load balancer или другой проверенный topology.
- [ ] Не размещать Nginx HTTPS и TURN/TLS на одном `IP:443` без L4 multiplexing.
- [ ] Проверить принудительный relay mode как privacy/compatibility diagnostic.
- [ ] Зафиксировать, какие IP видят LiveKit/VPS/другие клиенты; не обещать отсутствие WebRTC IP leakage без измерения.

TURN/TLS повышает совместимость с ограничительными сетями, но не гарантирует неразличимость от любого HTTPS и не отменяет полевые тесты.

## 11. Этап 6: CSP и capabilities

- [ ] Заменить `csp: null` на минимальный production CSP.
- [ ] Разделить PWA и Tauri CSP/build modes.
- [ ] Разрешить localhost только для выбранного bridge port/schema.
- [ ] Удалить неиспользуемые fs/http/dialog/os capabilities.
- [ ] Scoped shell permission разрешает только bundled xray и фиксированный набор args.
- [ ] Frontend не получает путь к secrets/profile и не может запускать произвольные commands.
- [ ] Проверить CSP в packaged application, а не только Vite dev server.

## 12. Этап 7: xray supply chain

Sidecar не хранится в Git, но его получение должно быть воспроизводимым:

- pin точной версии xray-core;
- отдельный manifest `target → URL → SHA-256`;
- fail closed при несовпадении checksum;
- download в уникальную временную директорию;
- запрет `latest` URLs;
- platform-specific preparation для Bash/PowerShell или единый Node/Rust script;
- архив/лицензии xray отражены в NOTICE/SBOM;
- CI artifact provenance связывает sidecar checksum с релизом Nemo.

`beforeBuildCommand` не должен слепо скачивать сетью при каждом локальном запуске. Предпочтительно иметь отдельную idempotent-команду preparation и кеш CI, проверяемый checksum.

## 13. Этап 8: build и публичный release

### Build scripts

- [ ] Добавить `tauri:dev`, `tauri:build` и `tauri:check`.
- [ ] Использовать `npm ci`, `cargo ... --locked` и pinned toolchains.
- [ ] Собирать каждую desktop-платформу на соответствующем runner.
- [ ] Не считать cross-compilation заменой platform test.

### Release artifacts

- [ ] macOS universal или отдельные arm64/x64 artifacts подписаны и notarized.
- [ ] Windows installer подписан доверенным code-signing certificate.
- [ ] Linux packages имеют задокументированные форматы и зависимости.
- [ ] Каждый artifact имеет SHA-256, SBOM и source tag/commit.
- [ ] GitHub Release сначала draft; публикация только после manual approval.
- [ ] Workflow не имеет SSH key, self-hosted production runner или deploy job.
- [ ] Third-party Actions закреплены по полным commit SHA.

Artifacts собираются только из очищенного публичного репозитория согласно `GIT_MIGRATION.md`. Это позволяет пользователю сопоставить исходный tag и полученный binary.

## 14. Тестовая матрица

### Unit

- profile validation/signature/expiry;
- state machine и concurrency;
- route allowlist;
- readiness timeout/backoff/circuit breaker;
- redaction секретов;
- atomic rotation и rollback.

### Integration

- sidecar start/stop/crash/restart;
- HTTP auth и CRUD через выбранный transport;
- SSE subscribe/reconnect/gap recovery;
- WebSocket, если используется;
- streaming upload/download;
- DNS через нужный маршрут;
- invalid/revoked profile;
- sleep/resume и смена сети.

### Platform

- Windows 11 WebView2;
- поддерживаемые macOS Intel/Apple Silicon;
- выбранные Linux distributions/WebKitGTK;
- install, upgrade, rollback и uninstall;
- code-signing/notarization validation.

### Network

- домашняя сеть и mobile hotspot;
- сеть с недоступным основным доменом;
- высокий packet loss/latency;
- direct UDP, TCP fallback и TURN/TLS;
- длительный soak без утечки процессов/памяти.

Ручной тест «из РФ один раз заработало» не заменяет повторяемую матрицу, но остаётся обязательным acceptance test устойчивости к текущим ограничениям.

## 15. Риски и fallback

| Риск | Влияние | Митигация |
|---|---|---|
| Выбранный WebView не использует SOCKS | Критическое | Gate 0 и local bridge/native adapter |
| Bootstrap endpoint заблокирован | Критическое | signed offline/import profile и несколько discovery paths |
| xray artifact подменён | Критическое | pinned version, checksum, provenance |
| Sidecar остаётся после crash | Высокое | handle cleanup, startup reconciliation, OS tests |
| Reality profile перестал работать | Высокое | signed rotation, last-known-good, external VPN fallback |
| TURN конфликтует с Nginx:443 | Высокое | отдельный IP/L4 topology до deployment |
| Tray listener расходует батарею/трафик | Среднее | backoff, sleep handling, opt-in autostart |
| Linux WebKit различается по distro | Среднее | ограничить поддерживаемую матрицу |
| Signing secrets скомпрометированы | Критическое | отдельное хранение, минимальные permissions, rotation plan |

Fallback первого desktop-релиза: Tauri без встроенного xray, с явным индикатором необходимости внешнего VPN. Нельзя скрывать такой fallback за ложным статусом «обход активен».

## 16. Критерии готовности desktop-релиза

- [ ] Gate 0 пройден на одной платформе и ADR утверждён.
- [ ] HTTP, realtime и media проходят через выбранный маршрут.
- [ ] DNS и redirect behavior проверены.
- [ ] Profile bootstrap, подпись, expiry и rotation работают.
- [ ] Sidecar lifecycle проверен normal/crash/forced termination tests.
- [ ] Service Worker/VitePWA отключены только в Tauri build.
- [ ] CSP и capabilities минимизированы.
- [ ] Notifications честно соответствуют desktop lifecycle.
- [ ] LiveKit имеет проверенный direct/fallback/TURN маршрут без port conflict.
- [ ] Windows/macOS/Linux builds установлены и протестированы на чистых системах.
- [ ] Artifacts подписаны, имеют checksums/SBOM и связаны с source tag.
- [ ] Public workflow не имеет доступа к VPS.
- [ ] Известные ограничения опубликованы в release notes.

## 17. Post-MVP: Android и iOS

Для каждой мобильной платформы отдельно исследовать:

- допустимый network-extension/VPN API;
- background lifecycle;
- APNs/FCM integration;
- secure credential storage;
- distribution/signing/entitlements;
- правила магазинов и sideloading;
- батарею и kill/restart behavior.

До завершения этого исследования нельзя включать Android/iOS в общую desktop CI matrix добавлением одного target triple.

## 18. Официальные технические ориентиры

- Tauri external binaries: https://v2.tauri.app/develop/sidecar/
- Tauri Stronghold: https://v2.tauri.app/plugin/stronghold/
- Tauri notifications: https://v2.tauri.app/plugin/notification/
- Tauri permissions: https://v2.tauri.app/security/permissions/
- LiveKit deployment и embedded TURN: https://docs.livekit.io/transport/self-hosting/deployment/
- LiveKit ports/firewall: https://docs.livekit.io/transport/self-hosting/ports-firewall/

Версии и platform support проверяются заново непосредственно перед реализацией и релизом; документ не должен подменять актуальную upstream documentation.
