import { AlertTriangle, Check, CheckCheck, Loader } from "lucide-react";
import { CLIENT_MESSAGE_STATUS, MESSAGE_STATUS } from "@/lib/constants";
import type { UIMessageStatus } from "@/lib/types/message";
import styles from "./status-icon.module.css";

interface StatusIconProps {
    /** Статус сообщения (серверный или клиентский UI) */
    status: UIMessageStatus;
    /** Сообщение принадлежит текущему пользователю */
    isOwn: boolean;
    /** Сообщение удалено */
    isDeleted?: boolean;
    /** CSS-классы для иконки (размер) */
    iconClassName?: string;
    /** CSS-класс для статуса «отправлено/доставлено» */
    sentClassName?: string;
    /** CSS-класс для статуса «прочитано» */
    readClassName?: string;
    /** Обработчик клика по Failed иконке (retry) */
    onFailedClick?: () => void;
}

/**
 * Иконка статуса сообщения.
 *
 * Поддерживает серверные (sent/delivered/read) и клиентские (sending/failed) статусы.
 * - SENDING: анимированный спиннер (часики)
 * - FAILED: красный треугольник с обработчиком клика
 * - SENT: одна серая галочка
 * - DELIVERED: двойная серая галочка
 * - READ: двойная акцентная галочка
 *
 * Рендерится только для собственных и не удалённых сообщений.
 */
export function StatusIcon({
    status,
    isOwn,
    isDeleted,
    iconClassName,
    sentClassName,
    readClassName,
    onFailedClick,
}: StatusIconProps) {
    if (!isOwn || isDeleted) {
        return null;
    }

    switch (status) {
        case CLIENT_MESSAGE_STATUS.SENDING:
            return (
                <Loader
                    className={`${iconClassName} ${sentClassName} ${styles.spinAnimation}`}
                />
            );
        case CLIENT_MESSAGE_STATUS.FAILED:
            return (
                <AlertTriangle
                    className={`${iconClassName} ${styles.failedIcon}`}
                    onClick={onFailedClick}
                />
            );
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
