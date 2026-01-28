import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { Plus, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './favoritespage.module.css';

/**
 * Страница избранного.
 * Заглушка для будущей реализации избранных контактов/сообщений.
 */
export function FavoritesPage() {
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
                <Star size={40} />
            </Box>

            <Heading size="5" weight="bold" className={styles.title}>
                {t('favorites.title', 'Избранное')}
            </Heading>

            <Text size="3" className={styles.description}>
                {t(
                    'favorites.emptyDescription',
                    'Добавляйте важные сообщения и контакты в избранное для быстрого доступа.',
                )}
            </Text>

            <Box className={styles.actionButton}>
                <Plus size={20} />
                {t('favorites.addFavorite', 'Добавить в избранное')}
            </Box>
        </Flex>
    );
}
