import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { ProfileForm } from "@/features/profile";
import { useAuthStore } from "@/stores/auth";
import styles from "./profilesettings.module.css";

/**
 * Фича редактирования профиля.
 * Позволяет менять Display Name, Аватар и (в будущем) Bio.
 */
export function ProfileSettings() {
    const user = useAuthStore((state) => state.profile);
    const { t } = useTranslation();

    if (!user) {
        return null;
    }

    return (
        <Box className={styles.container}>
            <Flex direction="column" gap="4" px="4" py="4">
                <Flex direction="column" gap="1" mb="2">
                    <Text size="lg" weight="bold">
                        {user.display_name || user.username}
                    </Text>
                    {user.username && (
                        <Text size="sm" intent="secondary">
                            {`@${user.username}`}
                        </Text>
                    )}
                </Flex>
                <Card className={styles.card}>
                    <Flex direction="column" gap="4">
                        <Text size="sm" intent="secondary" weight="medium">
                            {t(
                                "settings.profile.publicInfo",
                                "Публичная информация",
                            )}
                        </Text>
                        <ProfileForm />
                    </Flex>
                </Card>
            </Flex>
        </Box>
    );
}
