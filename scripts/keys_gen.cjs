const jwt = require("jsonwebtoken");

const secret = "KnockKnockStagingSecretSafe2025Alpha";

if (!secret) {
	console.error("❌ Ошибка: JWT_SECRET не найден в .env.test");
	process.exit(1);
}

function generateKey(role) {
	const now = Math.floor(Date.now() / 1000);
	const payload = {
		aud: "authenticated",
		role: role,
		app_metadata: {
			role: role,
		},
		iss: "supabase",
		iat: now - 60, // 60 секунд задержки на рассинхрон времени
		exp: now + 60 * 60 * 24 * 365 * 10, // 10 лет
	};
	return jwt.sign(payload, secret);
}

console.log("--- НОВЫЕ КЛЮЧИ ДЛЯ ВАШЕГО СЕКРЕТА ---");
console.log(`VITE_SUPABASE_ANON_KEY=${generateKey("anon")}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${generateKey("service_role")}`);
console.log("--------------------------------------");
