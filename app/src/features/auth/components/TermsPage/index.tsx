import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Text } from "@/components/ui/Text";
import { ROUTES } from "@/lib/constants/routes";
import styles from "./termsPage.module.css";

// TODO: доработать, добавить локали

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
                                    ⚖️ Основные правила
                                </Heading>
                                <Text>
                                    Knock-Knock Messenger — это современное
                                    приложение для общения, ориентированное на
                                    приватность и безопасность данных (E2EE).
                                    Используя наше приложение, вы соглашаетесь с
                                    правилами использования.
                                </Text>
                            </Flex>

                            <Flex direction="column" gap="2">
                                <Heading as="h4" size="sm">
                                    1. Безопасность и Конфиденциальность
                                </Heading>
                                <Text>
                                    Мы используем оконечное шифрование
                                    (End-to-End Encryption) для ваших сообщений.
                                    Ваши приватные ключи никогда не покидают
                                    ваше устройство.
                                </Text>
                            </Flex>

                            <Flex direction="column" gap="2">
                                <Heading as="h4" size="sm">
                                    2. Использование сервиса
                                </Heading>
                                <Text>
                                    Пользователь обязуется не использовать
                                    сервис для распространения вредоносного ПО,
                                    спама или противоправного контента.
                                </Text>
                            </Flex>

                            <Flex direction="column" gap="2">
                                <Heading as="h4" size="sm">
                                    3. Ответственность
                                </Heading>
                                <Text>
                                    Мы не несем ответственности за содержание
                                    сообщений пользователей, так как не имеем к
                                    ним доступа в расшифрованном виде.
                                </Text>
                            </Flex>

                            <Text size="xs" color="muted">
                                Последнее обновление:{" "}
                                {new Date().toLocaleDateString()}
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
