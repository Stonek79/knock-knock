import { PhoneIncoming, PhoneOff, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { ICON_SIZE } from "@/lib/constants";
import { useCallStore } from "../../store";
import { parseCallError } from "../../utils";
import styles from "./IncomingCallAlert.module.css";

/**
 * Компонент окна входящего звонка.
 * Использует кастомные UI-компоненты (Dialog, Card, Avatar, Badge, Button)
 * и семантические элементы (header, footer, figure, span) без единого тэга div.
 */
export function IncomingCallAlert() {
    const { t } = useTranslation();
    const { isIncoming, acceptCall, rejectCall } = useCallStore();
    const toast = useToast();

    if (!isIncoming) {
        return null;
    }

    const handleOpen = (open: boolean) => {
        if (!open) {
            rejectCall();
        }
    };

    const handleAccept = async () => {
        try {
            await acceptCall();
        } catch (e: unknown) {
            const message = parseCallError(e, t);
            toast({
                title: t("calls.error", "Ошибка звонка"),
                description: message,
                variant: "error",
            });
        }
    };

    return (
        <Dialog.Root open={isIncoming} onOpenChange={handleOpen}>
            <Dialog.Portal>
                <Dialog.Overlay />
                <Dialog.Content
                    hideCloseButton
                    className={styles.incomingCallContent}
                >
                    <Card variant="glass" className={styles.alertContent}>
                        <figure className={styles.avatarContainer}>
                            <span
                                className={styles.avatarPulse}
                                aria-hidden="true"
                            />
                            <Avatar
                                size="xxl"
                                fallback="🕵️‍♂️"
                                className={styles.incognitoAvatar}
                            />
                        </figure>

                        <Badge
                            intent="primary"
                            variant="soft"
                            className={styles.e2eeBadge}
                        >
                            <ShieldCheck size={ICON_SIZE.sm} />
                            {t("calls.e2ee_label", "Зашифрованный E2EE-звонок")}
                        </Badge>

                        <header className={styles.alertHeader}>
                            <Dialog.Title asChild>
                                <Heading
                                    as="h2"
                                    size="xl"
                                    className={styles.alertTitle}
                                >
                                    {t(
                                        "calls.incoming_title",
                                        "Входящий звонок",
                                    )}
                                </Heading>
                            </Dialog.Title>
                            <Dialog.Description asChild>
                                <Text
                                    as="p"
                                    intent="neutral"
                                    size="lg"
                                    className={styles.alertSubtitle}
                                >
                                    {t(
                                        "calls.incoming_subtitle",
                                        "Приватный собеседник...",
                                    )}
                                </Text>
                            </Dialog.Description>
                        </header>

                        <footer className={styles.alertActions}>
                            <Button
                                size="lg"
                                intent="success"
                                variant="solid"
                                onClick={handleAccept}
                                className={`${styles.actionButton} ${styles.acceptButton}`}
                                aria-label={t("calls.accept", "Принять")}
                            >
                                <PhoneIncoming size={ICON_SIZE.lg} />
                                {t("calls.accept", "Принять")}
                            </Button>

                            <Button
                                size="lg"
                                intent="danger"
                                variant="solid"
                                onClick={rejectCall}
                                className={`${styles.actionButton} ${styles.rejectButton}`}
                                aria-label={t("calls.reject", "Отклонить")}
                            >
                                <PhoneOff size={ICON_SIZE.lg} />
                                {t("calls.reject", "Отклонить")}
                            </Button>
                        </footer>
                    </Card>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
