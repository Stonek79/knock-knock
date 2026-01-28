import { Button, Dialog, Flex, Text, TextField } from '@radix-ui/themes';
import { Search, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './createchatdialog.module.css';

interface CreateChatDialogProps {
    /** Открыт ли диалог */
    open: boolean;
    /** Callback изменения состояния открытия */
    onOpenChange: (open: boolean) => void;
    /** Приватный чат или обычный */
    isPrivate?: boolean;
}

/**
 * Диалог создания чата.
 * Контролируемый компонент — состояние открытия управляется извне.
 *
 * @see https://www.radix-ui.com/themes/docs/components/dialog
 */
export function CreateChatDialog({
    open,
    onOpenChange,
    isPrivate = false,
}: CreateChatDialogProps) {
    const { t } = useTranslation();

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content maxWidth="450px">
                <Dialog.Title>
                    {isPrivate ? t('chat.newPrivate') : t('chat.newChat')}
                </Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    {t('chat.selectContact')}
                </Dialog.Description>

                <Flex direction="column" gap="3">
                    <TextField.Root placeholder={t('common.search')}>
                        <TextField.Slot>
                            <Search height="16" width="16" />
                        </TextField.Slot>
                    </TextField.Root>

                    {/* TODO: Заменить на реальный ContactList */}
                    <Flex
                        direction="column"
                        align="center"
                        justify="center"
                        className={styles.emptyState}
                    >
                        <UserPlus size={48} className={styles.icon} />
                        <Text align="center" color="gray">
                            {t('contacts.empty')}
                        </Text>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                {t('common.cancel')}
                            </Button>
                        </Dialog.Close>
                        <Dialog.Close>
                            <Button disabled>{t('chat.create')}</Button>
                        </Dialog.Close>
                    </Flex>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
