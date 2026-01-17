import { Slot } from '@radix-ui/react-slot';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import module from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Вариант стиля кнопки */
    variant?: 'primary' | 'secondary' | 'ghost';
    /** Рендерить как дочерний элемент (Slot) */
    asChild?: boolean;
}

/**
 * Кнопка интерфейса.
 * Поддерживает варианты стилей и полиморфный рендеринг через `asChild`.
 */

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        return (
            <Comp
                ref={ref}
                className={cn(module.button, module[variant], className)}
                {...props}
            />
        );
    },
);
Button.displayName = 'Button';
