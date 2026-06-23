import { Copy, QrCode, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { ICON_SIZE } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { InviteService } from "@/lib/services/invite";
import styles from "../accountsettings.module.css";

export function InviteSection() {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsLoading(true);
        setErrorMsg(null);
        setInviteCode(null);

        const result = await InviteService.generateInvite();
        if (result.isOk()) {
            setInviteCode(result.value.code);
        } else {
            setErrorMsg(result.error.message);
            logger.error("Failed to generate invite:", result.error);
        }
        setIsLoading(false);
    };

    const handleCopy = () => {
        if (inviteCode) {
            const inviteUrl = `${window.location.origin}/login?invite=${inviteCode}`;
            navigator.clipboard.writeText(inviteUrl);
        }
    };

    return (
        <Card className={styles.card}>
            <Flex direction="column" gap="3">
                <Text size="sm" intent="secondary" weight="medium">
                    {t("settings.account.invites", "Приглашения")}
                </Text>

                {!inviteCode ? (
                    <Flex direction="column" gap="2">
                        <Text size="sm" intent="secondary">
                            {t(
                                "settings.account.invitesDesc",
                                "Сгенерируйте код или QR-код для приглашения друзей. Доступно 1 приглашение раз в 3 минуты.",
                            )}
                        </Text>
                        <Button
                            variant="soft"
                            size="md"
                            className={styles.actionButton}
                            onClick={handleGenerate}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <RefreshCw
                                    size={ICON_SIZE.sm}
                                    className={styles.spinner}
                                />
                            ) : (
                                <QrCode size={ICON_SIZE.sm} />
                            )}
                            {t(
                                "settings.account.generateInvite",
                                "Создать приглашение",
                            )}
                        </Button>
                        {errorMsg && (
                            <Text size="sm" intent="danger">
                                {errorMsg}
                            </Text>
                        )}
                    </Flex>
                ) : (
                    <Flex direction="column" gap="4" align="center">
                        <Text size="sm" weight="medium" align="center">
                            {t(
                                "settings.account.inviteReady",
                                "Приглашение готово! Отсканируйте QR-код или скопируйте ссылку.",
                            )}
                        </Text>

                        <div
                            style={{
                                background: "white",
                                padding: "16px",
                                borderRadius: "8px",
                            }}
                        >
                            <QRCode
                                value={`${window.location.origin}/login?invite=${inviteCode}`}
                                size={150}
                            />
                        </div>

                        <Flex
                            direction="column"
                            gap="2"
                            style={{ width: "100%" }}
                        >
                            <Text
                                size="lg"
                                weight="bold"
                                align="center"
                                style={{ letterSpacing: "2px" }}
                            >
                                {inviteCode}
                            </Text>
                            <Button variant="outline" onClick={handleCopy}>
                                <Copy size={ICON_SIZE.sm} />
                                {t("common.copyLink", "Скопировать ссылку")}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setInviteCode(null)}
                            >
                                {t("common.close", "Закрыть")}
                            </Button>
                        </Flex>
                    </Flex>
                )}
            </Flex>
        </Card>
    );
}
