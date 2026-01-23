import { Heading, Text } from '@radix-ui/themes';
import { createFileRoute } from '@tanstack/react-router';
import { MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './chat.module.css';

export const Route = createFileRoute('/chat/')({
    component: ChatIndex,
});

function ChatIndex() {
    const { t } = useTranslation();

    return (
        <div className={styles.chatContainer}>
            <div className={styles.emptyIconBox}>
                <MessageSquare size={48} />
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
