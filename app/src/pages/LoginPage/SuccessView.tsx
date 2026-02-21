import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import styles from "./login.module.css";

interface SuccessViewProps {
    onBack: () => void;
}

export function SuccessView({ onBack }: SuccessViewProps) {
    const { t } = useTranslation();

    return (
        <div className={styles.loginPage}>
            <Card className={styles.loginCard}>
                <Flex direction="column" gap="4" align="center">
                    <h2 className={styles.title}>{t("auth.checkEmail")}</h2>

                    <p className={styles.subtitle}>{t("auth.magicLinkSent")}</p>

                    <Button variant="ghost" onClick={onBack}>
                        {t("common.back")}
                    </Button>
                </Flex>
            </Card>
        </div>
    );
}
