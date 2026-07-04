# PocketBase API Guidelines (v0.23+)

## JS Hooks (pb_hooks)
- **НЕ ИСПОЛЬЗУЙТЕ** `e.bindBody(body)` с `DynamicModel` для парсинга JSON-тел запросов. Этот метод часто приводит к ошибкам 400 Bad Request при малейшем несовпадении типов.
- **ИСПОЛЬЗУЙТЕ** нативный метод чтения через `e.requestInfo().body` (в Goja этот метод возвращает распакованный из JSON `map[string]any`).
  ```javascript
  const info = e.requestInfo();
  const text = info?.body?.text || "";
  ```

## JS SDK Client (`pb.send`)
- Для POST-запросов с телом JSON на кастомные эндпоинты через низкоуровневый `pb.send`, всегда используйте явный `JSON.stringify(body)` и добавляйте заголовок `Content-Type: application/json`, чтобы избежать отправки `[object Object]` или пустого Content-Type.
  ```typescript
  pb.send("/api/custom/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "value" }),
  });
  ```

## Миграции Схемы БД (pb_schema.json)
- **Индексы и RLS**: При удалении или переименовании полей в базе данных всегда проверяйте и обновляйте уникальные индексы (массив `indexes`) и API-правила (`createRule`, `updateRule`, `deleteRule`, `listRule`, `viewRule`). Оставшиеся ссылки на удаленные поля вызовут ошибку валидации при импорте.
- **Системные коллекции**: Экспортированная схема может содержать системные коллекции (`_superusers`, `_authOrigins`, `_mfas` и др.). Их импорт в чистую базу данных PocketBase v0.23+ всегда падает с конфликтом. При миграции схемы "с нуля" эти коллекции необходимо удалять из JSON-файла.

## Правила создания временных скриптов агентами
- Если агенту необходимо написать и выполнить скрипт (например, для парсинга, парсинга JSON или массовой миграции) для реализации задачи, скрипт должен быть сохранен строго в директории `.agent/temp_scripts/`. Ни в коем случае не создавайте временные скрипты в корне проекта.
- Агент должен сам запустить свой скрипт с помощью инструмента выполнения команд (`run_command`) в рамках выполнения текущей задачи.
- После успешного выполнения скрипта агент обязан удалить его (например, `rm .agent/temp_scripts/название.js`), чтобы не засорять проект.

## Zero-Knowledge & Crypto (Dev Mode Bypass)
- **Имитация шифрования**: Скрипт `seed.js` не шифрует данные по-настоящему, а использует открытый текст сообщений и открытые имена для инкогнито-профилей. Чтобы различать эти данные, используются флаги тестовых записей (`message.is_test = true`, `user.encrypted_profile = { mock: true }`).
- **Требование к агентам**: При написании фронтенд-кода (крипто-сервисов, мапперов) агенты ОБЯЗАНЫ учитывать эти флаги, чтобы приложение могло корректно отображать dev-данные.
- **Безопасность (Tree-Shaking)**: Любой код обхода криптографии должен быть строго обернут в `if (import.meta.env.DEV)`. Например: `if (import.meta.env.DEV && message.is_test) return message.content;`. Это гарантирует, что Vite (Rollup) полностью удалит этот байпас из production-билда.

## Strict Coding Standards & Code Review Rules
- **Strict Typing**: NEVER use `any`. If you see `any` or `Record<string, any>`, you MUST fix it to `unknown` or a precise type. All implicit any variables must be explicitly typed.
- **Constants**: You MUST use project constants instead of hardcoded strings (e.g. `DB_TABLES.USERS` instead of `'users'`). Any unused constants or imports MUST be removed.
- **Linting & Validation**: You MUST ensure that the code complies with strict Typescript and Biome linter rules. Check for and eliminate all unused variables or imports. **CRITICAL**: When running the linter or compiler, ALWAYS navigate to the `app` directory first (`cd app && npx @biomejs/biome check src` or `cd app && npx tsc --noEmit -p tsconfig.app.json`). Do NOT run these commands from the root directory, or you will hang the process scanning irrelevant files.
- **Documentation**: All new and heavily modified code MUST be documented using JSDoc in Russian. Complex logic inside functions must contain inline explanatory comments in Russian.
- **Object Formations**: When creating objects bound to specific Zod schemas or TS types, ensure all required properties are present and correctly typed. Do not inject fields that were removed from the schema.
- **PocketBase SDK Imports**: NEVER import the `pb` client (`import pb from "@/lib/pb"`) inside UI components, Stores (Zustand), or Hooks. The PocketBase SDK must ONLY be used inside the Data Layer (`src/lib/repositories/` and `src/lib/services/`). All other layers must interact with the Data Layer.
- **Auto-generated Files**: NEVER manually modify `app/src/lib/types/pocketbase-types.ts`. This is an auto-generated file that serves as the ultimate source of truth for the project's database types. If types need to be updated, run the type generation script `npm run typegen:pb`.
- **Reviewer Agent Duty**: The reviewer MUST be strict and nitpicky. If there is a single unused variable, implicit `any`, or hardcoded string instead of a constant, the reviewer MUST reject the code.
