const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SERVER_IP = "192.168.1.142";
const SQL_FILE = path.join(
	__dirname,
	"../supabase/migrations/20240101000000_init_profiles.sql",
);

async function main() {
	console.log("🚀 Начинаем принудительную миграцию...");

	try {
		// 1. Пытаемся определить имя контейнера с базой на сервере
		console.log("🔍 Ищем контейнер базы данных на сервере...");
		const containerName = execSync(
			`ssh root@${SERVER_IP} "docker ps --filter name=db --format '{{.Names}}' | head -n 1"`,
			{ encoding: "utf8" },
		).trim();

		if (!containerName) {
			console.error(
				"❌ Не удалось найти контейнер с 'db' в названии. Убедитесь, что Docker запущен.",
			);
			return;
		}

		console.log(`✅ Найден контейнер: ${containerName}`);

		// 2. Читаем SQL файл
		const sql = fs.readFileSync(SQL_FILE, "utf8");

		// 3. Выполняем SQL через SSH пайп
		console.log("⚡ Отправляем SQL запрос в базу...");
		const output = execSync(
			`ssh root@${SERVER_IP} "docker exec -i ${containerName} psql -U postgres"`,
			{
				input: sql,
				encoding: "utf8",
			},
		);

		console.log("\n--- Результат выполнения ---");
		console.log(output);
		console.log("----------------------------");
		console.log("\n💎 Поздравляю! Теперь проверьте профиль на сайте.");
	} catch (err) {
		console.error("\n❌ Ошибка при выполнении миграции:");
		console.error(err.message);
		console.log(
			"\n💡 Попробуйте вручную:\nssh root@" +
				SERVER_IP +
				' "docker exec -i supabase-db-app psql -U postgres" < supabase/migrations/20240101000000_init_profiles.sql',
		);
	}
}

main();
