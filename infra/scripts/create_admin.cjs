const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({
	path: process.env.ENV_FILE_PATH || path.join(__dirname, "../../app/.env"),
});

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD || "admin_password_123";

if (!SUPABASE_URL || !SERVICE_KEY) {
	console.error("❌ VITE_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY не найдены");
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
	console.log(`🔨 Checking for user ${EMAIL}...`);

	// 1. Проверяем, есть ли уже такой юзер
	const {
		data: { users },
		error: listError,
	} = await supabase.auth.admin.listUsers();
	if (listError) return console.error("❌ Error:", listError.message);

	const existingUser = users.find((u) => u.email === EMAIL);

	let user = existingUser;

	if (existingUser) {
		console.log("✅ User exists! Updating password and confirming email...");
		const { error: updateError } = await supabase.auth.admin.updateUserById(
			existingUser.id,
			{
				password: PASSWORD,
				email_confirm: true,
			},
		);
		if (updateError)
			return console.error("❌ Update Error:", updateError.message);
	} else {
		console.log("🔨 Creating new user...");
		const { data: createData, error: createError } = await supabase.auth.admin.createUser({
			email: EMAIL,
			password: PASSWORD,
			email_confirm: true,
		});
		if (createError)
			return console.error("❌ Create Error:", createError.message);
		user = createData.user;
	}

	if (!user) {
		return console.error("❌ Не удалось получить или создать пользователя");
	}

	const userId = user.id;
	console.log(`\n🔨 Setting role 'admin' for user ${userId}...`);

	// 3. Устанавливаем роль в таблице profiles
	const { error: roleError } = await supabase
		.from("profiles")
		.update({ role: "admin" })
		.eq("id", userId);

	if (roleError) {
		console.error("❌ Role Update Error:", roleError.message);
		console.log("💡 Возможно, профиль еще не создан триггером. Пробую вставить...");
		
		const { error: insertError } = await supabase
			.from("profiles")
			.upsert({ id: userId, role: "admin" });
			
		if (insertError) {
			console.error("❌ Upsert Error:", insertError.message);
		} else {
			console.log("✅ Admin profile created successfully via upsert.");
		}
	} else {
		console.log("✅ Role 'admin' set successfully.");
	}

	console.log(`\n🎉 DONE!`);
	console.log(`Email: ${EMAIL}`);
	console.log(`Password: ${PASSWORD}`);
	console.log(`\nТеперь вы можете войти с правами администратора.`);
}

main();
