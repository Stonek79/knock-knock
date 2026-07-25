# Единый пульт управления инфраструктурой Knock-Knock
# Поднимает контейнеры в соответствующих папках infra/

.PHONY: help network start-all stop-all start-prod start-dev start-mailpit start-tunnel stop-tunnel stop-prod stop-dev stop-mailpit clean-docker restart-tunnel logs-prod logs-dev

help:
	@echo "Доступные команды управления инфраструктурой:"
	@echo "  make start-all     - Поднять Прод, Дев и Mailpit"
	@echo "  make stop-all      - Остановить приложения (туннель НЕ затрагивается!)"
	@echo "  make start-tunnel  - Запустить постоянный системный туннель FRP"
	@echo "  make stop-tunnel   - Остановить системный туннель FRP"
	@echo "  make start-prod    - Запустить Production (БД + Веб)"
	@echo "  make start-dev     - Запустить только Development БД"
	@echo "  make clean-docker  - Полная очистка Docker (кэш, неиспользуемые контейнеры и образы)"
	@echo "  make restart-tunnel - Перезапустить клиент туннеля FRP"

# Создаёт магистральную Docker-сеть (нужно выполнить 1 раз)
# MTU 1300 нужен для корректной маршрутизации больших пакетов через VPN/Wireguard
network:
	@docker network create --opt com.docker.network.driver.mtu=1300 whoami-net 2>/dev/null || echo "Сеть whoami-net уже существует."

# --- СИСТЕМНЫЙ ТУННЕЛЬ (Работает 24/7 независимо от приложений) ---
start-tunnel: network
	cd infra/tunnel && docker compose up -d
	@echo "🌐 Системный туннель FRP успешно запущен!"

stop-tunnel:
	cd infra/tunnel && docker compose down
	@echo "🛑 Системный туннель FRP остановлен."

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
	@echo "🛑 Приложения остановлены. Туннель продолжает работать в фоновом режиме."

# --- ОЧИСТКА ---
clean-docker:
	@echo "🧹 Запуск полной очистки Docker..."
	docker system prune -a --volumes -f

# --- ПЕРЕЗАПУСК ---
restart-tunnel:
	cd infra/tunnel && docker compose restart frpc
	@echo "🔄 Туннель FRP перезапущен."

# --- ЛОГИ ---
logs-prod:
	docker logs whoami-pb -f

logs-dev:
	docker logs whoami-pb-dev -f
