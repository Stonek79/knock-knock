import { Box, DropdownMenu, Flex, Heading } from '@radix-ui/themes';
import { useLocation, useRouter } from '@tanstack/react-router';
import {
    Camera,
    ChevronLeft,
    Lock,
    LogOut,
    MessageSquarePlus,
    MoreVertical,
    Search,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateChatDialog } from '@/features/chat/CreateChatDialog';
import { APP_NAME, CHAT_TYPE, ROUTES } from '@/lib/constants';
import type { ChatType } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import styles from './mobileheader.module.css';

/**
 * Тип открытого диалога создания чата.
 */
type ChatDialogType = ChatType | null;

/**
 * Пропсы компонента MobileHeader.
 */
interface MobileHeaderProps {
    /** Заголовок (по умолчанию название приложения) */
    title?: string;
    /** Показывать ли поиск */
    showSearch?: boolean;
    /** Показывать ли камеру */
    showCamera?: boolean;
    /** Показывать ли меню */
    showMenu?: boolean;
}

/**
 * Header для мобильной версии в стиле WhatsApp.
 * Отображает название приложения, иконки камеры, поиска и меню.
 * В суброутах отображает кнопку "Назад".
 */
export function MobileHeader({
    title = APP_NAME,
    showSearch = true,
    showCamera = true,
    showMenu = true,
}: MobileHeaderProps) {
    const { t } = useTranslation();
    const { signOut } = useAuthStore();
    const location = useLocation();
    const router = useRouter();
    const [openDialog, setOpenDialog] = useState<ChatDialogType>(null);

    /**
     * Проверяем, находимся ли мы глубоко в маршруте (например, в конкретном чате).
     * Грубая проверка: если сегментов > 2 (например /chat/123)
     */
    const isSubRoute = location.pathname.split('/').filter(Boolean).length > 1;

    const handleBack = () => {
        router.navigate({ to: ROUTES.CHAT_LIST });
    };

    const handleDialogChange = (open: boolean) => {
        if (!open) {
            setOpenDialog(null);
        }
    };

    return (
        <>
            <header className={styles.header}>
                <Flex align="center" gap="3">
                    {isSubRoute && (
                        <Box className={styles.backButton} onClick={handleBack}>
                            <ChevronLeft size={26} />
                        </Box>
                    )}
                    <Heading size="5" weight="bold" className={styles.title}>
                        {title}
                    </Heading>
                </Flex>

                <Flex gap="1" align="center">
                    {showCamera && !isSubRoute && (
                        <Box className={styles.iconButton}>
                            <Camera size={22} />
                        </Box>
                    )}
                    {showSearch && (
                        <Box className={styles.iconButton}>
                            <Search size={22} />
                        </Box>
                    )}
                    {showMenu && (
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger>
                                <Box className={styles.iconButton}>
                                    <MoreVertical size={22} />
                                </Box>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content>
                                <DropdownMenu.Item
                                    onSelect={() =>
                                        setOpenDialog(CHAT_TYPE.PUBLIC)
                                    }
                                >
                                    <Flex align="center" gap="2">
                                        <MessageSquarePlus size={16} />
                                        {t('chat.newChat')}
                                    </Flex>
                                </DropdownMenu.Item>

                                <DropdownMenu.Item
                                    onSelect={() =>
                                        setOpenDialog(CHAT_TYPE.PRIVATE)
                                    }
                                >
                                    <Flex align="center" gap="2">
                                        <Lock size={16} />
                                        {t('chat.newPrivate')}
                                    </Flex>
                                </DropdownMenu.Item>

                                <DropdownMenu.Item>
                                    <Flex align="center" gap="2">
                                        <Users size={16} />
                                        {t('chat.newGroup')}
                                    </Flex>
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator />
                                <DropdownMenu.Item
                                    color="red"
                                    onClick={signOut}
                                >
                                    <Flex gap="2" align="center">
                                        <LogOut size={16} />
                                        {t('auth.signOut')}
                                    </Flex>
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                    )}
                </Flex>
            </header>

            {/* Диалоги рендерятся вне header через порталы */}
            <CreateChatDialog
                open={openDialog === CHAT_TYPE.PUBLIC}
                onOpenChange={handleDialogChange}
                isPrivate={false}
            />
            <CreateChatDialog
                open={openDialog === CHAT_TYPE.PRIVATE}
                onOpenChange={handleDialogChange}
                isPrivate
            />
        </>
    );
}
