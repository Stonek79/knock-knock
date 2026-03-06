import { Check, CheckCheck } from "lucide-react";
import { MESSAGE_STATUS } from "@/lib/constants";
import type { MessageStatus } from "@/lib/types/message";

interface StatusIconProps {
    status: MessageStatus;
    isOwn: boolean;
    isDeleted?: boolean;
    /** CSS-классы для иконки (размер) */
    iconClassName?: string;
    /** CSS-класс для статуса «отправлено/доставлено» */
    sentClassName?: string;
    /** CSS-класс для статуса «прочитано» */
    readClassName?: string;
}

/**
 * Иконка статуса сообщения (отправлено/доставлено/прочитано).
 * Рендерится только для собственных и не удалённых сообщений.
 */
export function StatusIcon({
    status,
    isOwn,
    isDeleted,
    iconClassName,
    sentClassName,
    readClassName,
}: StatusIconProps) {
    if (!isOwn || isDeleted) {
        return null;
    }

    switch (status) {
        case MESSAGE_STATUS.SENT:
            return <Check className={`${iconClassName} ${sentClassName}`} />;
        case MESSAGE_STATUS.DELIVERED:
            return (
                <CheckCheck className={`${iconClassName} ${sentClassName}`} />
            );
        case MESSAGE_STATUS.READ:
            return (
                <CheckCheck className={`${iconClassName} ${readClassName}`} />
            );
        default:
            return null;
    }
}
