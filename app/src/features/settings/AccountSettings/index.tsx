import { Button, Card, Flex, Text } from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ProfileForm } from "@/features/profile/ProfileForm";
import { SettingsHeader } from "@/features/settings/SettingsHeader";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";
import styles from "./accountsettings.module.css";

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
            <SettingsHeader title="Аккаунт" titleKey="settings.account" />
            <Flex direction="column" gap="4" px="4" pb="4">
                <Card className={styles.signOutCard}>
                    <Flex justify="between" align="center">
                        <Text>
                            {t("common.email")}: {user.email}
                        </Text>
                        <Button
                            variant="soft"
                            color="red"
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
