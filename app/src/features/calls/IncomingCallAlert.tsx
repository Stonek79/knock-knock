import { PhoneIncoming, PhoneOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { ICON_SIZE } from "@/lib/constants";
import styles from "./CallRoom.module.css";
import { useCallStore } from "./store";
import { parseCallError } from "./utils";

/**
 * Компонент окна входящего звонка.
 * Появляется при поступлении нового звонка и позволяет принять или отклонить его.
 */
export function IncomingCallAlert() {
    const { t } = useTranslation();
    const { isIncoming, acceptCall, rejectCall } = useCallStore();
    const toast = useToast();

    if (!isIncoming) {
        return null;
    }

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
        <div className={styles.overlay}>
            <Card
                variant="surface"
                className={styles.alertWindow}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.alertHeader}>
                    <Heading as="h2" size="xl" className={styles.alertTitle}>
                        {t("calls.incoming_title", "Входящий звонок")}
                    </Heading>
                    <Text as="p" intent="neutral" size="md">
                        {t("calls.incoming_subtitle", "Вам звонят...")}
                    </Text>
                </div>
                <div className={styles.alertActions}>
                    <Button
                        onClick={handleAccept}
                        intent="success"
                        className={styles.acceptButton}
                    >
                        <PhoneIncoming size={ICON_SIZE.md} />
                        {t("calls.accept", "Принять")}
                    </Button>
                    <Button onClick={rejectCall} intent="danger">
                        <PhoneOff size={ICON_SIZE.md} />
                        {t("calls.reject", "Отклонить")}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
