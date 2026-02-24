import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { ProfileForm } from "@/features/settings/ProfileForm";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";
import styles from "./accountsettings.module.css";

/**
 * Страница настроек аккаунта.
 */
export function AccountSettings() {
    const { t } = useTranslation();
    const { user, signOut } = useAuthStore();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate({ to: ROUTES.LOGIN });
    };

    if (!user) {
        return null;
    }

    return (
        <Flex direction="column" gap="4">
            <Flex direction="column" gap="4" px="4" pb="4" pt="4">
                <Card className={styles.signOutCard}>
                    <Flex justify="between" align="center">
                        <Text size="md" intent="secondary">
                            {t("common.email")}: {user.email}
                        </Text>
                        <Button
                            variant="outline"
                            size="md"
                            onClick={handleSignOut}
                        >
                            {t("common.signOut")}
                        </Button>
                    </Flex>
                </Card>

                <ProfileForm />
            </Flex>
        </Flex>
    );
}
