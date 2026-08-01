import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Text } from "@/components/ui/Text";
import { APP_NAME } from "@/lib/constants/common";
import { ROUTES } from "@/lib/constants/routes";
import styles from "./termsPage.module.css";
export function TermsPage() {
    const { t } = useTranslation();
    const navigation = useNavigate();

    return (
        <main className={styles.page}>
            <div className={styles.background} />

            <Flex
                direction="column"
                align="center"
                justify="center"
                className={styles.container}
            >
                <div className={styles.glassCard}>
                    <Flex align="center" gap="4" className={styles.header}>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigation({ to: ROUTES.CHAT_LIST })}
                            className={styles.backButton}
                        >
                            <ArrowLeft size={20} />
                        </Button>
                        <Heading as="h2" size="md" className={styles.title}>
                            {t("auth.iAgreeToTerms")}
                        </Heading>
                    </Flex>

                    <ScrollArea className={styles.scrollArea}>
                        <Flex direction="column" gap="6" p="2">
                            <Flex direction="column" gap="3">
                                <Heading as="h3" size="sm">
                                    {t("auth.terms.rules")}
                                </Heading>
                                <Text>
                                    {t("auth.terms.desc", {
                                        appName: APP_NAME,
                                    })}
                                </Text>
                            </Flex>

                            <Flex direction="column" gap="2">
                                <Heading as="h4" size="sm">
                                    {t("auth.terms.sec1Title")}
                                </Heading>
                                <Text>{t("auth.terms.sec1Desc")}</Text>
                            </Flex>

                            <Flex direction="column" gap="2">
                                <Heading as="h4" size="sm">
                                    {t("auth.terms.sec2Title")}
                                </Heading>
                                <Text>{t("auth.terms.sec2Desc")}</Text>
                            </Flex>

                            <Flex direction="column" gap="2">
                                <Heading as="h4" size="sm">
                                    {t("auth.terms.sec3Title")}
                                </Heading>
                                <Text>{t("auth.terms.sec3Desc")}</Text>
                            </Flex>

                            <Text size="xs" color="muted">
                                {t("auth.terms.lastUpdate", {
                                    date: new Date().toLocaleDateString(),
                                })}
                            </Text>
                        </Flex>
                    </ScrollArea>

                    <Flex mt="6">
                        <Button
                            className={styles.acceptButton}
                            onClick={() => window.history.back()}
                            variant="solid"
                        >
                            {t("common.close")}
                        </Button>
                    </Flex>
                </div>
            </Flex>
        </main>
    );
}
