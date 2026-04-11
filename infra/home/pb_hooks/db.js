/**
 * @module DB
 * @description КНОК-КНОК: ГЛОБАЛЬНЫЙ РЕЕСТР БД (PocketBase)
 *
 * Этот модуль содержит все константы таблиц, полей и конфигураций.
 * Обеспечивает строгую типизацию имен и отсутствие "магических строк" в хуках.
 */

const DB = {
	/** @type {Object} Имена коллекций PocketBase */
	TABLES: {
		USERS: "users",
		ROOMS: "rooms",
		MEMBERS: "room_members",
		MEDIA: "media",
		KEYS: "room_keys",
		MESSAGES: "messages",
		TASK_QUEUE: "task_queue",
		PUSH_SUBS: "push_subscriptions",
	},

	/** @type {Object} Имена полей в коллекциях */
	FIELDS: {
		// Системные и общие поля
		ID: "id",
		CREATED: "created",
		UPDATED: "updated",

		// Организация чатов и пользователей
		TYPE: "type",
		NAME: "name",
		VISIBILITY: "visibility",
		CREATED_BY: "created_by",
		USER: "user",
		USER_ID: "user_id",
		ROLE: "role",
		UNREAD_COUNT: "unread_count",
		ROOM: "room",
		OWNER: "owner",
		SENDER: "sender",
		TOKEN_KEY: "tokenKey",
		PASSWORD_CONFIRM: "passwordConfirm",
		ADMIN: "admin",

		// Безопасность и защита от ботов
		USERNAME_BOT: "username_bot",
		START_TIME: "_startTime",

		// Очередь задач (Task Queue)
		TASK_KEY: "task_key",
		PAYLOAD: "payload",
		STATUS: "status",
		ATTEMPTS: "attempts",
		LAST_ERROR: "last_error",
		RUN_AT: "run_at",

		// Криптография и уведомления
		ENDPOINT: "endpoint",
		P256DH: "p256dh",
		AUTH: "auth",
		FILE: "file",
	},

	/** @type {Object} Системные значения и перечисления (Enums) */
	VALUES: {
		// Статусы задач в очереди
		STATUS_PENDING: "pending",
		STATUS_PROCESSING: "processing",
		STATUS_COMPLETED: "completed",
		STATUS_FAILED: "failed",

		// Типы задач и уведомлений
		TASK_TYPE_PUSH: "push",
		TASK_TYPE_CLEANUP: "cleanup",
		PUSH_TYPE_NEW_MESSAGE: "NEW_MESSAGE",

		// Параметры комнат и сообщений
		ROOM_TYPE_DIRECT: "direct",
		VISIBILITY_PRIVATE: "private",
		ROLE_OWNER: "owner",
		FAVORITES_NAME: "chat.favorites",
		TYPE_SYSTEM: "system",
		PREFIX_SELF_CHAT: "self-chat:",

		// HTTP методы и контент-типы
		METHOD_POST: "POST",
		CONTENT_TYPE_JSON: "application/json",
	},

	/** @type {Object} Техническая конфигурация инфраструктуры */
	CONFIG: {
		// Расписания Cron
		CRON_RUNNER: "* * * * *",
		CRON_CLEANUP: "0 3 * * *",

		// Внешние сервисы (Push Gateway)
		PUSH_GATEWAY_DEFAULT_URL: "http://push-gateway:4000",
		PUSH_GATEWAY_ENDPOINT: "/api/send-push",
	},
};

module.exports = DB;
