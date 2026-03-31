# Тестирование Knock-Knock

> Последнее обновление: Март 2026  
> Статус: 🏗 В процессе (PocketBase Migration)

---

## 📊 Стратегия тестирования

Проект использует многоуровневый подход к обеспечению качества, разделенный по средам исполнения и типам инструментов.

### 1. Среды исполнения (Environments)

| Среда | PocketBase URL | Контейнер | Назначение |
|-------|----------------|-----------|------------|
| **Development (Dev)** | `https://dev-api.knok-knok.ru:8443` | `knok-knok-pb-dev` | Разработка, Unit-тесты, ручное ломание |
| **Production (Prod)** | `https://api.knok-knok.ru:8443` | `knok-knok-pb` | Реальные пользователи, высокая стабильность |

---

## 🛠 Инструментарий

### 1. Unit & Integration тесты (Vitest)
- **Цель**: Проверка логики сервисов, репозиториев и сторов.
- **Особенности**: Мы используем **слой репозиториев** для моканья данных. Прямое моканье SDK PocketBase запрещено.
- **Команды**:
  ```bash
  cd app
  npm run test          # Запуск всех тестов
  npm run test:watch    # Режим разработки
  ```

### 2. UI-тестирование (Storybook)
- **Цель**: Изолированная разработка и визуальное тестирование компонентов.
- **Команда**: `npm run storybook`

### 3. E2E-тестирование (Playwright)
- **Цель**: Проверка критических путей пользователя (Auth, Messaging, Crypto).
- **Среда**: Запускается против Dev-окружения.
- **Команды**:
  ```bash
  cd app
  npx playwright test
  ```

---

## 🏗 Настройка тестового окружения (Dev/Staging)

### 1. Запуск контейнера
Для тестов и разработки используется отдельный инстанс PocketBase:
```bash
# На сервере
cd ~/knok-knok-bd-dev
docker compose -f docker-compose.dev.yml up -d
```
Порт на хосте: `9090` -> мапится через Nginx на `dev-api.knok-knok.ru`.

### 2. Переменные окружения (.env.test)
Для запуска тестов локально создайте `.env.test` (не коммитится):
```bash
VITE_PB_URL=https://dev-api.knok-knok.ru:8443
PB_ENCRYPTION_KEY=...ваша_соль...
```

### 3. Сидирование данных
Для наполнения базы тестовыми пользователями используйте скрипт:
```bash
cd app
npm run seed
```

---

## 📝 Написание тестов: Лучшие практики (Repository Pattern)

Согласно [плану обновления тестов](file:///Users/alexstone/.gemini/antigravity/brain/1025f2d0-3b22-48d1-97f8-579e3c5565b1/test_fixes_plan.md.resolved):

1. **Мокаем репозитории**: Вместо `vi.mock("pocketbase")` мокаем `@/lib/repositories/...`.
2. **Используем Result-обертку**: Тесты должны учитывать, что методы возвращают `Result<T, AppError>`.

**Пример (Unit-test):**
```typescript
import { ok } from "@/lib/utils/result";
import { messageRepository } from "@/lib/repositories/message.repository";

vi.mock("@/lib/repositories/message.repository", () => ({
    messageRepository: {
        sendMessage: vi.fn(),
    },
}));

// В тесте
vi.mocked(messageRepository.sendMessage).mockResolvedValue(ok(mockMessage));
```

---

## 🧹 Очистка данных
При удалении пользователя серверные хуки (`pb_hooks/main.pb.js`) автоматически очищают все связанные данные (Personal Rooms, Media). Для полного сброса базы в Dev-среде можно перезапустить контейнер с очисткой Volume или использовать API удаления.
