import { Phone, PhoneCall } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "./callspage.module.css";

/**
 * Страница звонков.
 * Заглушка для будущей реализации истории звонков.
 */
export function CallsPage() {
    const { t } = useTranslation();

    return (
        <Flex
            direction="column"
            align="center"
            justify="center"
            flexGrow="1"
            p="6"
            gap="4"
            className={styles.container}
        >
            <Box className={styles.iconBox}>
                <Phone size={ICON_SIZE.xl} />
            </Box>

            <h2 className={styles.title}>{t("calls.title", "Звонки")}</h2>

            <p className={styles.description}>
                {t(
                    "calls.emptyDescription",
                    "Здесь будет отображаться история ваших голосовых и видеозвонков.",
                )}
            </p>

            <Box className={styles.actionButton}>
                <PhoneCall size={ICON_SIZE.sm} />
                {t("calls.startCall", "Начать звонок")}
            </Box>
        </Flex>
    );
}
