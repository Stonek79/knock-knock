import {
    Avatar,
    Badge,
    Button,
    Dialog,
    Flex,
    ScrollArea,
    Text,
    TextField,
} from '@radix-ui/themes';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Search, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatService } from '@/lib/services/chat';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import styles from './new-chat-dialog.module.css';

interface UserProfile {
    id: string;
    username: string | null;
    display_name: string | null;
    public_key_x25519: string | null;
}

/**
 * Компонент создания нового чата.
 * Использует TanStack Query для поиска и Mutations для создания.
 */
export function NewChatDialog({ trigger }: { trigger: React.ReactNode }) {
    const { t } = useTranslation();
    const { user: currentUser } = useAuthStore();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isEphemeral, setIsEphemeral] = useState(false);

    // Дебаунс поиска (300мс)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    /**
     * Запрос на поиск пользователей.
     */
    const { data: results = [], isLoading: loading } = useQuery({
        queryKey: ['user-search', debouncedSearch],
        queryFn: async (): Promise<UserProfile[]> => {
            if (debouncedSearch.length < 3) return [];

            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, display_name, public_key_x25519')
                .or(
                    `username.ilike.%${debouncedSearch}%,display_name.ilike.%${debouncedSearch}%`,
                )
                .neq('id', currentUser?.id)
                .limit(10);

            if (error) throw error;
            return data as UserProfile[];
        },
        enabled: debouncedSearch.length >= 3,
    });

    /**
     * Мутация для создания комнаты.
     */
    const createRoomMutation = useMutation({
        mutationFn: async (peer: UserProfile) => {
            if (!currentUser || !peer.public_key_x25519) return;
            return await ChatService.createRoom(
                peer.display_name || peer.username || 'Direct Chat',
                'direct',
                currentUser.id,
                [peer.id],
                isEphemeral,
            );
        },
        onSuccess: (data) => {
            if (data) {
                navigate({
                    to: '/chat/$roomId',
                    params: { roomId: data.roomId },
                });
            }
        },
        onError: (error) => {
            console.error('Failed to create room', error);
        },
    });

    const creating = createRoomMutation.isPending;

    const startChat = (peer: UserProfile) => {
        if (!currentUser || !peer.public_key_x25519 || creating) return;
        createRoomMutation.mutate(peer);
    };

    return (
        <Dialog.Root>
            <Dialog.Trigger>{trigger}</Dialog.Trigger>

            <Dialog.Content className={styles.dialogContent}>
                <Dialog.Title>{t('chat.newChat', 'Новый чат')}</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    {t(
                        'chat.searchDescribe',
                        'Найдите пользователя по имени или username.',
                    )}
                </Dialog.Description>

                <Flex direction="column" gap="3">
                    <TextField.Root
                        placeholder={t('common.search', 'Поиск...')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={styles.searchField}
                    >
                        <TextField.Slot>
                            <Search size={16} />
                        </TextField.Slot>
                    </TextField.Root>

                    <ScrollArea
                        scrollbars="vertical"
                        className={styles.scrollArea}
                    >
                        <Flex direction="column" gap="1">
                            {loading && (
                                <Text className={styles.loadingText}>
                                    {t('common.loading')}
                                </Text>
                            )}
                            {!loading &&
                                results.length === 0 &&
                                search.length >= 3 && (
                                    <Text className={styles.noFoundText}>
                                        {t(
                                            'chat.noUsersFound',
                                            'Пользователи не найдены',
                                        )}
                                    </Text>
                                )}
                            {results.map((profile) => (
                                <Flex
                                    key={profile.id}
                                    className={`${styles.userItem} ${
                                        profile.public_key_x25519
                                            ? styles.userItemEncrypted
                                            : styles.userItemNotEncrypted
                                    }`}
                                    onClick={() =>
                                        profile.public_key_x25519 &&
                                        !creating &&
                                        startChat(profile)
                                    }
                                >
                                    <Flex align="center" gap="3">
                                        <Avatar
                                            size="2"
                                            fallback={
                                                (profile.display_name ||
                                                    profile.username ||
                                                    '?')[0]
                                            }
                                            radius="full"
                                            color={
                                                profile.public_key_x25519
                                                    ? 'blue'
                                                    : 'gray'
                                            }
                                        />
                                        <div className={styles.userInfo}>
                                            <Text size="2" weight="bold">
                                                {profile.display_name ||
                                                    profile.username ||
                                                    'Anonymous'}
                                            </Text>
                                            <div
                                                className={
                                                    styles.userNameContainer
                                                }
                                            >
                                                {profile.username && (
                                                    <Text size="1" color="gray">
                                                        @{profile.username}
                                                    </Text>
                                                )}
                                                {!profile.public_key_x25519 && (
                                                    <Badge
                                                        color="orange"
                                                        size="1"
                                                        variant="soft"
                                                    >
                                                        {t(
                                                            'chat.noEncryption',
                                                            'Без шифрования',
                                                        )}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </Flex>
                                    {profile.public_key_x25519 && (
                                        <Button
                                            size="1"
                                            variant="ghost"
                                            disabled={creating}
                                        >
                                            <UserPlus size={16} />
                                        </Button>
                                    )}
                                </Flex>
                            ))}
                        </Flex>
                    </ScrollArea>
                    <Flex align="center" gap="2" py="2">
                        <Text size="2">
                            {t(
                                'chat.privateSession',
                                'Приватная сессия (без истории)',
                            )}
                        </Text>
                        <Dialog.Root>
                            {/* Using a simple checkbox or switch if available in themes */}
                        </Dialog.Root>
                        <input
                            type="checkbox"
                            checked={isEphemeral}
                            onChange={(e) => setIsEphemeral(e.target.checked)}
                        />
                    </Flex>
                </Flex>

                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">
                            {t('common.cancel')}
                        </Button>
                    </Dialog.Close>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
