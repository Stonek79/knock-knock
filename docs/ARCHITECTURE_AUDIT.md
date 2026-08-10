# Архитектурный аудит Nemo

> **Дата снимка:** 9 августа 2026 года  
> **Статус:** активный список технических рисков  
> **Решение:** проект продолжает разработку; публичный production-релиз пока
> имеет статус `NO-GO`.

Этот документ фиксирует расхождения между кодом, схемой PocketBase,
инфраструктурой и заявленной моделью приватности. Он не означает, что
production-релиз планировался на текущем этапе.

## Что подтверждено

- frontend проходит `npm run lint` и `npm run build`;
- все Compose-файлы проходят синтаксическую проверку;
- Dev и Prod используют разные PocketBase data directories и разные MinIO
  buckets/service accounts;
- MinIO слушает loopback-интерфейс домашнего сервера;
- маршрут VPS `127.0.0.1:19000` → домашний MinIO проверен HTTP health request;
- базовый frontend следует направлению `UI → services → repositories →
  PocketBase`.

## P0: исправить до любого публичного пилота

### 1. Единый криптографический контракт

Текущий lifecycle ключей несовместим: генерация, публикация prekey, упаковка
room key и recovery используют разные алгоритмы или не ту пару ключей.

Нужно:

- определить версии ключевого протокола и назначения identity/signing и
  agreement/prekey ключей;
- исправить `generate → publish → wrap → unwrap → backup → restore` как единый
  flow;
- разделить keystore по `userId`;
- очищать room keys, media/history cache и Outbox при logout/смене пользователя;
- добавить migration/versioning старых ключей;
- подтвердить flow интеграционными тестами на двух клиентах.

До прохождения этих проверок Nemo нельзя описывать как проверенный E2EE-клиент.

### 2. Закрыть внутренний Push/LiveKit gateway

Gateway сейчас опубликован через Nginx и не проверяет вызывающую сторону.

Нужно:

- добавить отдельный server-to-server secret PocketBase → gateway;
- не принимать от браузера произвольные push subscriptions;
- выдавать LiveKit token только после проверки PocketBase-сессии, членства в
  комнате и разрешённой identity;
- заменить глобальный CORS на точный allowlist;
- не писать полные push endpoint и внутренние ошибки в logs;
- добавить rate limits и ограничения размера тела запроса.

### 3. Исправить PocketBase authorization

Требуют закрытия или ограничения:

- публичное чтение коллекции `invites` и её token;
- глобальный auth-доступ к `users`, `media`, `presence_status` и
  `message_reactions`;
- изменение чужого presence;
- изменение чужого message metadata;
- изменение произвольного `call_logs.status`;
- media без обязательной room relation, membership rule и server-side
  size/MIME limits.

Базовое чтение `users` должно быть owner-only. Для поиска открытых профилей и
общих контактов нужны отдельные серверные DTO endpoints с минимальным набором
разрешённых полей.

### 4. Исправить приглашения и регистрацию

Hook регистрации использует отсутствующие в schema поля `code/status` и
продолжает регистрацию после ошибки. Необходимо выбрать одну модель `invites`,
сделать проверку fail-closed и покрыть сценарии valid/expired/used/wrong-user
интеграционными тестами.

### 5. Ротировать секреты

Похожие на рабочие секреты обнаружены в `scripts/keys_gen.cjs` и
`scripts/pb-setup-server.sh`. Если они когда-либо применялись, значения нужно
считать раскрытыми, заменить и удалить из Git history перед публикацией.

## P1: высокий приоритет разработки

- создать versioned PocketBase migrations и проверку schema drift;
- закрепить версии PocketBase, LiveKit, frontend image и остальных контейнеров;
- исправить task queue: типы задач, планирование, ownership и минимизацию
  payload;
- исправить формат call push subscription;
- убрать side effect подключения `RealtimeGateway` при импорте;
- исправить lifecycle silent refresh;
- зашифровать либо исключить чувствительные данные Outbox;
- очищать CacheStorage и IndexedDB при logout;
- определить log redaction и retention;
- ограничить PocketBase Admin UI и административный SSH firewall-правилами;
- добавить `.dockerignore`, healthchecks и container hardening.

## Одноразовый runtime

Текущий `isPrivate/isEphemeral` не является реализацией согласованного режима и
не должен показываться пользователю как готовая одноразовая комната.

Целевой контур отделён от обычных PocketBase, MinIO и task queue:

- персональный одноразовый invite с TTL;
- серверное состояние только в памяти;
- reconnect lease — 2 минуты;
- выход участника удаляет только его lease и ключи;
- закрытие создателем уничтожает комнату для всех;
- без multi-device;
- neutral push содержит только непрозрачный wake-up handle;
- сообщения и медиа находятся только в памяти устройств;
- никаких durable logs, backups и записей в обычных коллекциях.

После двух минут сервер не обязан хранить команду очистки. Клиент должен иметь
локальный deadline/epoch и самостоятельно уничтожить данные при следующем
запуске. Сервер может хранить только краткоживущий непрозрачный tombstone в
памяти, но не идентификаторы комнаты или участников.

Для больших файлов нужно явно выбрать одно из ограничений:

1. передача только когда отправитель и получатель онлайн; либо
2. отдельный ограниченный relay, хранящий зашифрованные chunks только в памяти.

## Release pipeline

Текущий `scripts/distill_prod.sh` является временным прототипом и не должен
публиковать release. Его должен заменить безопасный allowlist-export:

- фиксированный staging path и защита от удаления неверной директории;
- отсутствие глобальной замены строк в исходниках;
- secret/path/domain/email scan;
- удаление tests/stories/dev scripts по явному manifest;
- lint, test и build именно из экспортированной копии;
- LICENSE, SECURITY.md, threat model и воспроизводимый public CI;
- связь `commit → tag → artifact → checksum/SBOM`;
- без `--force` и без доступа public CI к VPS.

## Критерий закрытия аудита

Аудит закрывается подтверждением каждого P0:

- кодом и migration;
- автоматическими тестами;
- повторным security review;
- обновлением `CURRENT_STATE.md` и production checklist.
