import { Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { AppLogo } from "@/components/ui/AppLogo";
import { Tabs } from "@/components/ui/Tabs";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { ROUTES } from "@/lib/constants/routes";
import { useAuthStore } from "@/stores/auth";
import styles from "./login.module.css";

export function LoginPage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("login");
    const profile = useAuthStore((state) => state.profile);

    if (profile) {
        return <Navigate to={ROUTES.CHAT_LIST} />;
    }

    return (
        <main className={styles.page}>
            {/* Декоративный фон */}
            <div className={styles.background} />

            <Flex
                direction="column"
                align="center"
                justify="center"
                className={styles.container}
            >
                <div className={styles.glassCard}>
                    <Flex direction="column" align="center" gap="4" mb="8">
                        <AppLogo size="lg" />
                        <h1 className={styles.title}>
                            {t("auth.signInToAccount")}
                        </h1>
                    </Flex>

                    <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        defaultValue="login"
                    >
                        <Tabs.List className={styles.tabsList}>
                            <Tabs.Trigger value="login">
                                {t("auth.loginAction")}
                            </Tabs.Trigger>
                            <Tabs.Trigger value="register">
                                {t("auth.toRegister")}
                            </Tabs.Trigger>
                        </Tabs.List>

                        <Tabs.Content value="login">
                            <LoginForm />
                        </Tabs.Content>

                        <Tabs.Content value="register">
                            <RegisterForm />
                        </Tabs.Content>
                    </Tabs>
                </div>

                <footer className={styles.footer}>
                    <p>© {new Date().getFullYear()} Knock-Knock Messenger</p>
                </footer>
            </Flex>
        </main>
    );
}
