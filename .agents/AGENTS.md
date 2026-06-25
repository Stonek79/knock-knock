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
