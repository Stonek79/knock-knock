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
		CALL_LOGS: "call_logs",
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
		PROFILE_TYPE: "profile_type",
		PUBLIC_PROFILE_KEY: "public_profile_key",
		ENCRYPTED_PROFILE: "encrypted_profile",
		KEY_VAULT: "key_vault",
		ENCRYPTED_USER_ID: "encrypted_user_id",
		ENCRYPTED_METADATA: "encrypted_metadata",
		INACTIVITY_TIMER: "inactivity_timer",
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

		// Статусы и типы звонков
		CALL_STATUS_RINGING: "ringing",
		CALL_STATUS_ONGOING: "ongoing",
		CALL_STATUS_ENDED: "ended",
		CALL_STATUS_MISSED: "missed",
		CALL_STATUS_REJECTED: "rejected",
		CALL_TYPE_AUDIO: "audio",
		CALL_TYPE_VIDEO: "video",

		// Типы задач и уведомлений
		TASK_TYPE_PUSH: "push",
		TASK_TYPE_CLEANUP: "cleanup",
		TASK_TYPE_BROADCAST: "broadcast",
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

		// Настройки инвайтов
		INVITE_RATE_LIMIT_MINUTES: 3, // Лимит на генерацию инвайтов (в минутах)
	},
};

module.exports = DB;
