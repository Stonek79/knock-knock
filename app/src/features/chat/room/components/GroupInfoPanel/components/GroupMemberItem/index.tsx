import { Shield, ShieldAlert, UserMinus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import { MEMBER_ROLE } from "@/lib/constants";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import type { GroupMember } from "../../types";
import styles from "./groupmemberitem.module.css";

interface GroupMemberItemProps {
    /** Данные участника */
    member: GroupMember;
    /** ID текущего авторизованного пользователя */
    myUserId: string | undefined;
    /** Является ли текущий пользователь администратором */
    isAdmin: boolean;
    /** Онлайн ли участник */
    isOnline: boolean;
    /** Сменить роль участника */
    onUpdateRole: (userId: string, currentRole: string) => void;
    /** Исключить участника из группы */
    onRemove: (userId: string) => void;
}

/**
 * Карточка одного участника группы.
 * Отображает аватар, имя, статус онлайн, роль и кнопки управления (для администратора).
 */
export function GroupMemberItem({
    member,
    myUserId,
    isAdmin,
    isOnline,
    onUpdateRole,
    onRemove,
}: GroupMemberItemProps) {
    const { t } = useTranslation();

    const isMe = member.user_id === myUserId;
    const displayName =
        member.profiles?.username ||
        member.profiles?.display_name ||
        t("common.unknownUser", "Пользователь");
    const nameLabel = isMe ? t("chat.you", "Вы") : displayName;

    return (
        <Flex align="center" justify="between" className={styles.memberItem}>
            {/* Аватар + имя + статус */}
            <Flex align="center" gap="3" className={styles.memberInfo}>
                <Avatar
                    size="sm"
                    name={displayName}
                    src={member.profiles?.avatar_url || undefined}
                />
                <Box>
                    <Text
                        weight="medium"
                        truncate
                        className={styles.memberName}
                    >
                        {nameLabel}
                    </Text>
                    <Text
                        size="sm"
                        intent={isOnline ? "success" : "neutral"}
                        className={styles.memberStatus}
                    >
                        {isOnline
                            ? t("chat.online", "в сети")
                            : t("chat.offline", "не в сети")}
                    </Text>
                </Box>
            </Flex>

            {/* Роль + кнопки управления */}
            <Flex align="center" gap="1" className={styles.memberActions}>
                <Badge
                    variant="outline"
                    intent={
                        member.role === MEMBER_ROLE.ADMIN
                            ? "primary"
                            : "neutral"
                    }
                    className={styles.roleBadge}
                >
                    {member.role === MEMBER_ROLE.ADMIN
                        ? t("chat.group.roleAdmin", "Админ")
                        : t("chat.group.roleMember", "Участник")}
                </Badge>

                {/* Кнопки редактирования — только администратору и только для других */}
                {isAdmin && !isMe && (
                    <>
                        <IconButton
                            variant="ghost"
                            intent="neutral"
                            size="sm"
                            onClick={() =>
                                onUpdateRole(member.user_id, member.role)
                            }
                            title={t("chat.group.changeRole", "Изменить роль")}
                        >
                            {member.role === MEMBER_ROLE.ADMIN ? (
                                <ShieldAlert size={ICON_SIZE.xs} />
                            ) : (
                                <Shield size={ICON_SIZE.xs} />
                            )}
                        </IconButton>
                        <IconButton
                            variant="ghost"
                            intent="danger"
                            size="sm"
                            onClick={() => onRemove(member.user_id)}
                            title={t(
                                "chat.group.removeMember",
                                "Удалить участника",
                            )}
                        >
                            <UserMinus size={ICON_SIZE.xs} />
                        </IconButton>
                    </>
                )}
            </Flex>
        </Flex>
    );
}
