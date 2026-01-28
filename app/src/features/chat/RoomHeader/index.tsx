import { Avatar, Box, Flex, Heading } from '@radix-ui/themes';
import { useRouter } from '@tanstack/react-router';
import { ChevronLeft, Phone, Trash2, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { BREAKPOINTS, useMediaQuery } from '@/hooks/useMediaQuery';
import type { Room } from '@/lib/types/chat';
import styles from './roomheader.module.css';

interface RoomHeaderProps {
    room?: Room;
    roomId: string;
    onEndSession?: () => void;
    ending?: boolean;
}

export function RoomHeader({
    room,
    roomId,
    onEndSession,
    ending,
}: RoomHeaderProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    const handleBack = () => {
        router.navigate({ to: '/chat' });
    };

    const handleInfoClick = () => {
        console.log('Info clicked');
    };

    return (
        <header className={styles.roomHeader}>
            <Flex align="center" gap="3" className={styles.leftSection}>
                {isMobile && (
                    <Box
                        className={`${styles.iconButton} ${styles.backButton}`}
                        onClick={handleBack}
                    >
                        <ChevronLeft size={26} />
                    </Box>
                )}

                <Flex
                    align="center"
                    gap="3"
                    className={styles.titleArea}
                    onClick={handleInfoClick}
                >
                    <Avatar
                        fallback={room?.name?.[0] || '?'}
                        radius="full"
                        size="2"
                        color="gray"
                    />
                    <Heading size="4" truncate>
                        {room?.is_ephemeral ? '🔒 ' : ''}
                        {room?.name || `Chat ${roomId.slice(0, 8)}...`}
                    </Heading>
                </Flex>
            </Flex>

            <Flex align="center" gap="1">
                <Button
                    variant="ghost"
                    color="gray"
                    className={styles.actionButton}
                >
                    <Phone size={20} />
                </Button>
                <Button
                    variant="ghost"
                    color="gray"
                    className={styles.actionButton}
                >
                    <Video size={20} />
                </Button>

                {room?.is_ephemeral && onEndSession && (
                    <Button
                        color="red"
                        variant="soft"
                        size="1"
                        onClick={onEndSession}
                        loading={ending}
                        ml="2"
                    >
                        <Trash2 size={16} />
                        {t('chat.endSession')}
                    </Button>
                )}
            </Flex>
        </header>
    );
}
