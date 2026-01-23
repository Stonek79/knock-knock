import { Button as RadixButton } from '@radix-ui/themes';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

// Удаляем 'variant' из свойств Radix, чтобы избежать конфликта с нашими кастомными вариантами
type BaseButtonProps = Omit<
    ComponentPropsWithoutRef<typeof RadixButton>,
    'variant'
>;

type ButtonProps = BaseButtonProps & {
    variant?:
        | 'primary'
        | 'secondary'
        | 'ghost'
        | 'solid'
        | 'soft'
        | 'outline'
        | 'surface'
        | 'classic';
};

/**
 * Компонент кнопки.
 * Обертка над Radix Themes Button с поддержкой легаси вариантов.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', ...props }, ref) => {
        // Сопоставление легаси вариантов с вариантами Radix Themes
        let themeVariant: ComponentPropsWithoutRef<
            typeof RadixButton
        >['variant'] = 'solid';

        switch (variant) {
            case 'primary':
                themeVariant = 'solid';
                break;
            case 'secondary':
                themeVariant = 'soft';
                break;
            case 'ghost':
                themeVariant = 'ghost';
                break;
            default:
                themeVariant = variant as ComponentPropsWithoutRef<
                    typeof RadixButton
                >['variant'];
        }

        return <RadixButton ref={ref} variant={themeVariant} {...props} />;
    },
);

Button.displayName = 'Button';
