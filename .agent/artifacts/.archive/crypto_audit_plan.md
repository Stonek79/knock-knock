# План аудита и доработки криптографического модуля

## Цель: Полная очистка кода от магических чисел, исправление зависимостей от DOM (window) и актуализация документации.

## 1. Константы (CRYPTO_CONFIG)
- [ ] Добавить `PBKDF2_ITERATIONS: 100000` в `CRYPTO_CONFIG`.
- [ ] Добавить `AES_KEY_LENGTH: 256` в `CRYPTO_CONFIG`.

## 2. Утилиты Base64 (keys.ts)
- [ ] Заменить `window.btoa` и `window.atob` на универсальные вызовы.
- [ ] Т.к. `btoa/atob` доступны в глобальном контексте браузера (и воркера), достаточно убрать префикс `window.`.

## 3. Рефакторинг и уточнение комментариев (JSDoc)

### [app/src/lib/crypto/keys.ts](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/crypto/keys.ts)
- [ ] Уточнить JSDoc для `importPublicKey` и `exportPublicKey`.
- [ ] Убедиться, что везде используется `CRYPTO_CONFIG`.

### [app/src/lib/crypto/messages.ts](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/crypto/messages.ts)
- [ ] Проверить корректность описания AES-GCM (256-bit).

### [app/src/lib/crypto/rooms.ts](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/crypto/rooms.ts)
- [ ] Добавить недостающее описание параметров в `generateDeterministicRoomId`.
- [ ] Уточнить описание `generateRoomId`.

### [app/src/lib/crypto/recovery.ts](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/crypto/recovery.ts)
- [ ] Использовать константу для итераций PBKDF2.

### [app/src/lib/crypto/encryption.ts](file:///Users/alexstone/WebstormProjects/knock-knock/app/src/lib/crypto/encryption.ts)
- [ ] Заменить `new Uint8Array(12)` на `CRYPTO_CONFIG.IV_LENGTH_BYTES`.
- [ ] Заменить хардкод `length: 256` на `CRYPTO_CONFIG.AES_KEY_LENGTH`.

## Проверка
- [ ] npx biome check
- [ ] npx tsc --noEmit
