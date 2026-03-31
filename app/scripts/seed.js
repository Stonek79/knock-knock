/**
 * КНОК-КНОК: ГЕНЕРАТОР ДАННЫХ ДЛЯ РАЗРАБОТКИ (SEED)
 *
 * Наполняет PocketBase данными:
 * - 6 пользователей
 * - 5 комнат Избранное
 * - 5 Direct чатов
 * - 5 Group чатов
 *
 * Запуск: npm run seed
 */

import crypto from "node:crypto";
import { faker } from "@faker-js/faker";
import PocketBase from "pocketbase";
import "dotenv/config";

const POCKETBASE_URL = process.env.VITE_PB_URL || "http://127.0.0.1:8090";
const pb = new PocketBase(POCKETBASE_URL);

// Константы структуры БД (СИНХРОНИЗИРОВАНО С pb_hooks/main.pb.js)
const DB = {
    TABLES: {
        USERS: "users",
        ROOMS: "rooms",
        MEMBERS: "room_members",
        KEYS: "room_keys",
        MESSAGES: "messages",
        USER_FOLDERS: "user_folders",
    },
    FIELDS: {
        ID: "id",
        ROOM: "room",
        USER: "user",
        SENDER: "sender",
        DISPLAY_NAME: "display_name",
        AVATAR: "avatar",
        SENDER_NAME: "sender_name",
        SENDER_AVATAR: "sender_avatar",
        UNREAD_COUNT: "unread_count",
        ROLE: "role",
        NAME: "name",
        TYPE: "type",
        VISIBILITY: "visibility",
        CREATED_BY: "created_by",
    },
    VALUES: {
        ROOM_TYPE_DIRECT: "direct",
        ROOM_TYPE_GROUP: "group",
        VISIBILITY_PRIVATE: "private",
        ROLE_OWNER: "owner",
        FAVORITES_NAME: "chat.favorites",
    },
};

/**
 * Генерирует ПРАВИЛЬНЫЕ ECDH и ECDSA (P-256) публичные ключи (по 65 байт),
 * чтобы криптография в браузере не крашилась с DataError.
 */
async function generateValidKeys() {
    const ecdhKeyPair = await crypto.webcrypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveBits"],
    );
    const rawEcdh = await crypto.webcrypto.subtle.exportKey(
        "raw",
        ecdhKeyPair.publicKey,
    );

    const ecdsaKeyPair = await crypto.webcrypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"],
    );
    const rawEcdsa = await crypto.webcrypto.subtle.exportKey(
        "raw",
        ecdsaKeyPair.publicKey,
    );

    return {
        public_key_x25519: Buffer.from(rawEcdh).toString("base64"),
        public_key_signing: Buffer.from(rawEcdsa).toString("base64"),
    };
}

/**
 * Основная функция сидирования
 */
