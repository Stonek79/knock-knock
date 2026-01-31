import { Avatar, Box, Flex, Heading, Text } from '@radix-ui/themes';
import { useRouter } from '@tanstack/react-router';
import { ChevronLeft, Phone, Trash2, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { BREAKPOINTS, useMediaQuery } from '@/hooks/useMediaQuery';
import type { RoomWithMembers } from '@/lib/types/room';
import { useAuthStore } from '@/stores/auth';
import styles from './roomheader.module.css';

/**
 * Данные о собеседнике для DM чатов.
 */
interface PeerUser {
    id: string;
    display_name: string;
    username?: string;
    avatar_url?: string;
}

interface RoomHeaderProps {
    room?: RoomWithMembers;
    roomId: string;
    /** Данные собеседника для DM чатов */
    peerUser?: PeerUser | null;
    onEndSession?: () => void;
    ending?: boolean;
}

/**
 * Шапка комнаты чата.
 * Для DM показывает имя и аватар собеседника.
 * Клик на имя/аватар ведёт на профиль контакта.
 */
export function RoomHeader({
    room,
    peerUser,
    onEndSession,
    ending,
}: RoomHeaderProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    const { user } = useAuthStore();

    const handleBack = () => {
        router.navigate({ to: '/chat' });
    };

    /**
     * Клик на шапку — переход на профиль контакта (для DM).
     * TODO: Создать роут /contacts/$contactId для просмотра профиля
     */
    const handleInfoClick = () => {
        if (peerUser?.id) {
            // TODO: navigate({ to: '/contacts/$contactId', params: { contactId: peerUser.id } });
            console.log('Navigate to contact profile:', peerUser.id);
        } else {
            // Для групп можно открыть информацию о комнате
            console.log('Room info clicked');
        }
    };

    // Определяем имя и аватар для отображения
    const isDM = room?.type === 'direct';
    const isGroup = room?.type === 'group';

    // Если DM и нет peerUser, но есть room_members, пытаемся найти peer там
    let resolvedPeer = peerUser;
    if (isDM && !resolvedPeer && room?.room_members && user) {
        const otherMember = room.room_members.find(
            (m) => m.user_id !== user.id,
        );
        if (otherMember?.profiles) {
            resolvedPeer = {
                id: otherMember.user_id,
                display_name: otherMember.profiles.display_name,
                username: otherMember.profiles.username,
                avatar_url: otherMember.profiles.avatar_url || undefined,
            };
        }
    }

    const isSelfChat =
        isDM &&
        room?.room_members?.length === 1 &&
        room.room_members[0].user_id === user?.id;

    const displayName = isSelfChat
        ? t('chat.favorites', 'Избранное')
        : isDM && resolvedPeer
          ? resolvedPeer.display_name
          : room?.name || t('chat.unknownRoom', 'Чат');

    const avatarFallback = isSelfChat
        ? '⭐'
        : displayName?.[0]?.toUpperCase() || '?';
    const avatarUrl = isDM ? resolvedPeer?.avatar_url : undefined;

    // Генерируем строку участников для групп
    const memberNames =
        isGroup && room?.room_members
            ? room.room_members
                  .map((m) => m.profiles?.display_name)
                  .filter(Boolean)
                  .join(', ')
            : '';

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
                        src={avatarUrl}
                        fallback={avatarFallback}
                        radius="full"
                        size="2"
                        color="gray"
                    />
                    <Flex direction="column" gap="0">
                        <Heading size="3" truncate>
                            {room?.is_ephemeral ? '🔒 ' : ''}
                            {displayName}
                        </Heading>
                        {isDM && resolvedPeer?.username && (
                            <Text size="1" color="gray" truncate>
                                @{resolvedPeer.username}
                            </Text>
                        )}
                        {isGroup && memberNames && (
                            <Text
                                size="1"
                                color="gray"
                                truncate
                                className={styles.membersList}
                            >
                                {memberNames}
                            </Text>
                        )}
                    </Flex>
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
