import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { UserPlus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import styles from './contactspage.module.css';

/**
 * Страница контактов.
 * Заглушка для будущей реализации списка контактов.
 */
export function ContactsPage() {
    const { t } = useTranslation();

    return (
        <Flex
            direction="column"
            align="center"
            justify="center"
            flexGrow="1"
            p="6"
            gap="4"
            className={styles.container}
        >
            <Box className={styles.iconBox}>
                <Users size={40} />
            </Box>

            <Heading size="5" weight="bold" className={styles.title}>
                {t('contacts.title', 'Контакты')}
            </Heading>

            <Text size="3" className={styles.description}>
                {t(
                    'contacts.emptyDescription',
                    'Здесь будут отображаться ваши контакты. Добавьте друзей, чтобы начать общение.',
                )}
            </Text>

            <Button variant="soft" size="3" className={styles.addButton}>
                <UserPlus size={18} />
                {t('contacts.addContact', 'Добавить контакт')}
            </Button>
        </Flex>
    );
}
