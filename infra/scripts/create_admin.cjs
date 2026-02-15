const { createClient } = require("@supabase/supabase-js");

const SERVER_IP = "192.168.1.142";
const SUPABASE_URL = `http://${SERVER_IP}:8000`;
const SERVICE_KEY =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4NTIwMzcsImV4cCI6MjA4NDIxMjAzN30.ZRle5HN12hrhRVLnDCrOEYVCLfBWpRWL5Oafh3I3KBo";
const EMAIL = "admin@example.com";
const PASSWORD = "admin_password_123";

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
		const { error: createError } = await supabase.auth.admin.createUser({
			email: EMAIL,
			password: PASSWORD,
			email_confirm: true,
		});
		if (createError)
			return console.error("❌ Create Error:", createError.message);
	}

	console.log(`\n🎉 DONE!`);
	console.log(`Email: ${EMAIL}`);
	console.log(`Password: ${PASSWORD}`);
	console.log(`\nТеперь вы можете войти, просто введя эти данные.`);

	console.log(
		`\n🔨 Trying to generate a Magic Link anyway (wait 10s if it hangs)...`,
	);
	const { data, error: linkError } = await supabase.auth.admin.generateLink({
		type: "magiclink",
		email: EMAIL,
		options: { redirectTo: "https://knok-knok.ru:8443/profile" },
	});

	if (linkError) {
		console.log("⚠️ Magic Link generation failed, but password is set!");
	} else {
		console.log("👇 OR USE THIS LINK:\n", data.properties.action_link);
	}
}

main();
