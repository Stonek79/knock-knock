import { Info, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth";
import styles from "./verificationbanner.module.css";

/**
 * Баннер для неподтвержденных пользователей.
 * Липкий сверху, можно закрыть до конца сессии.
 */
export function VerificationBanner() {
    const { t } = useTranslation();
    const user = useAuthStore((state) => state.pbUser);
    const [isDismissed, setIsDismissed] = useState(false);

    // Если пользователь подтвержден или баннер закрыт — не показываем
    if (!user || user.verified || isDismissed) {
        return null;
    }

    return (
        <div className={styles.banner}>
            <Flex align="center" justify="between" px="4" py="2" gap="3">
                <Flex align="center" gap="2">
                    <Info size={16} className={styles.icon} />
                    <span className={styles.text}>
                        {t(
                            "auth.verificationRequired",
                            "Пожалуйста, подтвердите ваш email для полного доступа.",
                        )}
                    </span>
                </Flex>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDismissed(true)}
                >
                    <X size={16} />
                </Button>
            </Flex>
        </div>
    );
}
