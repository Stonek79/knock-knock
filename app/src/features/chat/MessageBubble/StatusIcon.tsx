import { Check, CheckCheck } from 'lucide-react';
import { MESSAGE_STATUS } from '@/lib/constants/chat';
import type { MessageStatus } from '@/lib/types/message';
import styles from './message-bubble.module.css';

interface StatusIconProps {
    status: MessageStatus;
    isOwn: boolean;
    isDeleted?: boolean;
}

export function StatusIcon({ status, isOwn, isDeleted }: StatusIconProps) {
    if (!isOwn || isDeleted) return null;

    const iconClass = styles.iconSmall;

    switch (status) {
        case MESSAGE_STATUS.SENT:
            return (
                <Check className={`${iconClass} ${styles.statusIconSent}`} />
            );
        case MESSAGE_STATUS.DELIVERED:
            return (
                <CheckCheck
                    className={`${iconClass} ${styles.statusIconSent}`}
                />
            );
        case MESSAGE_STATUS.READ:
            return (
                <CheckCheck
                    className={`${iconClass} ${styles.statusIconRead}`}
                />
            );
        default:
            return null;
    }
}
