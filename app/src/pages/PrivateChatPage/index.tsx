import { Lock, UserSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { ICON_SIZE } from "@/lib/utils/iconSize";
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
                <Lock size={ICON_SIZE["2xl"]} />
            </Box>

            {/* Нативный h2 вместо Radix Heading */}
            <h2 className={styles.title}>
                {t("private.title", "Приватный чат")}
            </h2>

            {/* Нативный p вместо Radix Text */}
            <p className={styles.description}>
                {t(
                    "private.description",
                    "Начните защищённый разговор. Выберите контакт, чтобы отправить приватное сообщение.",
                )}
            </p>

            <Box className={styles.warning}>
                ⚠️{" "}
                {t(
                    "private.warning",
                    "Все сообщения будут удалены после закрытия чата. История не сохраняется.",
                )}
            </Box>

            <Button variant="soft" size="3" className={styles.selectButton}>
                <UserSearch size={ICON_SIZE.sm} />
                {t("private.selectContact", "Выбрать контакт")}
            </Button>
        </Flex>
    );
}
