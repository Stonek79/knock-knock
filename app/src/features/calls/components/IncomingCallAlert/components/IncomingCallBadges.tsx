import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/Badge";
import { ICON_SIZE } from "@/lib/constants";
import styles from "./IncomingCallBadges.module.css";

interface IncomingCallBadgesProps {
    isActive: boolean;
}

export function IncomingCallBadges({ isActive }: IncomingCallBadgesProps) {
    const { t } = useTranslation();

    if (isActive) {
        return (
            <Badge
                intent="warning"
                variant="soft"
                className={styles.secondLineBadge}
            >
                <span className={styles.pulseDotWarning} />
                {t("calls.secondLine", "Вторая линия")}
            </Badge>
        );
    }

    return (
        <Badge intent="primary" variant="soft" className={styles.e2eeBadge}>
            <ShieldCheck size={ICON_SIZE.sm} />
            {t("calls.e2ee", "End-to-End шифрование")}
        </Badge>
    );
}
