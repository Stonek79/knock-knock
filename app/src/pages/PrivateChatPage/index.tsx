import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { Lock, UserSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import styles from "./privatechatpage.module.css";

/**
 * Страница приватного (эфемерного) чата.
 * Позволяет выбрать контакт для одноразового чата.
 * Все сообщения удаляются после закрытия чата.
 */
export function PrivateChatPage() {
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
                <Lock size={40} />
            </Box>

            <Heading size="5" weight="bold" className={styles.title}>
                {t("private.title", "Приватный чат")}
            </Heading>

            <Text size="3" className={styles.description}>
                {t(
                    "private.description",
                    "Начните защищённый разговор. Выберите контакт, чтобы отправить приватное сообщение.",
                )}
            </Text>

            <Box className={styles.warning}>
                ⚠️{" "}
                {t(
                    "private.warning",
                    "Все сообщения будут удалены после закрытия чата. История не сохраняется.",
                )}
            </Box>

            <Button variant="soft" size="3" className={styles.selectButton}>
                <UserSearch size={18} />
                {t("private.selectContact", "Выбрать контакт")}
            </Button>
        </Flex>
    );
}
