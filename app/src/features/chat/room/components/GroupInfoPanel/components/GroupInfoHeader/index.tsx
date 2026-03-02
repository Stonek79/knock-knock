import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import styles from "./groupinfoheader.module.css";

interface GroupInfoHeaderProps {
    /** Название группы */
    name: string | null;
    /** URL аватара группы */
    avatarUrl: string | null;
    /** Количество участников */
    membersCount: number;
    /** Количество участников онлайн */
    onlineCount: number;
}

/**
 * Секция с информацией о группе: аватар, название, счётчик участников и онлайн.
 */
export function GroupInfoHeader({
    name,
    avatarUrl,
    membersCount,
    onlineCount,
}: GroupInfoHeaderProps) {
    const { t } = useTranslation();

    const displayName = name || t("chat.group.unnamed", "Группа");

    const onlineText =
        onlineCount > 0
            ? ` • ${onlineCount} ${t("chat.group.onlineCount", "в сети")}`
            : "";

    return (
        <Flex direction="column" align="center" className={styles.groupInfo}>
            <Avatar size="xl" name={displayName} src={avatarUrl || undefined} />
            <Text size="xl" weight="semibold" className={styles.groupName}>
                {displayName}
            </Text>
            <Text size="sm" intent="neutral" className={styles.groupMeta}>
                {membersCount} {t("chat.group.membersCount", "участников")}
                {onlineText}
            </Text>
        </Flex>
    );
}
