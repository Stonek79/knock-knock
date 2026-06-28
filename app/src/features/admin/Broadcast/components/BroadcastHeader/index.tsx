import { Megaphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { COMPONENT_INTENT, ICON_SIZE } from "@/lib/constants";
import styles from "./broadcast-header.module.css";

/**
 * Компонент шапки для страницы рассылок.
 * Содержит иконку, заголовок и описание функционала.
 */
export function BroadcastHeader() {
    const { t } = useTranslation();

    return (
        <Flex align="center" gap="3" className={styles.header}>
            <Megaphone size={ICON_SIZE.xl} className={styles.icon} />
            <Flex direction="column">
                <Heading size="md">{t("settings.broadcast.title")}</Heading>
                <Text size="sm" intent={COMPONENT_INTENT.SECONDARY}>
                    {t("settings.broadcast.description")}
                </Text>
            </Flex>
        </Flex>
    );
}
