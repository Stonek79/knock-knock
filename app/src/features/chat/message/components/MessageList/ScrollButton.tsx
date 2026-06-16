import { ArrowDown } from "lucide-react";
import { Box } from "@/components/layout/Box";
import { IconButton } from "@/components/ui/IconButton";

import { ICON_SIZE } from "@/lib/constants/theme";
import styles from "./message-list.module.css";

export const ScrollButton = ({
    scrollToBottom,
    showScrollButton,
    unreadCount = 0,
}: {
    scrollToBottom: () => void;
    showScrollButton: boolean;
    unreadCount?: number;
}) => {
    if (!showScrollButton) {
        return null;
    }

    return (
        <Box className={styles.scrollButtonWrapper}>
            <IconButton
                size="lg"
                shape="round"
                variant="solid"
                onClick={() => {
                    scrollToBottom();
                }}
                className={styles.scrollButton}
            >
                <ArrowDown size={ICON_SIZE.sm} />
            </IconButton>
            {unreadCount > 0 && (
                <div className={styles.unreadBadge}>{unreadCount}</div>
            )}
        </Box>
    );
};
