import { TextField } from '@radix-ui/themes';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

// TextField.Root содержит стилизацию. Элемент ввода (Input) не импортируется отдельно.
// В Radix Themes TextField.Root является полем ввода.

/**
 * Компонент текстового поля ввода.
 * Обертка над Radix Themes TextField.Root.
 */
export const Input = forwardRef<
    HTMLInputElement,
    ComponentPropsWithoutRef<typeof TextField.Root>
>(({ className, ...props }, ref) => {
    return <TextField.Root className={className} ref={ref} {...props} />;
});
Input.displayName = 'Input';
