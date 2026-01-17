import * as LabelPrimitive from '@radix-ui/react-label';
import {
    type ComponentPropsWithoutRef,
    type ComponentRef,
    forwardRef,
} from 'react';
import { cn } from '@/lib/utils';
import module from './Label.module.css';

/**
 * Компонент подписи для форм.
 * Использует Radix UI Label.
 */
const Label = forwardRef<
    ComponentRef<typeof LabelPrimitive.Root>,
    ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
    <LabelPrimitive.Root
        ref={ref}
        className={cn(module.label, className)}
        {...props}
    />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
