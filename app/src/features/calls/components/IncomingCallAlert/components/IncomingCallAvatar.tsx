import { Box } from "@/components/layout/Box";
import { Avatar } from "@/components/ui/Avatar";
import styles from "./IncomingCallAvatar.module.css";

interface IncomingCallAvatarProps {
    displayName?: string;
    avatarUrl?: string;
}

export function IncomingCallAvatar({
    displayName = "Unknown",
    avatarUrl,
}: IncomingCallAvatarProps) {
    return (
        <Box className={styles.avatarWrapper}>
            <Box className={styles.radarWave1} />
            <Box className={styles.radarWave2} />
            <Box className={styles.radarWave3} />
            <Box className={styles.avatarGradientRing}>
                <Avatar
                    src={avatarUrl}
                    name={displayName}
                    size="xxl"
                    className={styles.avatarInner}
                />
            </Box>
        </Box>
    );
}
