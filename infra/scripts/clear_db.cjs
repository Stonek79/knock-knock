/**
 * Скрипт для ПОЛНОЙ очистки данных в базе Knock-Knock.
 * Удаляет записи из таблиц: messages, room_members, room_keys, rooms, profiles.
 * Также удаляет всех пользователей из Auth.
 * 
 * ВНИМАНИЕ: Это необратимая операция!
 */

const path = require("path");
require("dotenv").config({
	path: process.env.ENV_FILE_PATH || path.join(__dirname, "../../app/.env"),
});
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
	console.error("❌ Ошибка: Не найдены VITE_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY");
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function clearDatabase() {
	const isForce = process.argv.includes("--force");
	const isProd = SUPABASE_URL.includes("supabase.co") || !SUPABASE_URL.includes("localhost") && !SUPABASE_URL.includes("127.0.0.1") && !SUPABASE_URL.includes("10.0.0");

	console.log(`⚠️  ВНИМАНИЕ: Начинаем очистку базы ${SUPABASE_URL}`);
	
	if (isProd && !isForce) {
		console.error("\n❌ ОШИБКА БЕЗОПАСНОСТИ:");
		console.error("Вы пытаетесь очистить УДАЛЕННУЮ (возможно, продакшен) базу данных без флага --force.");
		console.error("Если вы УВЕРЕНЫ, добавьте --force в конец команды.");
		process.exit(1);
	}

	if (isProd) {
		console.log("\n🛑 КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ: ВЫ РАБОТАЕТЕ С ПРОДАКШЕНОМ!");
	}

	console.log("⏳ Подождите 5 секунд (Ctrl+C для отмены)...");
	await new Promise(r => setTimeout(r, 5000));

	try {
		// 1. Очистка пользовательских данных (порядок важен из-за FK)
		console.log("🧹 Удаление сообщений...");
		await supabase.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");

		console.log("🧹 Удаление ключей комнат...");
		await supabase.from("room_keys").delete().neq("id", "00000000-0000-0000-0000-000000000000");

		console.log("🧹 Удаление участников комнат...");
		await supabase.from("room_members").delete().neq("room_id", "00000000-0000-0000-0000-000000000000");

		console.log("🧹 Удаление комнат...");
		await supabase.from("rooms").delete().neq("id", "00000000-0000-0000-0000-000000000000");

		console.log("🧹 Удаление профилей...");
		await supabase.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");

		// 2. Очистка пользователей Auth
		console.log("👤 Удаление пользователей Auth...");
		const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
		
		if (listError) throw listError;

		for (const user of users) {
			console.log(`   Удаление ${user.email} (${user.id})...`);
			const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
			if (delError) console.error(`   ❌ Ошибка удаления ${user.id}: ${delError.message}`);
		}

		console.log("\n✅ База данных полностью очищена!");
	} catch (error) {
		console.error("\n❌ Произошла ошибка при очистке:", error.message);
	}
}

clearDatabase();
