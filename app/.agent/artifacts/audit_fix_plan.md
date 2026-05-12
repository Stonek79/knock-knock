# План аудита и исправления архитектурных несоответствий

## 1. Устранение запрещенных конструкций (any, as Casting)
- **roomMapper.ts**: Заменить `record: any` в `getFileUrl` на объединение типов всех возможных записей (UsersResponse | RoomsResponse | MessageRow).
- **userMapper.ts**: Убрать `as Profile`. Расширить тип `Profile` виртуальными полями (`avatar_url`, `display_name`), если они необходимы UI, через интерфейс, а не кастование.
- **messageMapper.ts**: Использовать проверку типа или Zod для `attachments`, вместо `as Attachment[]`.

## 2. Исправление именований и констант
- **ChatRealtimeService.ts**: Проверить `KEYSTORE_TYPES` vs `LOCAL_KEY_TYPES`.
- **db.ts**: Убедиться, что все системные поля (`created`, `updated`) используются консистентно.

## 3. Документация (JSDoc)
- Добавить/обновить JSDoc на русском языке для всех новых методов в `room.repository.ts` (`getRoomKeysBatch`) и `queries.ts` (`decryptRoomsLastMessages`).

## 4. Качество кода и линтинг
- Запустить `npx biome check --apply ./app/src` для автоматического исправления форматирования и проверки правил.
- Исправить все ошибки, которые найдет Biome.

## 5. Тестирование
- Проверить корректность сборки (`npm run build` или проверка типов через `tsc`).
