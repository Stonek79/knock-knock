import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import module from './Input.module.css';

/**
 * Компонент текстового ввода.
 * Обертка над нативным input со стилизацией.
 */
export const Input = forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
    return (
        <input ref={ref} className={cn(module.input, className)} {...props} />
    );
});
Input.displayName = 'Input';
