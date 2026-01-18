import { Text } from '@radix-ui/themes';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

/**
 * Компонент метки (Label).
 * Использует Radix Themes Text с семантикой label.
 */
export const Label = forwardRef<
    HTMLLabelElement,
    ComponentPropsWithoutRef<typeof Text>
>(({ children, ...props }, ref) => (
    <Text as="label" size="2" weight="bold" ref={ref} {...props}>
        {children}
    </Text>
));
Label.displayName = 'Label';
