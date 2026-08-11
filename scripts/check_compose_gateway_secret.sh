#!/usr/bin/env bash
# Проверяет, что Compose передаёт конкретным сервисам непустой
# PUSH_GATEWAY_SECRET из выбранных env-источников (env_file) и не
# переопределяет его пустой строкой.
#
# Проверяемые пары (compose → сервис):
#   infra/dev     → pocketbase  (секрет из ../../app/.env через env_file)
#   infra/prod    → pocketbase  (секрет из ../../app/.env через env_file)
#   infra/vps_new → pocketbase, push-gateway (секрет из .env через env_file)
#
# Запуск: scripts/check_compose_gateway_secret.sh
# Не трогает реальные .env: разворачивает временную копию в mktemp.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/app" "$TMP/infra/dev" "$TMP/infra/prod" "$TMP/infra/vps_new"
cp "$REPO_ROOT/infra/dev/docker-compose.yml" "$TMP/infra/dev/"
cp "$REPO_ROOT/infra/prod/docker-compose.yml" "$TMP/infra/prod/"
cp "$REPO_ROOT/infra/vps_new/docker-compose.yml" "$TMP/infra/vps_new/"

SECRET="compose-secret-check-$(date +%s)"
printf 'PUSH_GATEWAY_SECRET=%s\n' "$SECRET" >"$TMP/app/.env"
printf 'PUSH_GATEWAY_SECRET=%s\n' "$SECRET" >"$TMP/infra/vps_new/.env"

if ! command -v docker >/dev/null 2>&1; then
	echo "SKIP: docker compose недоступен"
	exit 0
fi

fail=0

# service_has_secret <rendered> <service>: проверяет, что в сервисе
# с заданным именем PUSH_GATEWAY_SECRET установлен непустым.
service_has_secret() {
	local rendered="$1" service="$2"
	printf '%s\n' "$rendered" | awk -v svc="^  ${service}:$" '
		$0 ~ svc { in_svc=1; next }
		in_svc && /^  [a-zA-Z0-9_-]+:$/ { in_svc=0 }
		in_svc && /PUSH_GATEWAY_SECRET: [^"'"'"']/ { found=1 }
		END { exit found ? 0 : 1 }
	'
}

check_service() {
	local label="$1" file="$2" service="$3"
	local rendered
	rendered="$(cd "$TMP/$file" && docker compose config 2>/dev/null || true)"

	if service_has_secret "$rendered" "$service"; then
		echo "OK   $label → ${service}: PUSH_GATEWAY_SECRET из env_file (непустой)"
	else
		echo "FAIL $label → ${service}: PUSH_GATEWAY_SECRET отсутствует/пустой"
		fail=1
	fi

	if printf '%s\n' "$rendered" | grep -q "PUSH_GATEWAY_SECRET: \"\""; then
		echo "FAIL $label: обнаружено пустое переопределение PUSH_GATEWAY_SECRET"
		fail=1
	fi
}

check_service "dev compose (домашняя PB → app/.env)" "infra/dev" "pocketbase"
check_service "prod compose (домашняя PB → app/.env)" "infra/prod" "pocketbase"
check_service "vps_new compose (VPS PB → .env)" "infra/vps_new" "pocketbase"
check_service "vps_new compose (VPS gateway → .env)" "infra/vps_new" "push-gateway"

if [ "$fail" -ne 0 ]; then
	echo "ПРОВАЛ: PUSH_GATEWAY_SECRET не приходит в контейнеры из env_file."
	exit 1
fi

echo "OK: PUSH_GATEWAY_SECRET подаётся из env-источников во всех конфигурациях."