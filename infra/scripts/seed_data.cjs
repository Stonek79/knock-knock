const path = require("path");
require("dotenv").config({
	path: process.env.ENV_FILE_PATH || path.join(__dirname, "../../app/.env"),
});
const { createClient } = require("@supabase/supabase-js");
const { faker } = require("@faker-js/faker/locale/ru");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Валидация окружения
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
	console.error(
		"❌ Ошибка: Не найдены VITE_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY",
	);
	console.error("");
	console.error("💡 Убедитесь, что переменные окружения заданы:");
	console.error("   export VITE_SUPABASE_URL=http://your-server:8000");
	console.error("   export SUPABASE_SERVICE_ROLE_KEY=your-key");
	console.error("");
	console.error("Или используйте файл .env в папке scripts/");
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
		const isAdmin = i === 0;
		const email = isAdmin
			? process.env.ADMIN_EMAIL || "admin@example.com"
			: faker.internet.email();
		const password = isAdmin
			? process.env.ADMIN_PASSWORD || "admin_password_123"
			: "password123";
		const fullName = isAdmin ? "Administrator" : faker.person.fullName();
		const username = isAdmin ? "admin" : faker.internet.username();

		// Создаем Auth User
		const { data: authData, error: authError } =
			await supabase.auth.admin.createUser({
				email,
				password,
				email_confirm: true,
				user_metadata: { full_name: fullName, username },
			});

		if (authError) {
			console.error(`Ошибка создания юзера ${email}:`, authError.message);
			// Если юзер уже есть — пробуем найти его ID
			const { data: list } = await supabase.auth.admin.listUsers();
			const existing = list.users.find((u) => u.email === email);
			if (existing) {
				console.log(`ℹ️ Пользователь уже существует, используем его ID: ${existing.id}`);
				users.push({ id: existing.id, email });
				
				// Обновляем роль на всякий случай
				await supabase.from("profiles").upsert({ 
					id: existing.id, 
					role: isAdmin ? "admin" : "user",
					username,
					display_name: fullName
				});
			}
			continue;
		}

		const userId = authData.user.id;
		console.log(`✅ Создан пользователь: ${email} (${userId}) ${isAdmin ? "[ADMIN]" : ""}`);

		// Обновляем профиль (роль и данные)
		const { error: profileError } = await supabase
			.from("profiles")
			.upsert({
				id: userId,
				username,
				display_name: fullName,
				avatar_url: faker.image.avatar(),
				role: isAdmin ? "admin" : "user",
				updated_at: new Date(),
			});

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

	// 3. Генерация ключей для пользователей (включая существующих)
	console.log("🔑 Проверка ключей пользователей...");
	const { data: allProfiles } = await supabase
		.from("profiles")
		.select("id, public_key_x25519");

	if (allProfiles) {
		const { webcrypto } = require("node:crypto");

		for (const profile of allProfiles) {
			if (
				!profile.public_key_x25519 ||
				profile.public_key_x25519 === "mock_key"
			) {
				console.log(`   � Генерация ключей для ${profile.id}...`);

				// ECDH P-256 for messaging
				const keyPair = await webcrypto.subtle.generateKey(
					{ name: "ECDH", namedCurve: "P-256" },
					true,
					["deriveKey", "deriveBits"],
				);

				const publicKeyRaw = await webcrypto.subtle.exportKey(
					"raw",
					keyPair.publicKey,
				);
				const publicKeyBase64 = Buffer.from(publicKeyRaw).toString("base64");

				await supabase
					.from("profiles")
					.update({
						public_key_x25519: publicKeyBase64,
						updated_at: new Date(),
					})
					.eq("id", profile.id);

				console.log(`      ✅ Ключи обновлены.`);
			}
		}
	}

	// 4. Создаем чат "Избранное" (Saved Messages) для каждого пользователя
	console.log("🌟 Создаем чаты 'Избранное'...");
	const { data: profilesForChat } = await supabase
		.from("profiles")
		.select("id");

	if (profilesForChat) {
		for (const profile of profilesForChat) {
			const { data: existingMembers } = await supabase
				.from("room_members")
				.select("room_id")
				.eq("user_id", profile.id);

			let hasSelfChat = false;
			if (existingMembers && existingMembers.length > 0) {
				const roomIds = existingMembers.map((m) => m.room_id);
				const { data: rooms } = await supabase
					.from("rooms")
					.select("id, type, room_members(user_id)")
					.in("id", roomIds)
					.eq("type", "direct");

				if (rooms) {
					hasSelfChat = rooms.some(
						(r) =>
							r.room_members.length === 1 &&
							r.room_members[0].user_id === profile.id,
					);
				}
			}

			if (!hasSelfChat) {
				const roomId = faker.string.uuid();
				console.log(`   ➕ Создаем Saved Messages для ${profile.id}`);
				const { error: roomErr } = await supabase.from("rooms").insert({
					id: roomId,
					type: "direct",
				});

				if (!roomErr) {
					await supabase.from("room_members").insert({
						room_id: roomId,
						user_id: profile.id,
						role: "member",
					});
					console.log(`      ✅ Saved Messages создан: ${roomId}`);
				} else {
					console.error(
						`      ❌ Ошибка создания Saved Messages: ${roomErr.message}`,
					);
				}
			}
		}
	}

	console.log("🏁 Посев завершен!");
}

seed().catch((err) => console.error("Fatal error:", err));
