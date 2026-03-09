const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: __dirname + "/.env" });

const SERVER_IP = process.env.SUPABASE_HOME_IP || "192.168.1.142";
const SUPABASE_URL = `http://${SERVER_IP}:8000`;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
	console.error("❌ SUPABASE_SERVICE_ROLE_KEY не найден в .env");
	console.log("💡 Добавьте в infra/scripts/.env:");
	console.log("   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key");
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
	console.log("🔍 Проверяем наличие таблицы 'profiles'...");

	// Пробуем сделать простой запрос к таблице
	const { data, error } = await supabase.from("profiles").select("id").limit(1);

	if (error) {
		if (error.code === "PGRST116" || error.message.includes("not find")) {
			console.log("❌ Таблица 'profiles' ОТСУТСТВУЕТ в базе данных.");
		} else {
			console.error("⚠️ Произошла ошибка при проверке:", error.message);
		}
	} else {
		console.log("✅ Таблица 'profiles' СУЩЕСТВУЕТ!");
	}
}

main();
