import { UserPlus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "./contactspage.module.css";

/**
 * Страница контактов.
 * Заглушка для будущей реализации списка контактов.
 */
export function ContactsPage() {
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
                <Users size={ICON_SIZE["2xl"]} />
            </Box>

            {/* Нативный h2 вместо Radix Heading */}
            <h2 className={styles.title}>{t("contacts.title", "Контакты")}</h2>

            {/* Нативный p вместо Radix Text */}
            <p className={styles.description}>
                {t(
                    "contacts.emptyDescription",
                    "Здесь будут отображаться ваши контакты. Добавьте друзей, чтобы начать общение.",
                )}
            </p>

            <Button variant="soft" size="3" className={styles.addButton}>
                <UserPlus size={ICON_SIZE.sm} />
                {t("contacts.addContact", "Добавить контакт")}
            </Button>
        </Flex>
    );
}
