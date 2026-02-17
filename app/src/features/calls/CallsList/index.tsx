import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./callslist.module.css";

export function CallsList() {
    const { t } = useTranslation();

    return (
        <Box>
            <Flex align="center" gap="2" className={styles.header}>
                <Phone className={styles.icon} />
                <Heading size="4">{t("calls.title", "Звонки")}</Heading>
            </Flex>
            <Box p="4">
                <Text color="gray" size="2">
                    {t("calls.empty", "История звонков пуста")}
                </Text>
            </Box>
        </Box>
    );
}
