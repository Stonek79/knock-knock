import { Phone, PhoneCall } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { ICON_SIZE } from "@/lib/constants";
import styles from "./CallsPage.module.css";

/**
 * Главная страница раздела звонков.
 * Отображает состояние и историю голосовых и видеозвонков.
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

            <Heading as="h2" size="xl" className={styles.title}>
                {t("calls.title", "Звонки")}
            </Heading>

            <Text
                as="p"
                intent="neutral"
                size="md"
                className={styles.description}
            >
                {t(
                    "calls.emptyDescription",
                    "Здесь будет отображаться история ваших голосовых и видеозвонков.",
                )}
            </Text>

            <Button
                intent="primary"
                variant="solid"
                size="md"
                className={styles.actionButton}
            >
                <PhoneCall size={ICON_SIZE.sm} />
                {t("calls.startCall", "Начать звонок")}
            </Button>
        </Flex>
    );
}
