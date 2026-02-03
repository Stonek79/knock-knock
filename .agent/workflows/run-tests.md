---
description: Как запускать тесты в проекте
---

# Запуск тестов

// turbo-all

1. Запустить все тесты:
```bash
TMPDIR=$PWD/.vitest-tmp npm run test
```

2. Запустить конкретный файл:
```bash
TMPDIR=$PWD/.vitest-tmp npm run test -- --run src/path/to/test.ts
```

3. Запустить с watch-режимом:
```bash
TMPDIR=$PWD/.vitest-tmp npm run test
```

**ВАЖНО**: Переменная `TMPDIR=$PWD/.vitest-tmp` обязательна для избежания EPERM ошибок в песочнице.
