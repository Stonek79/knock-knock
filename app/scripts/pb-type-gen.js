/**
 * ФИНАЛЬНЫЙ ГЕНЕРАТОР ТИПОВ POCKETBASE
 * С поддержкой строгой типизации, инжектом системных коллекций и авто-проверками.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SCHEMA_PATH = path.resolve(process.cwd(), "../infra/home/pb_schema.json");
const OUTPUT_PATH = path.resolve(
    process.cwd(),
    "src/lib/types/pocketbase-types.ts",
);
const PROJECT_ROOT = path.resolve(process.cwd(), "..");

const SYSTEM_FIELD_NAMES = new Set([
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
]);

// 1. СТРОГИЙ МАППИНГ ТИПОВ (Strict Mapping)
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
            return "IsoDateString";
        case "select": {
            const max =
                field.maxSelect === null ? 0 : Number(field.maxSelect || 1);
            const baseType =
                field.values && field.values.length > 0
                    ? `${typeName}${formatTypeName(field.name)}Options`
                    : "string";
            return max === 1 ? baseType : `${baseType}[]`;
        }
        case "relation": {
            const max =
                field.maxSelect === null ? 0 : Number(field.maxSelect || 1);
            return max === 1 ? "RecordIdString" : "RecordIdString[]";
        }
        case "file": {
            const max =
                field.maxSelect === null ? 0 : Number(field.maxSelect || 1);
            return max === 1 ? "string" : "string[]";
        }
        case "json":
            // Строгая типизация вместо unknown для конкретных полей (если применимо)
            if (
                field.name === "encrypted_metadata" ||
                field.name === "settings"
            ) {
                return "Record<string, unknown> | null";
            }
            return "null | unknown";
        default:
            return "unknown";
    }
}

// Хардкод системных коллекций PocketBase v0.23+
// (Они не экспортируются в pb_schema.json, но существуют в движке)
const SYSTEM_COLLECTIONS = [
    {
        name: "_superusers",
        type: "auth",
        fields: [],
    },
    {
        name: "_mfas",
        type: "base",
        fields: [],
    },
    {
        name: "_otps",
        type: "base",
        fields: [],
    },
    {
        name: "_externalAuths",
        type: "base",
        fields: [
            { name: "collectionId", type: "text", required: true },
            { name: "recordId", type: "text", required: true },
            { name: "provider", type: "text", required: true },
            { name: "providerId", type: "text", required: true },
        ],
    },
    {
        name: "_authOrigins",
        type: "base",
        fields: [
            { name: "collectionId", type: "text", required: true },
            { name: "recordId", type: "text", required: true },
            { name: "fingerprint", type: "text", required: true },
        ],
    },
];

function generate() {
    console.log(`🚀 Начинаем генерацию типов из ${SCHEMA_PATH}...`);

    try {
        if (!fs.existsSync(SCHEMA_PATH)) {
            throw new Error(`Файл схемы не найден по пути: ${SCHEMA_PATH}`);
        }

        const schemaContent = fs.readFileSync(SCHEMA_PATH, "utf-8");
        // Мержим локальные коллекции + Системные коллекции PB
        const collections = [
            ...SYSTEM_COLLECTIONS,
            ...JSON.parse(schemaContent),
        ];

        let code = `/**
* ЭТОТ ФАЙЛ СГЕНЕРИРОВАН АВТОМАТИЧЕСКИ. НЕ РЕДАКТИРУЙТЕ.
*/

import type PocketBase from 'pocketbase';
import type { RecordService } from 'pocketbase';

export type CollectionName = ${collections.map((c) => `"${c.name}"`).join(" | ")};

// Вспомогательные типы
export type RecordIdString = string;
export type HTMLString = string;
export type IsoDateString = string;

export type BaseSystemFields<T = never> = {
\tid: RecordIdString;
\tcreated: IsoDateString;
\tupdated: IsoDateString;
\tcollectionId: string;
\tcollectionName: CollectionName;
\texpand?: T;
};

export type AuthSystemFields<T = never> = {
\temail: string;
\temailVisibility: boolean;
\tusername: string;
\tverified: boolean;
} & BaseSystemFields<T>;

