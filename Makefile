# Единый пульт управления инфраструктурой Knock-Knock
# Поднимает контейнеры в соответствующих папках infra/

.PHONY: help network start-all stop-all start-prod start-dev start-mailpit stop-prod stop-dev stop-mailpit clean-docker restart-tunnel logs-prod logs-dev

help:
	@echo "Доступные команды управления инфраструктурой:"
	@echo "  make start-all     - Поднять Прод, Дев и Mailpit"
	@echo "  make stop-all      - Остановить всю инфраструктуру"
	@echo "  make start-prod    - Запустить Production (БД + Веб + Туннель)"
	@echo "  make start-dev     - Запустить только Development БД"
	@echo "  make clean-docker  - Полная очистка Docker (кэш, неиспользуемые контейнеры и образы)"
	@echo "  make restart-tunnel - Перезапустить клиент туннеля FRP"

# Создаёт магистральную Docker-сеть (нужно выполнить 1 раз)
# MTU 1300 нужен для корректной маршрутизации больших пакетов через VPN/Wireguard
network:
	@docker network create --opt com.docker.network.driver.mtu=1300 whoami-net 2>/dev/null || echo "Сеть whoami-net уже существует."

# --- ЗАПУСК ---
start-prod: network
	cd infra/prod && docker compose up -d

start-dev: network
	cd infra/dev && docker compose up -d

start-mailpit: network
	cd infra/mailpit && docker compose up -d

build:
	cd app && npm run build

# --- ОСТАНОВКА ---
stop-prod:
	cd infra/prod && docker compose down

stop-dev:
	cd infra/dev && docker compose down

stop-mailpit:
	cd infra/mailpit && docker compose down

# --- ГРУППОВЫЕ ---
start-all: start-prod start-dev start-mailpit
	@echo "✅ Все локальные среды успешно запущены!"

stop-all: stop-prod stop-dev stop-mailpit
	@echo "🛑 Вся локальная инфраструктура остановлена."

# --- ОЧИСТКА ---
clean-docker:
	@echo "🧹 Запуск полной очистки Docker..."
	docker system prune -a --volumes -f

# --- ПЕРЕЗАПУСК ---
restart-tunnel:
	cd infra/prod && docker compose restart frpc
	@echo "🔄 Туннель FRP перезапущен."

# --- ЛОГИ ---
logs-prod:
	docker logs whoami-pb -f

logs-dev:
	docker logs whoami-pb-dev -f
