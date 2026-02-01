import { Card } from '@radix-ui/themes';
import { Navigate } from '@tanstack/react-router';
import { useState } from 'react';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth';
import styles from './login.module.css';
import { SuccessView } from './SuccessView';

/**
 * Страница входа в приложение.
 * Отображает форму авторизации или заглушку успешного входа.
 */
export function LoginPage() {
    const { user } = useAuthStore();
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Если пользователь уже авторизован, редиректим
    if (user) {
        return <Navigate to={ROUTES.CHAT_LIST} />;
    }

    if (isSubmitted) {
        return <SuccessView onBack={() => setIsSubmitted(false)} />;
    }

    return (
        <div className={styles.loginPage}>
            <Card size="4" className={styles.loginCard}>
                <LoginForm onSuccess={() => setIsSubmitted(true)} />
            </Card>
        </div>
    );
}
