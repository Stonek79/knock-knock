# Radix UI vs CSS Modules: Гайд по выбору

В проекте Knock-Knock мы сочетаем мощь Radix UI в виде кастомных компонентов для структуры и гибкость CSS Modules для уникального дизайна.

## Не использовать Radix UI Props
Не используйте встроенные пропсы Radix (`p`, `m`, `gap`, `direction`, `align`, `justify`), используем кастомные:
- Выравнивание элементов во флекс-контейнере.
- Системные отступы из сетки (1-9).
- Изменение размеров текста.

**Пример:**
```tsx
<Flex gap="3" align="center" p="4">
  <Avatar src="..." fallback="A" />
  <Text size="2" weight="bold">User Name</Text>
</Flex>
```

## Когда использовать CSS Modules
Используйте CSS Modules (`styles.myClass`), когда:
- Нужны сложные CSS-эффекты (градиентные меши, нестандартные тени, блюр).
- Нужно специфическое поведение при ховере или анимация (`@keyframes`).
- Нужно переопределить глубокие стили компонентов (через селекторы).
- Нужно использовать специфические переменные из `index.css`, которые не прокинуты в пропсы.

**Пример:**
```tsx
// MyComponent.tsx
import styles from './MyComponent.module.css';

<Box className={styles.premiumCard}>
  {/* content */}
</Box>
```

```css
/* MyComponent.module.css */
.premiumCard {
  background: linear-gradient(135deg, var(--surface), var(--muted));
  transition: transform 0.2s ease;
  overflow: hidden;
  position: relative;
}

.premiumCard:hover {
  transform: translateY(-2px);
}
```

## Золотое правило (The Knock-Knock Rule)
1. **Layout = Radix**. Флексы, гриды и базовые контейнеры делаем через кастоиные Radix компоненты.
2. **Aesthetics = CSS Modules**. Тени, бордеры, специфические фоны и анимации выносим в CSS.
3. **Typography = Radix `.Text`**. Почти всегда используем компонент `<Text>` для консистентности типографики.

## Как НЕ надо делать
- Плохо: `<div style={{ display: 'flex' }}>` -> Используй кастомный `<Flex>`.
- Плохо: `<Flex className={styles.flexCenter}>` где `.flexCenter { display: flex; justify-content: center; }` -> Используй `<Flex justify="center">`.
- Плохо: Использовать магические числа `padding: 13px` -> Используй `p="3"` (Radix) или `var(--space-md)`, но не использовать `size="var(--space-md)"`.