`;

        // Генерируем типы для Union-полей (select)
        for (const coll of collections) {
            for (const field of coll.fields) {
                if (field.type === "select" && field.values?.length > 0) {
                    const typeName = `${formatTypeName(coll.name)}${formatTypeName(field.name)}Options`;
                    code += `export type ${typeName} = ${field.values.map((v) => `"${v}"`).join(" | ")};\n\n`;
                }
            }
        }

        // Генерируем типы Records и Responses
        for (const coll of collections) {
            const typeName = formatTypeName(coll.name);
            const isAuth = coll.type === "auth";

            code += `// ---------------------------------------------------------------------------\n`;
            code += `// Коллекция: ${coll.name}\n`;
            code += `// ---------------------------------------------------------------------------\n\n`;

            if (coll.fields.length === 0) {
                code += `export type ${typeName}Record = Record<string, never>;\n\n`;
            } else {
                code += `export type ${typeName}Record = {\n`;
                for (const field of coll.fields) {
                    if (SYSTEM_FIELD_NAMES.has(field.name)) {
                        continue;
                    }

                    const type = mapFieldType(field, typeName);
                    const optional = field.required ? "" : "?";
                    code += `\t${field.name}${optional}: ${type};\n`;
                }
                code += `};\n\n`;
            }

            const systemFields = isAuth
                ? "AuthSystemFields"
                : "BaseSystemFields";
            // PocketBase responses historically expose optional fields as
            // required in this project. Preserve that contract everywhere,
            // except for `invites.room`, which is intentionally optional for
            // registration invites and must stay aligned with the schema.
            const optionalFields =
                coll.name === "invites" &&
                coll.fields.some(
                    (field) => field.name === "room" && !field.required,
                )
                    ? ["room"]
                    : [];
            const responseRecordType =
                optionalFields.length > 0
                    ? `Omit<Required<${typeName}Record>, ${optionalFields
                          .map((field) => `"${field}"`)
                          .join(
                              " | ",
                          )}> & Pick<${typeName}Record, ${optionalFields
                          .map((field) => `"${field}"`)
                          .join(" | ")}>`
                    : `Required<${typeName}Record>`;
            code += `export type ${typeName}Response<Texpand = unknown> = ${responseRecordType} & ${systemFields}<Texpand>;\n\n`;
        }

        // Маппинги коллекций
        code += `export type CollectionRecords = {\n`;
        for (const coll of collections) {
            code += `\t${coll.name}: ${formatTypeName(coll.name)}Record;\n`;
        }
        code += `};\n\n`;

        code += `export type CollectionResponses = {\n`;
        for (const coll of collections) {
            code += `\t${coll.name}: ${formatTypeName(coll.name)}Response;\n`;
        }
        code += `};\n\n`;

        // ТИПИЗИРОВАННЫЙ КЛИЕНТ (TypedPocketBase)
        code += `export type TypedPocketBase = PocketBase & {\n`;
        code += `\tcollection(idOrName: string): RecordService; // fallback\n`;
        for (const coll of collections) {
            const typeName = formatTypeName(coll.name);
            code += `\tcollection(idOrName: "${coll.name}"): RecordService<${typeName}Response>;\n`;
        }
        code += `};\n`;

        fs.writeFileSync(OUTPUT_PATH, code);
        console.log(
            `✨ Финальные типы с поддержкой TypedPocketBase сохранены в ${OUTPUT_PATH}`,
        );

        // 2. ПОСТ-ВАЛИДАЦИЯ (Авто-тест кода)
        console.log(`🔍 Запуск пост-валидации (Biome Linter & Formatter)...`);
        try {
            execSync(`npx @biomejs/biome format --write ${OUTPUT_PATH}`, {
                stdio: "inherit",
            });
            execSync(`npx @biomejs/biome check --write ${OUTPUT_PATH}`, {
                stdio: "inherit",
            });
            console.log(`✅ Типы успешно прошли валидацию и форматирование.`);
        } catch (e) {
            console.warn(
                `⚠️ Внимание: Ошибка линтера при проверке сгенерированных типов.`,
                e,
            );
        }

        // 3. СИНХРОНИЗАЦИЯ СОСТОЯНИЯ (Git Hooks / CI)
        setupGitHooks();
    } catch (err) {
        console.error("❌ ОШИБКА:", err.message);
        process.exit(1);
    }
}

function setupGitHooks() {
    // Husky is owned by app/package.json and lives in app/.husky. Type generation
    // must not mutate package.json or try to install hooks from the repository
    // root: that made the command emit a misleading npm set-script failure.
    const huskyDir = path.join(PROJECT_ROOT, "app", ".husky");
    const preCommitPath = path.join(huskyDir, "pre-commit");

    if (!fs.existsSync(huskyDir)) {
        console.log(
            `ℹ️ Каталог app/.husky не найден; установка Git hooks пропущена.`,
        );
        return;
    }

    if (fs.existsSync(huskyDir) && !fs.existsSync(preCommitPath)) {
        console.log(
            `ℹ️ app/.husky/pre-commit не найден; typegen не создаёт hooks автоматически.`,
        );
        return;
    }

    console.log(`✅ Husky найден: app/.husky/pre-commit`);
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

generate();
