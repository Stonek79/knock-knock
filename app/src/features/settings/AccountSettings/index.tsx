import { useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldAlert, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { ROUTES } from "@/lib/constants";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { useAuthStore } from "@/stores/auth";
import styles from "./accountsettings.module.css";

/**
 * Страница настроек аккаунта.
 * Фокусируется на Email, пароле и управлении доступом.
 */
export function AccountSettings() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const pbUser = useAuthStore((state) => state.pbUser);
    const signOut = useAuthStore((state) => state.signOut);

    const handleSignOut = async () => {
        await signOut();
        navigate({ to: ROUTES.LOGIN });
    };

    if (!pbUser) {
        return null;
    }

    return (
        <Box className={styles.container}>
            <Flex direction="column" gap="4" px="4" py="4">
                {/* Информация об Email и верификации */}
                <Card className={styles.card}>
                    <Flex direction="column" gap="3">
                        <Text size="sm" intent="secondary" weight="medium">
                            {t("settings.account.identity", "Идентификация")}
                        </Text>
                        <Flex justify="between" align="center">
                            <Flex direction="column" gap="1">
                                <Text weight="medium">{pbUser.email}</Text>
                                <Text
                                    size="sm"
                                    intent={
                                        pbUser.verified ? "success" : "warning"
                                    }
                                >
                                    {pbUser.verified
                                        ? t("auth.verified", "Подтвержден")
                                        : t(
                                              "auth.unverified",
                                              "Не подтвержден",
                                          )}
                                </Text>
                            </Flex>
                        </Flex>
                    </Flex>
                </Card>

                {/* Безопасность */}
                <Card className={styles.card}>
                    <Flex direction="column" gap="3">
                        <Text size="sm" intent="secondary" weight="medium">
                            {t("settings.account.security", "Безопасность")}
                        </Text>
                        <Button
                            variant="soft"
                            size="md"
                            className={styles.actionButton}
                        >
                            <ShieldAlert size={ICON_SIZE.sm} />
                            {t(
                                "settings.account.changePassword",
                                "Изменить пароль",
                            )}
                        </Button>
                    </Flex>
                </Card>

                {/* Управление и Опасная зона */}
                <Card className={styles.dangerCard}>
                    <Flex direction="column" gap="3">
                        <Text size="sm" intent="danger" weight="medium">
                            {t("settings.account.dangerZone", "Опасная зона")}
                        </Text>
                        <Flex direction="column" gap="2">
                            <Button
                                variant="ghost"
                                intent="neutral"
                                onClick={handleSignOut}
                                className={styles.actionButton}
                            >
                                <LogOut size={ICON_SIZE.sm} />
                                {t("common.signOut", "Выйти")}
                            </Button>
                            <Button
                                variant="ghost"
                                intent="danger"
                                className={styles.actionButton}
                                onClick={() =>
                                    console.log("Account deletion requested")
                                }
                            >
                                <Trash2 size={ICON_SIZE.sm} />
                                {t(
                                    "settings.account.deleteAccount",
                                    "Удалить аккаунт",
                                )}
                            </Button>
                        </Flex>
                    </Flex>
                </Card>
            </Flex>
        </Box>
    );
}
