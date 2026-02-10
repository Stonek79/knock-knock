import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { Phone, PhoneCall } from "lucide-react";
import { useTranslation } from "react-i18next";
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
                <Phone size={40} />
            </Box>

            <Heading size="5" weight="bold" className={styles.title}>
                {t("calls.title", "Звонки")}
            </Heading>

            <Text size="3" className={styles.description}>
                {t(
                    "calls.emptyDescription",
                    "Здесь будет отображаться история ваших голосовых и видеозвонков.",
                )}
            </Text>

            <Box className={styles.actionButton}>
                <PhoneCall size={20} />
                {t("calls.startCall", "Начать звонок")}
            </Box>
        </Flex>
    );
}
