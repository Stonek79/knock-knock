const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../app/.env") });
const { createClient } = require("@supabase/supabase-js");
const { faker } = require("@faker-js/faker/locale/ru");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Для сидинга нужен SERVICE_ROLE key, чтобы создавать пользователей и обходить RLS
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
	console.error(
		"❌ Ошибка: Не найдены VITE_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в app/.env",
	);
	console.log(
		"💡 Убедитесь, что у вас есть SUPABASE_SERVICE_ROLE_KEY (не anon key!)",
	);
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

const USERS_COUNT = 4;
const MESSAGES_PER_CHAT = 20;

async function seed() {
	console.log("🌱 Начинаем посев данных...");

	// 1. Создаем пользователей
	const users = [];
	for (let i = 0; i < USERS_COUNT; i++) {
		const email = faker.internet.email();
		const password = "password123";
		const fullName = faker.person.fullName();
		const username = faker.internet.username();

		// Создаем Auth User
		const { data: authData, error: authError } =
			await supabase.auth.admin.createUser({
				email,
				password,
				email_confirm: true,
				user_metadata: { full_name: fullName },
			});

		if (authError) {
			console.error(`Ошибка создания юзера ${email}:`, authError.message);
			continue;
		}

		const userId = authData.user.id;
		console.log(`✅ Создан пользователь: ${email} (${userId})`);

		// Создаем профиль (если триггер не сработал или нужно обновить)
		// Обычно триггер on_auth_user_created создает профиль, но обновим поля
		const { error: profileError } = await supabase
			.from("profiles")
			.update({
				username,
				display_name: fullName,
				avatar_url: faker.image.avatar(),
				updated_at: new Date(),
			})
			.eq("id", userId);

		if (profileError) {
			console.error(
				`Ошибка обновления профиля ${userId}:`,
				profileError.message,
			);
		}

		users.push({ id: userId, email });
	}

	// 2. Создаем чаты между случайными пользователями
	// (Логика упрощенная: эмулируем создание комнаты)
	// В реальном приложении нужно генерировать ключи шифрования!
	// Т.к. это сид данных для теста UI, мы можем пропустить шифрование ИЛИ
	// создать "незащищенные" чаты, если UI это позволяет.
	// Но наш RoomService требует ключи.
	// Поэтому, чтобы не усложнять, мы просто создадим записи в rooms и room_members,
	// но сообщения будут "нечитаемыми" (или plain text, если фронт падает).

	// ВАЖНО: На клиенте мы используем Web Crypto API, которого нет в Node.js (до 15+ частично).
	// Мы просто создадим записи в БД, чтобы список чатов был не пуст.

	console.log("⚠️ Внимание: Чаты создаются без реального шифрования!");

	for (let i = 0; i < users.length - 1; i++) {
		const user1 = users[i];
		const user2 = users[i + 1];
		const roomId = faker.string.uuid();

		// Room
		const { error: roomError } = await supabase.from("rooms").insert({
			id: roomId,
			type: "direct",
		});

		if (roomError) {
			console.error("Ошибка создания комнаты:", roomError.message);
			continue;
		}

		// Members
		const { error: membersError } = await supabase.from("room_members").insert([
			{ room_id: roomId, user_id: user1.id, role: "member" },
			{ room_id: roomId, user_id: user2.id, role: "member" },
		]);

		if (membersError) {
			console.error("Ошибка добавления участников:", membersError.message);
			continue;
		}

		console.log(
			`✅ Создан чат ${roomId} между ${user1.email} и ${user2.email}`,
		);

		// Messages
		const messages = [];
		for (let m = 0; m < MESSAGES_PER_CHAT; m++) {
			const sender = Math.random() > 0.5 ? user1 : user2;
			messages.push({
				room_id: roomId,
				sender_id: sender.id,
				content: faker.lorem.sentence(), // В реале это шифротекст!
				iv: Buffer.from("mock_iv").toString("base64"),
			});
		}

		const { error: msgError } = await supabase
			.from("messages")
			.insert(messages);

		if (msgError) {
			console.error("Ошибка создания сообщений:", msgError.message);
		} else {
			console.log(`   📝 Добавлено ${messages.length} сообщений`);
		}
	}

	console.log("🏁 Посев завершен!");
}

seed().catch((err) => console.error("Fatal error:", err));
