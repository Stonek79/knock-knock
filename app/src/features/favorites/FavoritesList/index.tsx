import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./favoriteslist.module.css";

export function FavoritesList() {
    const { t } = useTranslation();

    return (
        <Box className={styles.container}>
            <Flex align="center" gap="2" className={styles.header}>
                <Star className={styles.icon} />
                <Heading size="4">{t("favorites.title", "Избранное")}</Heading>
            </Flex>
            <Box p="4">
                <Text color="gray" size="2">
                    {t("favorites.empty", "Список избранного пуст")}
                </Text>
            </Box>
        </Box>
    );
}
