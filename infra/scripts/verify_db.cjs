const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://api.knok-knok.ru:8443";
const SERVICE_KEY =
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4NTIwMzcsImV4cCI6MjA4NDIxMjAzN30.ZRle5HN12hrhRVLnDCrOEYVCLfBWpRWL5Oafh3I3KBo";

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
