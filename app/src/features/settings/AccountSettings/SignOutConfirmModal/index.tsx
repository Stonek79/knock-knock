import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import styles from "./sign-out.module.css";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

/**
 * Компонент подтверждения выхода из аккаунта.
 * Запрашивает подтверждение перед очисткой локальных ключей и сессии.
 */
export function SignOutConfirmModal({ isOpen, onClose, onConfirm }: Props) {
    const { t } = useTranslation();

    return (
        <AlertDialog.Root open={isOpen} onOpenChange={onClose}>
            <AlertDialog.Content className={styles.modalContent}>
                <AlertDialog.Title asChild>
                    <Text size="xl" weight="bold" className={styles.title}>
                        {t(
                            "settings.account.signOutTitle",
                            "Выход из аккаунта",
                        )}
                    </Text>
                </AlertDialog.Title>
                <AlertDialog.Description asChild>
                    <div className={styles.descriptionBox}>
                        <Text intent="warning" size="sm">
                            {t(
                                "settings.account.signOutWarning",
                                "Вы уверены, что хотите выйти из аккаунта? На этом устройстве будут стерты сессионные ключи шифрования, и вам потребуется войти заново.",
                            )}
                        </Text>
                    </div>
                </AlertDialog.Description>
                <Flex justify="end" gap="3" mt="6">
                    <AlertDialog.Cancel asChild>
                        <Button variant="ghost" onClick={onClose}>
                            {t("common.cancel")}
                        </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action asChild>
                        <Button
                            intent="warning"
                            variant="solid"
                            onClick={onConfirm}
                        >
                            {t("common.signOut")}
                        </Button>
                    </AlertDialog.Action>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
}
