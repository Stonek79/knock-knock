/**
 * ФИНАЛЬНЫЙ ГЕНЕРАТОР ТИПОВ POCKETBASE (ПОЛНАЯ СОВМЕСТИМОСТЬ)
 *
 * Генерирует структуру, идентичную patmood/pocketbase-typegen:
 * - TypedPocketBase
 * - CollectionRecords / CollectionResponses
 * - Поддержка дженериков для expand
 *
 */

import fs from "node:fs";
import path from "node:path";
import "dotenv/config"; // Автоматически загружает .env

// Настройки из .env (или фолбэк для удобства)
const BASE_URL = (
    process.env.PB_TYPEGEN_URL || "http://127.0.0.1:8090"
).replace(/\/$/, "");
const ADMIN_EMAIL = process.env.PB_TYPEGEN_EMAIL;
const ADMIN_PASS = process.env.PB_TYPEGEN_PASSWORD;
const OUTPUT_PATH = path.resolve("src/lib/types/pocketbase-types.ts");

async function generate() {
    if (!ADMIN_EMAIL || !ADMIN_PASS) {
        console.error(
            "❌ ОШИБКА: Добавьте PB_TYPEGEN_EMAIL и PB_TYPEGEN_PASSWORD в файл app/.env",
        );
        process.exit(1);
    }

    const authUrl = `${BASE_URL}/api/collections/_superusers/auth-with-password`;
    console.log(`🚀 Начинаем генерацию типов (PocketBase v0.23+)...`);
    console.log(`🔗 URL авторизации: ${authUrl}`);

    try {
        const authRes = await fetch(authUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identity: ADMIN_EMAIL,
                password: ADMIN_PASS,
            }),
        });

        if (!authRes.ok) {
            throw new Error(`Ошибка авторизации: ${authRes.statusText}`);
        }
        const { token } = await authRes.json();

        // 2. Получение коллекций
        const collRes = await fetch(`${BASE_URL}/api/collections?perPage=500`, {
            headers: { Authorization: token },
        });
        const { items: collections } = await collRes.json();

        let code = `/**
* ЭТОТ ФАЙЛ СГЕНЕРИРОВАН АВТОМАТИЧЕСКИ. НЕ РЕДАКТИРУЙТЕ.
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export type CollectionName = ${collections.map((c) => `"${c.name}"`).join(" | ")}

// Вспомогательные типы
export type RecordIdString = string
export type HTMLString = string
export type IsoDateString = string

export type BaseSystemFields<T = never> = {
	id: RecordIdString
	created: IsoDateString
	updated: IsoDateString
	collectionId: string
	collectionName: CollectionName
	expand?: T
}

export type AuthSystemFields<T = never> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

`;

        // 1. Генерируем типы для Union-полей (select)
        for (const coll of collections) {
            for (const field of coll.fields) {
                if (field.type === "select" && field.values?.length > 0) {
                    const typeName = `${formatTypeName(coll.name)}${formatTypeName(field.name)}Options`;
                    code += `export type ${typeName} = ${field.values.map((v) => `"${v}"`).join(" | ")}\n\n`;
                }
            }
        }

        // 2. Генерируем типы Records и Responses
        for (const coll of collections) {
            const typeName = formatTypeName(coll.name);
            const isAuth = coll.type === "auth";

            code += `// ---------------------------------------------------------------------------\n`;
            code += `// Коллекция: ${coll.name}\n`;
            code += `// ---------------------------------------------------------------------------\n\n`;

            code += `export type ${typeName}Record = {\n`;
            for (const field of coll.fields) {
                // Исключаем системные и секретные поля, которые не отдаются по API (Response),
                // но оставляем их в Record, если они могут быть полезны при создании (Create/Update).
                const systemFieldsToSkip = [
                    "id",
                    "created",
                    "updated",
                    "collectionId",
                    "collectionName",
                    "emailVisibility",
                    "verified",
                    "tokenKey",
                    "lastResetSentAt",
                    "lastVerificationSentAt",
                ];
                if (systemFieldsToSkip.includes(field.name)) {
                    continue;
                }
                const type = mapFieldType(field, typeName);
                const optional = field.required ? "" : "?";
                code += `	${field.name}${optional}: ${type}\n`;
            }
            code += `}\n\n`;

            const systemFields = isAuth
                ? "AuthSystemFields"
                : "BaseSystemFields";
            code += `export type ${typeName}Response<Texpand = unknown> = Required<${typeName}Record> & ${systemFields}<Texpand>\n\n`;
        }

        // 3. Маппинги коллекций
        code += `export type CollectionRecords = {\n`;
        for (const coll of collections) {
            code += `	${coll.name}: ${formatTypeName(coll.name)}Record\n`;
        }
        code += `}\n\n`;

        code += `export type CollectionResponses = {\n`;
        for (const coll of collections) {
            code += `	${coll.name}: ${formatTypeName(coll.name)}Response\n`;
        }
        code += `}\n\n`;

        // 4. ТИПИЗИРОВАННЫЙ КЛИЕНТ (TypedPocketBase)
        code += `export type TypedPocketBase = PocketBase & {\n`;
        code += `	collection(idOrName: string): RecordService // fallback\n`;
        for (const coll of collections) {
            const typeName = formatTypeName(coll.name);
            code += `	collection(idOrName: "${coll.name}"): RecordService<${typeName}Response>\n`;
        }
        code += `}\n`;

        fs.writeFileSync(OUTPUT_PATH, code);
        console.log(
            `✨ Финальные типы с поддержкой TypedPocketBase сохранены.`,
        );
    } catch (err) {
        console.error("❌ ОШИБКА:", err.message);
        process.exit(1);
    }
}

function formatTypeName(name) {
    if (!name) {
        return "";
    }

    return name
        .split("_")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("");
}

function mapFieldType(field, typeName) {
    switch (field.type) {
        case "text":
        case "password":
            return "string";
        case "editor":
            return "HTMLString";
        case "url":
        case "email":
            return "string";
        case "number":
            return "number";
        case "bool":
            return "boolean";
        case "date":
        case "autodate":
            return "string";
        case "select":
            if (field.values && field.values.length > 0) {
                return `${typeName}${formatTypeName(field.name)}Options`;
            }
            return "string";
        case "relation":
            return field.maxSelect === 1
                ? "RecordIdString"
                : "RecordIdString[]";
        case "file":
            return field.maxSelect === 1 ? "string" : "string[]";
        case "json":
            return "null | unknown";
        default:
            return "unknown";
    }
}

generate();
