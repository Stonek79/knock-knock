import { Navigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";
import styles from "./login.module.css";

/**
 * Страница входа в приложение.
 * Отображает форму авторизации или заглушку успешного входа.
 */
export function LoginPage() {
    const { profile: user } = useAuthStore();

    // Если пользователь уже авторизован, редиректим
    if (user) {
        return <Navigate to={ROUTES.CHAT_LIST} />;
    }

    return (
        <div className={styles.loginPage}>
            <Card className={styles.loginCard}>
                <LoginForm onSuccess={() => {}} />
            </Card>
        </div>
    );
}
