import { Phone, Video } from "lucide-react";
import { Box } from "@/components/layout/Box";
import { CALL_TYPE } from "@/lib/constants";
import type { CallLogsTypeOptions } from "@/lib/types";
import styles from "./IncomingCallAvatar.module.css";

interface IncomingCallAvatarProps {
    callType: CallLogsTypeOptions | null;
}

export function IncomingCallAvatar({ callType }: IncomingCallAvatarProps) {
    return (
        <Box className={styles.avatarWrapper}>
            <Box className={styles.radarWave1} />
            <Box className={styles.radarWave2} />
            <Box className={styles.radarWave3} />
            <Box className={styles.avatarGradientRing}>
                <Box className={styles.avatarInner}>
                    {callType === CALL_TYPE.VIDEO ? (
                        <Video className={styles.avatarIcon} />
                    ) : (
                        <Phone className={styles.avatarIcon} />
                    )}
                </Box>
            </Box>
        </Box>
    );
}
