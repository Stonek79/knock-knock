import { Avatar, Flex, Heading } from '@radix-ui/themes';
import { Link } from '@tanstack/react-router';
import { MessageSquare, Settings, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatList } from '@/components/chat/ChatList';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth';
import { NewChatDialog } from '../NewChatDialog';
import styles from './sidebar.module.css';

export function Sidebar() {
    const { t } = useTranslation();
    const { user } = useAuthStore();

    if (!user) return null;

    return (
        <aside className={styles.sidebar}>
            {/* Header */}
            <Flex
                align="center"
                justify="between"
                className={styles.header}
                style={{
                    height: '64px',
                    padding: '0 16px',
                    borderBottom: '1px solid var(--gray-4)',
                }}
            >
                <Link to={ROUTES.PROFILE}>
                    <Avatar
                        size="2"
                        fallback={<User size={16} />}
                        radius="full"
                        color="blue"
                        style={{ cursor: 'pointer' }}
                    />
                </Link>
                <Heading size="4" weight="bold">
                    {t('chat.sidebarTitle', 'Чаты')}
                </Heading>
                <Flex gap="3">
                    <NewChatDialog
                        trigger={
                            <MessageSquare size={20} className={styles.icon} />
                        }
                    />
                    <Link to={ROUTES.PROFILE}>
                        <Settings size={20} className={styles.icon} />
                    </Link>
                </Flex>
            </Flex>

            {/* Chat List */}
            <ChatList />
        </aside>
    );
}
