import { TextField } from '@radix-ui/themes';
import { Mail } from 'lucide-react';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

// import styles from './styles.module.css'; // Раскомментировать если понадобятся стили

type EmailInputProps = ComponentPropsWithoutRef<typeof TextField.Root>;

export const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
    ({ className, ...props }, ref) => {
        return (
            <TextField.Root
                className={className}
                ref={ref}
                type="email"
                {...props}
            >
                <TextField.Slot>
                    <Mail size={16} />
                </TextField.Slot>
            </TextField.Root>
        );
    },
);

EmailInput.displayName = 'EmailInput';
