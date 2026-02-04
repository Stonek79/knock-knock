# Моканье данных и работа с Supabase

В проекте Knock-Knock мы разделяем окружения для обеспечения стабильности и безопасности.

## Принципы работы с данными

1. **Dev-режим**: Используем локальные моки. Это позволяет разрабатывать UI без зависимости от интернета и локального Docker-контейнера Supabase.
2. **Test-режим**: Полная изоляция от сети. Все API-запросы подменяются предсказуемыми данными.
3. **VPS/Home Server**: Реальный Supabase используется только в стейджинге и продакшене.

## Как создавать моки

### 1. Моки для компонентов (Storybook)
Передавайте данные через пропсы или используйте декораторы для провайдеров:
```tsx
const mockMessages = [
  { id: 1, content: 'Привет!', isOwn: false, timestamp: '2024-02-04T20:00:00Z' },
  { id: 2, content: 'Как дела?', isOwn: true, timestamp: '2024-02-04T20:01:00Z' }
];
```

### 2. Моки для TanStack Query
При написании хуков, используйте тестовые данные в `initialData` или подменяйте `queryFn`:
```typescript
export const useMessages = (roomId: string) => {
  return useQuery({
    queryKey: ['messages', roomId],
    queryFn: async () => {
      if (import.meta.env.DEV) return mockMessages;
      return fetchRealMessages(roomId);
    }
  });
};
```

### 3. Моканье Supabase Client
Для Vitest используйте `vi.mock`:
```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
    // ... и так далее
  }
}));
```

## Тестирование Offline-First
Поскольку приложение должно работать без интернета, обязательно создавайте сценарии, где:
- API возвращает 500 ошибку.
- Сеть медленная (Throttling в Playwright).
- Данные берутся из `IndexedDB` вместо сети.

## Учет специфики VPS
Помните, что ваш VPS сервер (или домашний сервер) может иметь задержки. Тесты в Playwright должны использовать адекватные таймауты (`expect(...).toBeVisible({ timeout: 5000 })`).
