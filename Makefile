# Единый пульт управления инфраструктурой Knock-Knock
# Поднимает контейнеры в соответствующих папках infra/

.PHONY: help network start-all stop-all start-prod start-dev start-mailpit start-push start-web stop-prod stop-dev stop-mailpit stop-push stop-web logs-push logs-prod logs-web

help:
	@echo "Доступные команды управления инфраструктурой:"
	@echo "  make start-all    - Поднять Прод, Дев, Mailpit и Push-Gateway"
	@echo "  make stop-all     - Остановить всю инфраструктуру"
	@echo "  make start-prod   - Запустить только Production БД"
	@echo "  make start-dev    - Запустить только Development БД"
	@echo "  make logs-prod    - Смотреть логи Production БД"
	@echo "  make logs-push    - Смотреть логи Push-шлюза"

# Создаёт магистральную Docker-сеть (нужно выполнить 1 раз)
network:
	@docker network create knock-knock-net 2>/dev/null || echo "Сеть knock-knock-net уже существует."

# --- ЗАПУСК ---
start-prod: network
	cd infra/prod && docker compose up -d

start-dev: network
	cd infra/dev && docker compose up -d

start-mailpit: network
	cd infra/mailpit && docker compose up -d

start-push: network
	cd infra/home/push-gateway && docker compose up -d

start-web: network
	cd infra/web && docker compose up -d

start-web-build: network
	cd infra/web && docker compose up -d --build

build:
	cd app && npm run build

# --- ОСТАНОВКА ---
stop-prod:
	cd infra/prod && docker compose down

stop-dev:
	cd infra/dev && docker compose down

stop-mailpit:
	cd infra/mailpit && docker compose down

stop-push:
	cd infra/home/push-gateway && docker compose down

stop-web:
	cd infra/web && docker compose down

# --- ГРУППОВЫЕ ---
start-all: start-prod start-dev start-mailpit start-push start-web
	@echo "✅ Все среды и шлюз успешно запущены!"

stop-all: stop-prod stop-dev stop-mailpit stop-push stop-web
	@echo "🛑 Вся инфраструктура остановлена."

# --- ЛОГИ ---
logs-push:
	docker logs knock-knock-push -f

logs-prod:
	docker logs knock-knock-pb -f

logs-dev:
	docker logs knock-knock-pb-dev -f

logs-web:
	docker logs knock-knock-web -f
