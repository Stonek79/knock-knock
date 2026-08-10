---
description: Как запускать проверки Nemo
---

# Проверки frontend

Команды выполняются из директории `app`.

```bash
npm run lint
npm run build
npm test -- --run
```

Один test file:

```bash
npm test -- --run src/path/to/file.test.ts
```

Watch mode:

```bash
npm run test:watch
```

`TMPDIR` не требуется по умолчанию. Задавай отдельную временную директорию
только если текущая sandbox действительно возвращает ошибку доступа.

Текущая suite частично устарела. Следуй `docs/TESTING_PLAN.md`: сначала отличи
сломанный mock от реального дефекта, не удаляй test только ради зелёного вывода.
Unit tests не должны обращаться к Dev или Prod API.
