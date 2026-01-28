import { Heading, Text } from '@radix-ui/themes';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatList } from '@/features/chat/ChatList';
import { BREAKPOINTS, useMediaQuery } from '@/hooks/useMediaQuery';
import styles from '../chat.module.css';

/**
 * Индекс страницы /chat.
 * На десктопе: показывает заглушку "Выберите чат" (список в Sidebar).
 * На мобильных: показывает полноценный список чатов (Sidebar скрыт).
 */
export function Chat() {
    const { t } = useTranslation();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    // На мобильных показываем список чатов вместо заглушки
    if (isMobile) {
        return <ChatList />;
    }

    // На десктопе показываем заглушку — список чатов в Sidebar
    return (
        <div className={styles.chatContainer}>
            <div className={styles.emptyIconBox}>
                <MessageCircle size={64} strokeWidth={1.5} />
            </div>
            <Heading size="5" mb="2">
                {t('chat.selectChat', 'Выберите чат')}
            </Heading>
            <Text color="gray" size="3" className={styles.placeholderText}>
                {t(
                    'chat.selectChatDesc',
                    'Выберите пользователя из списка слева, чтобы начать общение.',
                )}
            </Text>
        </div>
    );
}
