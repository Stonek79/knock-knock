/**
 * Внутренний Push/LiveKit gateway — только server-to-server вызовы.
 * Браузерные запросы отклоняются отсутствием CORS и обязательным секретом.
 *
 * Авторизация: заголовок Authorization: Bearer <PUSH_GATEWAY_SECRET>.
 * Секрет сравнивается постоянным временем, в логи и ответ не попадает.
 * При отсутствии секрета в окружении gateway отвечает 503 на все вызовы.
 */

import { timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import express from "express";
import { AccessToken } from "livekit-server-sdk";
import webpush from "web-push";

// ---------------------------------------------------------------------------
// Конфигурация (только из переменных окружения)
// ---------------------------------------------------------------------------

const PUBLIC_VAPID_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@localhost";

const MAX_BODY_SIZE = 100 * 1024; // 100 KB
const MAX_SUBSCRIPTIONS = 500;

// ---------------------------------------------------------------------------
// Помощники
// ---------------------------------------------------------------------------

/** Постоянновременное сравнение буферов. */
function safeEqual(a, b) {
	if (a.length !== b.length) {
		const dummy = Buffer.alloc(a.length);
		timingSafeEqual(a, dummy);
		return false;
	}
	return timingSafeEqual(a, b);
}

/** Извлечь секрет из env и проверить переданный токен. */
function isAuthorized(authHeader) {
	const secret = process.env.PUSH_GATEWAY_SECRET;
	if (!secret) {
		return false;
	}
	if (!authHeader || typeof authHeader !== "string") {
		return false;
	}
	if (!authHeader.startsWith("Bearer ")) {
		return false;
	}
	const token = Buffer.from(authHeader.slice(7), "utf8");
	const expected = Buffer.from(secret, "utf8");
	return safeEqual(token, expected);
}

/** Сконфигурирован ли секрет? Быстрый fail-closed. */
function hasSecret() {
	const s = process.env.PUSH_GATEWAY_SECRET;
	return typeof s === "string" && s.length > 0;
}

/**
 * Безопасный парсинг лимитов из config/env: NaN, 0, отрицательные и
 * нечисловые значения заменяются fallback'ом.
 */
function resolveLimit(configValue, envValue, fallback) {
	for (const candidate of [configValue, envValue]) {
		if (candidate === undefined || candidate === null || candidate === "") {
			continue;
		}
		const parsed = Number(candidate);
		if (Number.isFinite(parsed) && parsed > 0) {
			return Math.floor(parsed);
		}
	}
	return fallback;
}

/**
 * Нормализация ключей подписки: новые задачи используют вложенный
 * формат keys.{p256dh,auth}; в очереди могут оставаться старые задачи
 * с плоскими p256dh/auth — поддерживаем оба формата.
 */
function extractKeys(sub) {
	if (sub.keys && typeof sub.keys === "object") {
		return { p256dh: sub.keys.p256dh, auth: sub.keys.auth };
	}
	return { p256dh: sub.p256dh, auth: sub.auth };
}

// ---------------------------------------------------------------------------
// Rate limiter (in-memory fixed window, глобальный, без внешних зависимостей)
// ---------------------------------------------------------------------------

function createRateLimiter(limitPerMinute) {
	let windowStart = Date.now();
	let count = 0;
	return (_req, res, next) => {
		const now = Date.now();
		if (now - windowStart >= 60_000) {
			windowStart = now;
			count = 0;
		}
		count += 1;
		if (count > limitPerMinute) {
			return res.status(429).json({ error: "too many requests" });
		}
		next();
	};
}

// ---------------------------------------------------------------------------
// App factory (тесты создают изолированные экземпляры со своими лимитами)
// ---------------------------------------------------------------------------

export function createApp(config = {}) {
	const app = express();

	app.disable("x-powered-by");
	app.use(express.json({ limit: MAX_BODY_SIZE }));
	// CORS не подключается — браузерные запросы недопустимы.

	// -----------------------------------------------------------------------
	// Health (без авторизации, без чувствительных данных)
	// -----------------------------------------------------------------------
	app.get("/healthz", (_req, res) => {
		res.json({ status: "ok" });
	});

	// -----------------------------------------------------------------------
	// Middleware авторизации
	// -----------------------------------------------------------------------
	function requireServerAuth(req, res, next) {
		if (!hasSecret()) {
			return res.status(503).json({
				error: "gateway secret is not configured",
			});
		}
		if (!isAuthorized(req.headers.authorization)) {
			return res.status(401).json({ error: "unauthorized" });
		}
		next();
	}

	const livekitTokenLimit = resolveLimit(
		config.livekitTokenPerMin,
		process.env.RATE_LIMIT_LIVEKIT_TOKEN_PER_MIN,
		60,
	);
	const sendPushLimit = resolveLimit(
		config.sendPushPerMin,
		process.env.RATE_LIMIT_SEND_PUSH_PER_MIN,
		120,
	);

	const rateLimitLivekit = createRateLimiter(livekitTokenLimit);
	const rateLimitSendPush = createRateLimiter(sendPushLimit);

	// -----------------------------------------------------------------------
	// POST /api/livekit-token
	// -----------------------------------------------------------------------
	app.post(
		"/api/livekit-token",
		requireServerAuth,
		rateLimitLivekit,
		async (req, res) => {
			const { roomName, participantIdentity } = req.body || {};

			if (
				!roomName ||
				!participantIdentity ||
				typeof roomName !== "string" ||
				typeof participantIdentity !== "string"
			) {
				return res.status(400).json({
					error: "roomName and participantIdentity are required",
				});
			}
			if (roomName.length > 128 || participantIdentity.length > 128) {
				return res.status(400).json({
					error:
						"roomName and participantIdentity must be 128 characters or less",
				});
			}

			const apiKey = process.env.LIVEKIT_API_KEY;
			const apiSecret = process.env.LIVEKIT_API_SECRET;
			if (!apiKey || !apiSecret) {
				return res
					.status(500)
					.json({ error: "LiveKit keys are not configured" });
			}

			try {
				const at = new AccessToken(apiKey, apiSecret, {
					identity: participantIdentity,
					ttl: "10m",
				});
				at.addGrant({ roomJoin: true, room: roomName });
				const token = await at.toJwt();
				res.json({ token });
			} catch (_err) {
				console.error("LiveKit token generation failed");
				res.status(500).json({ error: "token generation failed" });
			}
		},
	);

	// -----------------------------------------------------------------------
	// POST /api/send-push
	// -----------------------------------------------------------------------

	if (PUBLIC_VAPID_KEY && PRIVATE_VAPID_KEY) {
		webpush.setVapidDetails(VAPID_SUBJECT, PUBLIC_VAPID_KEY, PRIVATE_VAPID_KEY);
	} else {
		console.warn(
			"VAPID keys are missing. Web Push will not work. " +
				"Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
		);
	}

	app.post(
		"/api/send-push",
		requireServerAuth,
		rateLimitSendPush,
		async (req, res) => {
			const { subscriptions, payload } = req.body || {};

			if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
				return res
					.status(400)
					.json({ error: "subscriptions array is required" });
			}
			if (subscriptions.length > MAX_SUBSCRIPTIONS) {
				return res.status(400).json({
					error: `max ${MAX_SUBSCRIPTIONS} subscriptions allowed`,
				});
			}

			const results = [];
			const expiredIds = [];

			for (const sub of subscriptions) {
				const subId = typeof sub.id === "string" ? sub.id : null;
				const keys = extractKeys(sub);
				if (!sub.endpoint || !keys.p256dh || !keys.auth) {
					results.push({
						id: subId,
						success: false,
						error: "invalid subscription fields",
					});
					continue;
				}

				try {
					await webpush.sendNotification(
						{
							endpoint: sub.endpoint,
							keys: { p256dh: keys.p256dh, auth: keys.auth },
						},
						JSON.stringify(payload),
					);
					results.push({ id: subId, success: true });
				} catch (err) {
					console.error(
						`send-push failed: statusCode=${err.statusCode || "n/a"}`,
					);
					results.push({ id: subId, success: false });

					if (err.statusCode === 410 || err.statusCode === 404) {
						if (subId) {
							expiredIds.push(subId);
						}
					}
				}
			}

			res.json({ results, expired_ids: expiredIds });
		},
	);

	// -----------------------------------------------------------------------
	// Error handler (400/413 без stack trace, без чувствительных данных)
	// -----------------------------------------------------------------------
	app.use((err, _req, res, _next) => {
		if (err.type === "entity.too.large" || err.status === 413) {
			return res.status(413).json({ error: "request body too large" });
		}
		if (err.type === "entity.parse.failed" || err.status === 400) {
			return res.status(400).json({ error: "invalid json" });
		}
		console.error("unhandled gateway error");
		res.status(500).json({ error: "internal server error" });
	});

	return app;
}

// ---------------------------------------------------------------------------
// Точка входа (только при прямом запуске, не в тестах)
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT || 4000);

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	const app = createApp();
	app.listen(PORT, "0.0.0.0", () => {
		console.log(`Push Gateway listening on port ${PORT}`);
	});
}
