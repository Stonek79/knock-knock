# Требования безопасности Nemo

> **Статус:** обязательные требования, а не подтверждение безопасности текущей
> реализации. Открытые дефекты перечислены в
> [ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md).

## 1. Секреты

В Git разрешены только шаблоны `.env.example` без рабочих значений.

Нельзя коммитить:

- `.env`, токены, пароли, JWT/VAPID/LiveKit/FRP/PocketBase/MinIO secrets;
- SSH/GPG/private keys, certificates и recovery backups;
- реальные operational IP, персональные пути и administrator email;
- database/media dumps.

`.gitignore` не является проверкой секретов. Перед публичным release необходимы
secret scan staging-директории, Git index/history, Docker context/layers и
frontend bundle. Обнаруженный рабочий secret ротируется, а не просто удаляется
из последнего commit.

Каждый сервис получает только собственный env-файл. Общий `.env` со всеми
секретами не передаётся всем контейнерам.

## 2. Публичная поверхность

Публичными могут быть только необходимые пользовательские маршруты:

- HTTPS frontend/API/realtime;
- LiveKit signalling/media ports по утверждённой схеме;
- необходимые certificate endpoints.

PocketBase Admin UI, MinIO API/console, FRP dashboard и домашний SSH закрываются
firewall/allowlist или приватным административным каналом.

Push/LiveKit gateway является внутренним (реализация ожидает исправлений и проверки):

- вызов PocketBase → gateway подписывается отдельным secret `PUSH_GATEWAY_SECRET`
  (заголовок `Authorization: Bearer`, постоянновременное сравнение, fail-closed);
- LiveKit token требует auth и membership (проверяется в хуке PocketBase
  `/api/calls/token`, gateway принимает запрос только от PocketBase);
- CORS полностью удалён — браузерные запросы недопустимы;
- действуют body limits (`100 KB`), rate limits (120 push/min, 60 token/min)
  и ограничения nginx (`limit_req`, `client_max_body_size 64k`);
- полные push endpoints не попадают в логи и ответы gateway (возвращаются
  `expired_ids` записей PocketBase);
- Nginx-маршрут `/push/` защищён и будет удалён после переноса Prod PocketBase
  на VPS.

FRP `tls.disable` допустим только при документированном и проверенном внешнем
защищённом транспорте. Наличие SOCKS/Reality в соседнем конфиге само по себе не
доказывает защиту каждого deployment.

## 3. PocketBase authorization

- deny-by-default для private collections;
- owner/membership проверяется в API Rules и custom handlers;
- `users` base view owner-only; поиск возвращает минимальный server DTO;
- `invites` нельзя list/view напрямую;
- media relation с room обязательна для chat media;
- presence меняет только владелец или доверенный server handler;
- message status/reactions/read receipts используют узкие endpoints, а не
  произвольный PATCH чужой записи;
- call status проверяет участника, room и допустимый state transition;
- uploads имеют server-side MIME/size/quota limits;
- filters с пользовательским вводом используют parameter binding.

Schema изменяется versioned migrations и проверяется в staging. Ручное изменение
Dashboard без migration считается schema drift.

## 4. Криптография и локальные данные

- identity/signing и agreement/prekey имеют разные явные назначения;
- room/message/media encryption использует versioned envelope format;
- ключи и IndexedDB разделены по endpoint и `userId`;
- plaintext Outbox/media не хранится долговременно;
- logout/account switch очищает keys, Outbox, media/history, Query cache и
  CacheStorage в соответствии с продуктовой политикой;
- recovery экспортирует ключи только в зашифрованном versioned backup;
- crypto flow подтверждается реальным двухклиентским interoperability test.

Пока эти проверки не проходят, публичные заявления о проверенном E2EE или Zero
Knowledge запрещены.

## 5. Одноразовые комнаты

- отдельный volatile runtime, без обычных PocketBase/MinIO/task queue;
- server state только в памяти;
- media только в памяти устройств;
- reconnect lease 2 минуты;
- клиентский deadline/epoch очищает offline-сессию при следующем запуске;
- neutral push не содержит room/user/message identifiers;
- durable logs и backups отсутствуют;
- уничтожение ключа делает оставшийся зашифрованный сетевой fragment
  бесполезным, но приложение не обещает удалить screenshot или экспорт вне его
  контроля.

## 6. Logs и backups

Logs не содержат plaintext сообщений, passwords/tokens, invite token, полный
push endpoint и подробные внутренние ошибки в client response. Для identifiers
определяются redaction и минимальный retention.

Dev backup не обязателен. Prod PocketBase и MinIO резервируются согласованно.
Локальная копия на том же физическом диске защищает от логической ошибки, но не
от поломки или утраты диска. Restore проверяется в изолированном окружении.

Одноразовые данные никогда не входят в backup.

## 7. Containers и dependencies

- production images закреплены по version/digest;
- Docker context исключает `.env`, `.git`, caches и artifacts через
  `.dockerignore`;
- используются lockfiles и `npm ci`/`cargo --locked`;
- контейнеры получают healthcheck, resource limits, `no-new-privileges`,
  `cap_drop` и read-only filesystem там, где возможно;
- dependency, Cargo и container scans выполняются перед release;
- production CSP и минимальные Tauri capabilities обязательны.

## 8. Реагирование на инцидент

1. Ограничить затронутый endpoint или сервис.
2. Ротировать секрет; не ждать удаления его из history.
3. Проверить logs с учётом privacy и определить период воздействия.
4. Обновить images/config вручную по проверенному digest.
5. Проверить rollback/restore.
6. Зафиксировать причину и добавить regression test/gate.
