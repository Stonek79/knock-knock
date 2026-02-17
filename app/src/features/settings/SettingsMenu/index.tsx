import { Box, Card, Flex, Text } from "@radix-ui/themes";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SETTINGS_ITEMS } from "@/config/settings";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";
import styles from "./settingsmenu.module.css";

/**
 * Меню настроек (для мобильной версии и главной страницы настроек).
 */
export function SettingsMenu() {
    const { t } = useTranslation();

    return (
        <Box className={styles.mobileContainer}>
            <Flex direction="column" gap="2" px="4">
                {SETTINGS_ITEMS.map((item) => {
                    const Icon = item.icon;
                    // Формируем имя класса, например iconBlue, iconViolet
                    const colorClass =
                        styles[
                            `icon${item.color.charAt(0).toUpperCase() + item.color.slice(1)}`
                        ];

                    return (
                        <Link
                            key={item.key}
                            to={item.path}
                            className={styles.mobileItemLink}
                        >
                            <Card className={styles.mobileItem}>
                                <Flex justify="between" align="center">
                                    <Flex align="center" gap="3">
                                        <Box
                                            className={clsx(
                                                styles.iconBox,
                                                colorClass,
                                            )}
                                        >
                                            <Icon size={20} />
                                        </Box>
                                        <Text size="3" weight="medium">
                                            {t(
                                                item.labelKey,
                                                item.defaultLabel,
                                            )}
                                        </Text>
                                    </Flex>
                                    <ChevronRight color="gray" size={20} />
                                </Flex>
                            </Card>
                        </Link>
                    );
                })}

                {/* Admin Link */}
                <AdminSettingsItem />
            </Flex>
        </Box>
    );
}

function AdminSettingsItem() {
    const { profile } = useAuthStore();
    const { t } = useTranslation();

    if (profile?.role !== "admin") {
        return null;
    }

    return (
        <Link to={ROUTES.ADMIN} className={styles.mobileItemLink}>
            <Card className={clsx(styles.mobileItem, styles.adminCard)}>
                <Flex justify="between" align="center">
                    <Flex align="center" gap="3">
                        <Box
                            className={clsx(
                                styles.iconBox,
                                styles.adminIconBox,
                            )}
                        >
                            <ShieldAlert size={20} />
                        </Box>
                        <Text size="3" weight="medium">
                            {t("nav.admin", "Admin Panel")}
                        </Text>
                    </Flex>
                    <ChevronRight color="gray" size={20} />
                </Flex>
            </Card>
        </Link>
    );
}