async function runSeed() {
    console.log(`🚀 Начинаем сидирование базы по адресу: ${POCKETBASE_URL}`);

    const isProduction =
        (POCKETBASE_URL.includes("api.knok-knok.ru") &&
            !POCKETBASE_URL.includes("dev-api")) ||
        process.env.NODE_ENV === "production";

    if (isProduction) {
        console.error("❌❌❌ ОБНАРУЖЕН ПРОДАКШН! Сидирование отменено.");
        process.exit(1);
    }

    const password = "password123";
    const ADMIN_EMAIL = process.env.PB_TYPEGEN_EMAIL;
    const ADMIN_PASS = process.env.PB_TYPEGEN_PASSWORD;

    try {
        await pb
            .collection("_superusers")
            .authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Авторизация успешна (Superuser)");

        console.log("🧹 Очистка старых данных...");
        const collectionsToClear = [
            "messages",
            "room_keys",
            "room_members",
            "rooms",
            "users",
        ];
        for (const name of collectionsToClear) {
            const records = await pb
                .collection(name)
                .getFullList({ fields: "id", $autoCancel: false });
            for (const r of records) {
                await pb.collection(name).delete(r.id, { $autoCancel: false });
            }
        }

        // 1. Создание пользователей
        console.log("👤 Создаем пользователей...");
        const users = [];
        for (let i = 1; i <= 6; i++) {
            const email = `user${i}@example.com`;
            const keys = await generateValidKeys();
            const user = await pb.collection(DB.TABLES.USERS).create({
                email,
                password,
                passwordConfirm: password,
                display_name: faker.person.fullName(),
                username: `user_${i}_${faker.string.alphanumeric(4)}`,
                status: "online",
                role: i === 1 ? "admin" : "user", // Первый - админ
                verified: true,
                is_agreed_to_rules: true,
                public_key_x25519: keys.public_key_x25519,
                public_key_signing: keys.public_key_signing,
                tokenKey: crypto.randomBytes(30).toString("hex"),
                settings: { theme: "default", mode: "dark" },
            });
            users.push(user);
            console.log(`   + [${user.role}] ${email}`);
        }

        // 1.5. Регистрация системных комнат теперь происходит автоматически через pb_hooks
        console.log("⭐ Комнаты Избранное созданы автоматически сервером.");

        // Вспомогательная функция для сообщений
        const createChatMessages = async (roomId, participants, count = 15) => {
            let lastId = "";
            const now = new Date();
            for (let i = 0; i < count; i++) {
                const sender = faker.helpers.arrayElement(participants);
                const msgDate = new Date(now.getTime() - (count - i) * 60000); // 1 мин разницы

                const msg = await pb.collection(DB.TABLES.MESSAGES).create({
                    [DB.FIELDS.ROOM]: roomId,
                    [DB.FIELDS.SENDER]: sender.id,
                    [DB.FIELDS.SENDER_NAME]: sender.display_name,
                    [DB.FIELDS.SENDER_AVATAR]: sender.avatar || null,
                    content: faker.lorem.sentence(), // Обычный текст для DEV
                    iv: crypto.randomBytes(12).toString("base64"),
                    type: "text",
                    status: "read",
                    is_deleted: false,
                    metadata: {},
                    created: msgDate.toISOString(),
                    updated: msgDate.toISOString(),
                });
                lastId = msg.id;
            }
            return lastId;
        };

        const setupMembers = async (roomId, members) => {
            for (const m of members) {
                await pb.collection(DB.TABLES.MEMBERS).create({
                    [DB.FIELDS.ROOM]: roomId,
                    [DB.FIELDS.USER]: m.id,
                    [DB.FIELDS.ROLE]:
                        m.id === members[0].id
                            ? DB.VALUES.ROLE_OWNER
                            : "member",
                    user_name: m.display_name,
                    [DB.FIELDS.UNREAD_COUNT]: 0,
                    last_read_at: new Date().toISOString(),
                });
            }
        };

        // 2. Direct Chats (5 чатов)
        console.log("🔒 Создаем 5 Direct чатов...");
        for (let i = 1; i <= 5; i++) {
            const opponent = users[i];
            const directRoom = await pb.collection(DB.TABLES.ROOMS).create({
                [DB.FIELDS.NAME]: "",
                [DB.FIELDS.TYPE]: DB.VALUES.ROOM_TYPE_DIRECT,
                [DB.FIELDS.VISIBILITY]: DB.VALUES.VISIBILITY_PRIVATE,
                [DB.FIELDS.CREATED_BY]: users[0].id,
            });
            await setupMembers(directRoom.id, [users[0], opponent]);
            const lastD = await createChatMessages(
                directRoom.id,
                [users[0], opponent],
                10,
            );
            await pb
                .collection(DB.TABLES.ROOMS)
                .update(directRoom.id, { last_message: lastD });
            console.log(`   + Direct: ${opponent.display_name}`);
        }

        // 3. Group Chats (5 чатов)
        console.log("👥 Создаем 5 Group чатов...");
        const groupNames = [
            "Knock-Knock Проект",
            "Разработка (Backend)",
            "Дизайн-система",
            "Флудилка",
            "Маркетинг",
        ];

        for (let i = 0; i < 5; i++) {
            const groupRoom = await pb.collection(DB.TABLES.ROOMS).create({
                [DB.FIELDS.NAME]: groupNames[i],
                [DB.FIELDS.TYPE]: DB.VALUES.ROOM_TYPE_GROUP,
                [DB.FIELDS.VISIBILITY]: DB.VALUES.VISIBILITY_PRIVATE,
                [DB.FIELDS.CREATED_BY]: users[0].id,
            });

            const gParticipants = faker.helpers.arrayElements(
                users,
                faker.number.int({ min: 3, max: 6 }),
            );
            if (!gParticipants.find((p) => p.id === users[0].id)) {
                gParticipants.push(users[0]);
            }

            await setupMembers(groupRoom.id, gParticipants);
            const lastG = await createChatMessages(
                groupRoom.id,
                gParticipants,
                15,
            );
            await pb
                .collection(DB.TABLES.ROOMS)
                .update(groupRoom.id, { last_message: lastG });
            console.log(`   + Group: ${groupNames[i]}`);
        }

        console.log("\n✨ СИДИРОВАНИЕ ЗАВЕРШЕНО!");
    } catch (err) {
        console.error("💥 ОШИБКА:", err.message, err.response?.data);
    }
}

runSeed();
