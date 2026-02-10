import { Card, Flex, Heading, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import styles from "./login.module.css";

interface SuccessViewProps {
    onBack: () => void;
}

export function SuccessView({ onBack }: SuccessViewProps) {
    const { t } = useTranslation();

    return (
        <div className={styles.loginPage}>
            <Card size="4" className={styles.loginCard}>
                <Flex direction="column" gap="4" align="center">
                    <Heading size="6" align="center">
                        {t("auth.checkEmail")}
                    </Heading>
                    <Text align="center" color="gray">
                        {t("auth.magicLinkSent")}
                    </Text>
                    <Button variant="ghost" onClick={onBack}>
                        {t("common.back")}
                    </Button>
                </Flex>
            </Card>
        </div>
    );
}
