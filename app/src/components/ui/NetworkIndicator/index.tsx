import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { NETWORK_INDICATOR_STATES } from "@/lib/constants";
import type { NetworkIndicatorState } from "@/lib/types";
import styles from "./styles.module.css";

/**
 * Индикатор отсутствия сети.
 * Плавно появляется при потере сети и исчезает через пару секунд после её восстановления.
 */
export function NetworkIndicator() {
    const { t } = useTranslation();
    const { isOnline } = useNetworkStatus();
    const [state, setState] = useState<NetworkIndicatorState>(
        NETWORK_INDICATOR_STATES.IDLE,
    );

    useEffect(() => {
        if (!isOnline) {
            setState(NETWORK_INDICATOR_STATES.OFFLINE);
        } else if (state === NETWORK_INDICATOR_STATES.OFFLINE) {
            // Сеть восстановилась
            setState(NETWORK_INDICATOR_STATES.RESTORED);

            // Через 3 секунды скрываем плашку
            const timer = setTimeout(() => {
                setState(NETWORK_INDICATOR_STATES.IDLE);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [isOnline, state]);

    // Всегда рендерим, чтобы CSS-анимация скрытия (transition) отработала корректно.
    // При state === "idle" opacity: 0 и pointer-events: none.

    return (
        <Box className={clsx(styles.container, styles[state])}>
            {state === NETWORK_INDICATOR_STATES.OFFLINE
                ? t("network.disconnected", "Соединение разорвано")
                : t("network.restored", "Соединение восстановлено")}
        </Box>
    );
}
