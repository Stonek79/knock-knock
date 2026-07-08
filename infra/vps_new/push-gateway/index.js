import cors from "cors";
import express from "express";
import webpush from "web-push";

const app = express();
app.use(express.json());
app.use(cors());

// Ключи извлекаются из переменных окружения
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:admin@localhost";

if (!publicVapidKey || !privateVapidKey) {
	console.warn(
		"⚠️ VAPID keys are missing! Web Push will not work. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env",
	);
} else {
	webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);
}

// Эндпоинт, который будет вызывать PocketBase Hook
app.post("/api/send-push", async (req, res) => {
	const { subscriptions, payload } = req.body;
	if (!subscriptions || !Array.isArray(subscriptions)) {
		return res.status(400).json({ error: "subscriptions array is required" });
	}

	const results = [];
	const expired_endpoints = [];
	for (const sub of subscriptions) {
		try {
			await webpush.sendNotification(
				{
					endpoint: sub.endpoint,
					keys: {
						p256dh: sub.p256dh,
						auth: sub.auth,
					},
				},
				JSON.stringify(payload),
			);
			results.push({ endpoint: sub.endpoint, success: true });
		} catch (err) {
			console.error(`Error sending push to ${sub.endpoint}:`, err.statusCode);
			results.push({
				endpoint: sub.endpoint,
				success: false,
				error: err.message,
			});
			
			// Если статус 410 (Gone) или 404 (Not Found), подписка стала недействительной
			if (err.statusCode === 410 || err.statusCode === 404) {
				expired_endpoints.push(sub.endpoint);
			}
		}
	}
	res.json({ results, expired_endpoints });
});

const PORT = 4000;
app.listen(PORT, "0.0.0.0", () => {
	console.log(`🚀 Push Gateway is running on port ${PORT}`);
});
