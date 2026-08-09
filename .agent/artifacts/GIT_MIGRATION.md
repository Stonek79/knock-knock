# Публичный репозиторий и релизный цикл Nemo

> **Статус:** целевая схема, требующая реализации и проверки
> **Назначение:** отделить приватную разработку от публичного проверяемого релиза
> **Главный принцип:** автоматизируется подготовка и сборка; публикация и deployment требуют ручного подтверждения

## 1. Цели и границы

Nemo разрабатывается в приватном dev-репозитории с полной историей, внутренними планами и operational-конфигурацией. Пользователям предоставляется отдельный публичный репозиторий с минимальным исходным кодом, достаточным для аудита и самостоятельной сборки.

Новая схема должна обеспечивать:

- публичный аудит исходного кода и self-hosting;
- отсутствие dev-истории, `.agent`, локальных конфигов и персональных метаданных;
- проверяемую связь между tag, исходным кодом, Docker image и Tauri-бинарниками;
- отсутствие ключей или сетевого доступа от GitHub Actions к VPS;
- только ручной deployment на VPS по SSH;
- воспроизводимую подготовку релиза и возможность rollback.

Отдельный аккаунт и очищенная история повышают псевдонимность, но не гарантируют анонимность. Код, ранее публичная история, домен, IP, время публикаций и инфраструктурные признаки могут использоваться для корреляции.

### Целевая runtime-инфраструктура для первого пилота

Стоимость VPS является ограничением первого этапа, поэтому production media storage остаётся на домашнем сервере. Это осознанный trade-off, а не требование полной отказоустойчивости.

```text
Домашний сервер:
  Dev PocketBase + Dev Mailpit
  Production MinIO для изображений и видео
  FRP client с исходящим защищённым соединением

VPS:
  Production PocketBase
  Frontend + Nginx
  LiveKit
  Push-gateway
  FRP server
```

Production PocketBase не зависит от домашнего PocketBase. Через FRP VPS получает только ограниченный доступ к production bucket в MinIO.

При недоступности дома API, авторизация и текстовые данные на VPS должны продолжать работать. Медиа могут временно быть недоступны; клиент обязан показывать понятное состояние и повторять upload/download, а не терять операцию.

MinIO не публикуется напрямую в интернет. Для него используются отдельный bucket, отдельный service account, TLS, минимальные права и backup на отдельный носитель. Позже storage можно перенести на VPS или внешний S3 без изменения PocketBase API.

## 2. Репозитории и публикуемый состав

### Приватный dev-репозиторий

Содержит:

- полную историю разработки;
- `.agent`, внутренние планы и отчёты;
- реальные deployment-конфиги и topology;
- dev/staging-конфигурацию;
- локальные operational-скрипты;
- любые материалы, не требуемые для сборки публичного релиза.

Если dev-репозиторий сейчас публичен, его следует сделать private как можно раньше. Это не удалит уже созданные клоны, форки или кеши. Все когда-либо опубликованные секреты необходимо ротировать.

### Публичный release-репозиторий

Публикуются только:

- исходный код frontend/PWA и Tauri;
- необходимые PocketBase hooks и код публичных runtime-сервисов;
- lock-файлы зависимостей;
- обезличенные self-hosting templates;
- public README, LICENSE, SECURITY.md и документация сборки;
- корневые GitHub Actions для CI, Docker и Tauri releases.

Не публикуются:

- `.agent`, `.agents`, `.gemini`, `brain`, IDE/MCP-конфиги;
- реальные `.env*`, ключи, сертификаты, токены и backup-файлы;
- реальные IP, персональные пути и администраторские endpoints;
- production inventory, SSH/FRP/VPN credentials и operational deployment scripts;
- кеши, coverage, test reports, `dist`, `target`, `node_modules` и локальные бинарники.

Публичная инфраструктура должна состоять из шаблонов с placeholders. Реальные production-конфиги хранятся вне публичного репозитория.

## 3. Целевой поток релиза

```text
Приватный dev-репозиторий
        │
        ▼
Локальный prepare-release: allowlist → очистка → проверки → сборка
        │
        ▼
Ручной просмотр manifest и diff
        │
        ▼ подтверждение
Публичный source-репозиторий
        │
        ▼
GitHub Actions: CI → Docker image → Tauri artifacts → checksums/signatures
        │
        ▼
Ручной SSH deploy точного image digest на VPS
```

GitHub Actions не выполняет SSH, не запускает self-hosted runner в production-сети и не вызывает deployment webhook.

## 4. Псевдонимный GitHub-профиль

1. Создать отдельный email и GitHub-аккаунт проекта.
2. Не переиспользовать персональный SSH/GPG-ключ или Git identity.
3. Создать отдельный SSH-ключ:

```bash
ssh-keygen -t ed25519 -C "<project-noreply-email>" -f ~/.ssh/id_nemo_github
```

4. Настроить отдельный alias:

```text
Host github-nemo
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_nemo_github
  IdentitiesOnly yes
```

5. В release-репозитории задать локальную, а не глобальную identity:

```bash
git config user.name "Nemo"
git config user.email "<project-noreply-email>"
```

VPN, отдельный browser profile и раздельные credentials уменьшают простую корреляцию, но не являются доказательством анонимности.

## 5. Дистилляция

`scripts/distill_prod.sh` необходимо заменить безопасным `scripts/prepare-release.sh`. Скрипт должен работать от собственного расположения, а не от текущего `pwd`, и никогда не удалять произвольный sibling-каталог.

