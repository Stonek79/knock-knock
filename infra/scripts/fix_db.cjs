const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SERVER_IP = "192.168.1.142";
const SQL_DIR = path.join(__dirname, "../../app/supabase/migrations");

async function main() {
	console.log("🚀 Начинаем принудительную миграцию...");

	try {
		// 1. Пытаемся определить имя контейнера с базой на сервере
		console.log("🔍 Ищем контейнер базы данных на сервере...");
		const containerName = execSync(
			`ssh alex@${SERVER_IP} "docker ps --filter name=db --format '{{.Names}}' | head -n 1"`,
			{ encoding: "utf8" },
		).trim();

		if (!containerName) {
			console.error(
				"❌ Не удалось найти контейнер с 'db' в названии. Убедитесь, что Docker запущен.",
			);
			return;
		}

		console.log(`✅ Найден контейнер: ${containerName}`);

		// 2. Получаем список всех миграций
		const files = fs
			.readdirSync(SQL_DIR)
			.filter((f) => f.endsWith(".sql"))
			.sort();
		console.log(`📂 Найдено миграций: ${files.length}`);

		for (const file of files) {
			console.log(`⚡ Выполняем ${file}...`);
			const sql = fs.readFileSync(path.join(SQL_DIR, file), "utf8");

			const output = execSync(
				`ssh alex@${SERVER_IP} "docker exec -i ${containerName} psql -U postgres"`,
				{
					input: sql,
					encoding: "utf8",
				},
			);

			if (output) {
				console.log(output);
			}
		}

		console.log("\n✅ Миграции выполнены успешно!");
		console.log("\n💎 Теперь проверьте профиль на сайте.");
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
