import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Text } from "@/components/ui/Text";
import { authRepository } from "@/lib/repositories/auth.repository";
import styles from "./delete-account.module.css";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function DeleteAccountModal({ isOpen, onClose, onSuccess }: Props) {
    const { t } = useTranslation();
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        const result = await authRepository.deleteAccount(password);
        setLoading(false);
        if (result.isOk()) {
            onSuccess();
        } else {
            setError(result.error.message);
        }
    };

    return (
        <AlertDialog.Root open={isOpen} onOpenChange={onClose}>
            <AlertDialog.Content className={styles.modalContent}>
                <AlertDialog.Title asChild>
                    <Text size="xl" weight="bold" className={styles.title}>
                        {t("settings.account.deleteAccount")}
                    </Text>
                </AlertDialog.Title>
                {/* Добавляем Description для доступности и премиального вида */}
                <AlertDialog.Description asChild>
                    <div className={styles.descriptionBox}>
                        <Text intent="danger" size="sm">
                            {t("settings.account.deleteWarning")}
                        </Text>
                    </div>
                </AlertDialog.Description>
                <Flex direction="column" gap="4" mt="4">
                    <Flex direction="column" gap="2">
                        <Text size="xs" intent="secondary">
                            {t("settings.account.enterPasswordToDelete")}
                        </Text>
                        <PasswordInput
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError("");
                            }}
                            className={styles.passwordInput}
                        />
                        {error && (
                            <Text size="xs" intent="danger">
                                {error}
                            </Text>
                        )}
                    </Flex>
                    <Flex justify="end" gap="3" mt="2">
                        <AlertDialog.Cancel asChild>
                            <Button variant="ghost" onClick={onClose}>
                                {t("common.cancel")}
                            </Button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action asChild>
                            <Button
                                intent="danger"
                                variant="solid"
                                onClick={handleDelete}
                                disabled={loading || !password}
                            >
                                {loading
                                    ? t("common.deleting")
                                    : t("common.delete")}
                            </Button>
                        </AlertDialog.Action>
                    </Flex>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
}
