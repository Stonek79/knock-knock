import {
    Button,
    Flex,
    AlertDialog as RadixAlertDialog,
} from '@radix-ui/themes';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface AlertDialogProps {
    /** Controls the open state of the dialog */
    open: boolean;
    /** Callback when the open state changes */
    onOpenChange: (open: boolean) => void;
    /** Title of the alert */
    title: string;
    /** Description text */
    description: ReactNode;
    /** Text for the cancel button */
    cancelText?: string;
    /** Text for the confirm button */
    confirmText?: string;
    /** Color of the confirm button */
    confirmColor?: 'red' | 'blue' | 'green' | 'gray' | 'orange' | 'ruby';
    /** Callback when confirm is clicked */
    onConfirm: () => void | Promise<void>;
}

/**
 * Reusable Alert Dialog component based on Radix UI.
 * Used for confirmations requiring user attention.
 */
export function AlertDialog({
    open,
    onOpenChange,
    title,
    description,
    cancelText,
    confirmText,
    confirmColor = 'red',
    onConfirm,
}: AlertDialogProps) {
    const { t } = useTranslation();

    return (
        <RadixAlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <RadixAlertDialog.Content maxWidth="450px">
                <RadixAlertDialog.Title>{title}</RadixAlertDialog.Title>
                <RadixAlertDialog.Description size="2">
                    {description}
                </RadixAlertDialog.Description>

                <Flex gap="3" mt="4" justify="end">
                    <RadixAlertDialog.Cancel>
                        <Button variant="soft" color="gray">
                            {cancelText || t('common.cancel', 'Отмена')}
                        </Button>
                    </RadixAlertDialog.Cancel>
                    <RadixAlertDialog.Action>
                        <Button
                            variant="solid"
                            color={confirmColor}
                            onClick={onConfirm}
                        >
                            {confirmText || t('common.confirm', 'Подтвердить')}
                        </Button>
                    </RadixAlertDialog.Action>
                </Flex>
            </RadixAlertDialog.Content>
        </RadixAlertDialog.Root>
    );
}
