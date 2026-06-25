import { Megaphone } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { TextArea } from "@/components/ui/TextArea";
import { COMPONENT_INTENT, ICON_SIZE } from "@/lib/constants";
import { broadcastService } from "@/lib/services/broadcast";
import { getErrorMessage } from "@/lib/utils/result";
import styles from "./broadcast-settings.module.css";

export function BroadcastSettings() {
    const { t } = useTranslation();
    const [text, setText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{
        type: typeof COMPONENT_INTENT.SUCCESS | typeof COMPONENT_INTENT.ERROR;
        message: string;
    } | null>(null);

    const handleSend = async () => {
        if (!text.trim()) {
            return;
        }

        setIsLoading(true);
        setStatus(null);

        const result = await broadcastService.sendBroadcast(text);

        if (result.isOk()) {
            setStatus({
                type: COMPONENT_INTENT.SUCCESS,
                message: t("settings.broadcast.success"),
            });
            setText("");
        } else {
            setStatus({
                type: COMPONENT_INTENT.ERROR,
                message: getErrorMessage(result.error) || t("common.error"),
            });
        }

        setIsLoading(false);
    };

    return (
        <Box className={styles.container}>
            <Flex direction="column" className={styles.content}>
                <Card className={styles.card}>
                    <Flex direction="column" gap="4">
                        <Flex align="center" gap="3">
                            <Megaphone
                                size={ICON_SIZE.xl}
                                className={styles.icon}
                            />
                            <Flex direction="column">
                                <Heading size="md">
                                    {t("settings.broadcast.title")}
                                </Heading>
                                <Text size="sm" intent="secondary">
                                    {t("settings.broadcast.description")}
                                </Text>
                            </Flex>
                        </Flex>

                        {status && (
                            <Text
                                size="sm"
                                intent={
                                    status.type === COMPONENT_INTENT.SUCCESS
                                        ? COMPONENT_INTENT.PRIMARY
                                        : COMPONENT_INTENT.DANGER
                                }
                            >
                                {status.message}
                            </Text>
                        )}

                        <div className={styles.inputWrapper}>
                            <TextArea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder={t(
                                    "settings.broadcast.placeholder",
                                )}
                                disabled={isLoading}
                                rows={5}
                            />
                        </div>

                        <Flex justify="end">
                            <Button
                                variant="solid"
                                size="md"
                                onClick={handleSend}
                                disabled={isLoading || !text.trim()}
                            >
                                {isLoading
                                    ? t("common.loading")
                                    : t("settings.broadcast.send")}
                            </Button>
                        </Flex>
                    </Flex>
                </Card>
            </Flex>
        </Box>
    );
}
