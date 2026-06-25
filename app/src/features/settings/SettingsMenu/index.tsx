import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { SETTINGS_ITEMS } from "@/config/settings";
import { useAuthStore } from "@/stores/auth";
import styles from "./settingsmenu.module.css";

/**
 * Меню настроек (для мобильной версии и главной страницы настроек).
 */
export function SettingsMenu() {
    const { t } = useTranslation();
    const pbUser = useAuthStore((state) => state.pbUser);
    const isAdmin = pbUser?.role === "admin";

    return (
        <Box className={styles.mobileContainer}>
            <Flex direction="column" gap="2" px="4">
                {SETTINGS_ITEMS.filter(
                    (item) => !item.adminOnly || isAdmin,
                ).map((item) => {
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.key}
                            to={item.path}
                            className={styles.mobileItemLink}
                        >
                            <Card className={styles.mobileItem}>
                                <Flex justify="between" align="center">
                                    <Flex align="center" gap="3">
                                        <Box className={styles.iconBox}>
                                            <Icon
                                                style={{ color: item.color }}
                                            />
                                        </Box>
                                        <Text size="lg" weight="medium">
                                            {t(
                                                item.labelKey,
                                                item.defaultLabel,
                                            )}
                                        </Text>
                                    </Flex>
                                    <ChevronRight
                                        color="gray"
                                        className={styles.icon}
                                    />
                                </Flex>
                            </Card>
                        </Link>
                    );
                })}
            </Flex>
        </Box>
    );
}
