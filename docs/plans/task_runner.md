# Task Runner PocketBase

> **Статус:** описание текущего механизма и обязательной переработки. Очередь не
> используется одноразовыми комнатами.

## Текущее устройство

`task_queue` хранит `task_key`, `type`, `payload`, `status`, `attempts`,
`last_error` и `run_at`. Cron выбирает pending/failed записи, выполняет handler и
помечает результат.

Фактически существуют два пути обработки:

- общий runner в `tasks.pb.js`/`task_helpers.js`;
- отдельный broadcast cron в `main.04-scheduled-tasks.pb.js`.

Обычный push task сейчас может содержать subscription endpoint/keys и
зашифрованный content/IV. Поэтому старое утверждение «payload содержит только
ID» реализации не соответствует.

## Известные проблемы

- generic dispatcher знает не все schema types и может завершить неизвестную
  задачу как `completed`;
- generic runner и broadcast cron могут конкурировать за pending broadcast;
- pending selection должен явно учитывать `run_at <= now`;
- call push создаёт запись без обязательного `type`;
- формат subscription теперь нормализован: новые задачи используют вложенный
  `keys`, gateway сохраняет совместимость со старым плоским форматом;
- claims/locking требуют проверки при параллельном запуске;
- payload содержит больше чувствительных данных, чем необходимо;
- logs и `last_error` требуют redaction/retention.

## Целевая модель

1. Один dispatcher и исчерпывающий enum handler-типов.
2. Unknown type переводится в `failed` и создаёт diagnostic, но не считается
   выполненным.
3. Выборка только `run_at <= now`.
4. Атомарный claim `pending/failed → processing` с lease/owner.
5. Idempotency через уникальный `task_key` и идемпотентный downstream handler.
6. Retry только для временных ошибок с ограниченным exponential backoff.
7. Permanent error сразу завершает задачу как failed/dead-letter.
8. Payload содержит минимальные references; push credentials читаются из
   закрытой subscription collection непосредственно перед отправкой.
9. Expired subscription удаляется безопасным server handler.
10. Cleanup удаляет старые completed/failed записи по утверждённому retention.

Broadcast может остаться отдельным процессором только при отдельном status/type
namespace, который общий runner никогда не выбирает.

## Безопасность

- коллекция недоступна клиенту;
- gateway принимает только запрос с server-to-server secret;
- plaintext message и auth token в payload запрещены;
- endpoint/keys не логируются;
- одноразовые push не создают durable task: volatile runtime отправляет только
  нейтральный wake-up signal с непрозрачным короткоживущим handle.

## Acceptance tests

- scheduled pending не выполняется раньше `run_at`;
- параллельные workers выполняют задачу ровно один раз;
- temporary failure повторяется по backoff;
- permanent/unknown failure не становится completed;
- broadcast не перехватывается generic runner;
- expired endpoint очищается;
- logs/payload не содержат запрещённых данных;
- restart восстанавливает постоянные задачи, но не ephemeral state.
