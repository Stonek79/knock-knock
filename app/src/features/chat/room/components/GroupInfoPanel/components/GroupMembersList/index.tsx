import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import type { ExpandedRoomMember } from "@/lib/types";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { GroupMemberItem } from "../GroupMemberItem";
import styles from "./groupmemberslist.module.css";

interface GroupMembersListProps {
    /** Список участников */
    members: ExpandedRoomMember[];
    /** ID текущего авторизованного пользователя */
    myUserId: string | undefined;
    /** Является ли текущий пользователь администратором */
    isAdmin: boolean;
    /** Карта статусов онлайн по user_id */
    onlineStatusMap: Record<string, boolean>;
    /** Добавить участника */
    onAddMember: () => void;
    /** Сменить роль участника */
    onUpdateRole: (userId: string, currentRole: string) => void;
    /** Удалить участника */
    onRemove: (userId: string) => void;
}

/**
 * Секция со списком участников группы.
 * Включает заголовок с кнопкой добавления (для администраторов) и карточки участников.
 */
export function GroupMembersList({
    members,
    myUserId,
    isAdmin,
    onlineStatusMap,
    onAddMember,
    onUpdateRole,
    onRemove,
}: GroupMembersListProps) {
    const { t } = useTranslation();

    return (
        <>
            {/* Заголовок секции */}
            <Flex
                justify="between"
                align="center"
                className={styles.sectionTitle}
            >
                <Text size="sm" weight="medium" intent="neutral">
                    {t("chat.group.membersList", "Участники")}
                </Text>
                {isAdmin && (
                    <IconButton
                        variant="ghost"
                        intent="primary"
                        size="sm"
                        onClick={onAddMember}
                        title={t("chat.group.addMember", "Добавить участника")}
                    >
                        <UserPlus size={ICON_SIZE.sm} />
                    </IconButton>
                )}
            </Flex>

            {/* Карточки участников */}
            <Flex direction="column" className={styles.memberList}>
                {members.map((member) => (
                    <GroupMemberItem
                        key={member.user_id}
                        member={member}
                        myUserId={myUserId}
                        isAdmin={isAdmin}
                        isOnline={Boolean(onlineStatusMap[member.user_id])}
                        onUpdateRole={onUpdateRole}
                        onRemove={onRemove}
                    />
                ))}
            </Flex>
        </>
    );
}
