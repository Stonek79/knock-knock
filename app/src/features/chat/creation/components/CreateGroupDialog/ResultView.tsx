import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ICON_SIZE } from "@/lib/constants";
import type { useCreateGroup } from "../../hooks/useCreateGroup";
import styles from "./creategroupdialog.module.css";

interface ResultViewProps {
    state: ReturnType<typeof useCreateGroup>;
}

export function ResultView({ state }: ResultViewProps) {
    const { t } = useTranslation();
    const inviteLink = `${window.location.origin}/join/${state.createdInviteToken}`;

    return (
        <Flex
            direction="column"
            align="center"
            gap="4"
            className={styles.resultView}
        >
            <QRCode value={inviteLink} size={200} />

            <Flex align="center" gap="2" className={styles.linkContainer}>
                <TextField
                    readOnly
                    value={inviteLink}
                    className={styles.linkInput}
                />
                <Button
                    variant="soft"
                    onClick={() => navigator.clipboard.writeText(inviteLink)}
                >
                    <Copy size={ICON_SIZE.sm} />
                </Button>
            </Flex>

            <Button onClick={state.handleFinish} className={styles.finishBtn}>
                {t("chat.goToChat", "Перейти в чат")}
            </Button>
        </Flex>
    );
}
