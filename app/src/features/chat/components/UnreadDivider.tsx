import { Box, Text } from '@radix-ui/themes';
import { useTranslation } from 'react-i18next';
import styles from './unread-divider.module.css';

export function UnreadDivider() {
    const { t } = useTranslation();

    return (
        <Box className={styles.container}>
            <Box className={styles.line} />
            <Text className={styles.text}>
                {t('chat.unreadMessages', 'Непрочитанные сообщения')}
            </Text>
            <Box className={styles.line} />
        </Box>
    );
}