### Обязательное поведение

1. Принимать версию релиза явно: `./scripts/prepare-release.sh v1.0.0`.
2. Создавать staging через `mktemp -d`.
3. Копировать только allowlist; denylist используется лишь как дополнительная защита.
4. Генерировать публичные README/config templates вместо копирования внутренних файлов.
5. Не переносить существующий `.git` и не следовать неожиданным symlink.
6. Завершаться при любом неизвестном или секретоподобном файле.
7. Создавать manifest с хешами всех экспортируемых файлов.
8. Показывать diff с предыдущим публичным tag.
9. Не выполнять push без отдельного интерактивного подтверждения.

Минимальный allowlist должен отдельно перечислять файлы и директории, необходимые для:

- `npm ci` и frontend build;
- Docker build, включая используемый nginx config;
- `cargo build --locked` и Tauri build;
- PocketBase hooks/self-hosting template;
- корневых `.github/workflows`.

Нельзя копировать весь `app/`, полагаясь только на `.gitignore`: игнорируемые секреты всё равно физически окажутся в staging и могут попасть в build context или архив.

### Release gates перед commit

- secret scan staging-директории и будущего Git index;
- поиск персональных email, usernames, абсолютных путей, реальных IP и внутренних доменов;
- проверка отсутствия `.git`, `.env*`, private keys и запрещённых директорий;
- `npm ci`, lint, typecheck, unit/integration tests;
- production frontend build;
- Docker build из очищенной директории;
- `cargo check --locked` и тестовая Tauri build для поддерживаемых платформ;
- ручной просмотр `git status`, `git diff --cached` и manifest.

Проверка считается успешной только при exit code `0`; наличие workflow-файла само по себе не считается доказательством готовности.

## 6. Первый push и последующие релизы

Первый релиз создаётся в чистой директории:

```bash
git init -b main
git config user.name "Nemo"
git config user.email "<project-noreply-email>"
git remote add origin git@github-nemo:<project-account>/nemo-messenger.git
git add -A
git status
git commit -m "release: v1.0.0"
git tag -s v1.0.0 -m "Nemo v1.0.0"
git push -u origin main
git push origin v1.0.0
```

Для пустого репозитория `--force` не нужен. Последующие релизы должны сохранять публичную историю изменений: новый очищенный snapshot сравнивается с предыдущим, затем создаётся обычный commit и подписанный tag. Постоянное переписывание public history ухудшает аудит и доверие.

## 7. GitHub Actions публичного репозитория

CI имеет минимальные permissions и выполняет:

1. установку зависимостей только из lock-файлов;
2. lint, typecheck и tests;
3. сборку Docker image;
4. публикацию immutable tags: release version и commit SHA;
5. сборку Tauri по поддерживаемой desktop matrix;
6. формирование SHA-256 checksums, SBOM и provenance;
7. подпись поддерживаемых artifacts и публикацию GitHub Release.

Нельзя ограничиваться mutable tag `latest`. Он может существовать как удобный alias, но deployment выполняется только по проверенному digest:

```text
ghcr.io/<project-account>/nemo-app@sha256:<verified-digest>
```

Для анонимного pull с VPS GHCR package должен быть public. Если package private, на VPS понадобится отдельный read-only token, что увеличивает operational footprint.

Third-party Actions фиксируются по полному commit SHA. Signing/notarization secrets для Apple/Windows отделены от VPS и имеют минимальные права.

## 8. Ручной deployment на VPS

Перед deployment оператор фиксирует:

- release tag и commit SHA;
- image digest;
- текущий работающий digest для rollback;
- статус backup PocketBase и миграций.

Deployment выполняется вручную:

```bash
ssh <production-host-alias>
cd <production-directory>
docker compose pull web
docker compose up -d web
docker compose ps
```

Compose должен ссылаться на выбранный immutable digest. После запуска выполняются health/smoke checks API, realtime, media, LiveKit и push. При провале возвращается предыдущий digest и повторяется проверка.

На VPS не выполняются `git pull`, frontend build, Docker build или автоматическое обновление Watchtower/cron.

## 9. Dev-доступ к production-сервисам

Dev не должен использовать production credentials или production device tokens. Если общий push-gateway необходим, для dev создаются:

- отдельный endpoint или audience;
- отдельные credentials;
- allowlist вызывающих сервисов и rate limit;
- запрет отправки на production subscriptions;
- редактирование чувствительных данных в логах.

Такое взаимодействие допустимо только после проверки этих границ; оно не считается «абсолютно безопасным» по умолчанию.

## 10. Критерии готовности релизного контура

- [ ] Dev-репозиторий private; раскрытые ранее секреты ротированы.
- [ ] Публичный состав и operational private-состав зафиксированы.
- [ ] `prepare-release.sh` использует allowlist и безопасную staging-директорию.
- [ ] Экспорт проходит secret/identity/path scan.
- [ ] Из экспортированной копии успешно собираются frontend, Docker и Tauri.
- [ ] Публичные README, LICENSE, SECURITY.md и self-hosting guide готовы.
- [ ] Git identity и SSH-ключ проекта отделены от персональных.
- [ ] Actions не имеют credentials или маршрута к VPS.
- [ ] Docker публикуется с version/SHA tags и digest.
- [ ] Tauri artifacts имеют checksums, подпись и связь с tag/commit.
- [ ] Ручной deployment и rollback отрепетированы на staging.
- [ ] Production backup/restore и smoke checks проверены.
