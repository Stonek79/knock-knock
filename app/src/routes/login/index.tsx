import { useForm } from '@tanstack/react-form';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { ROUTES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute(ROUTES.LOGIN)({
    component: LoginPage,
});

import { useTranslation } from 'react-i18next';
import styles from './login.module.css';

/**
 * Страница входа в приложение.
 * Использует Authentication via Magic Link (Supabase).
 */
function LoginPage() {
    const { t } = useTranslation();
    const [isSubmitted, setIsSubmitted] = useState(false);

    const form = useForm({
        defaultValues: {
            email: '',
        },

        onSubmit: async ({ value }) => {
            const { error } = await supabase.auth.signInWithOtp({
                email: value.email,
                options: {
                    // Перенаправление на главную после входа
                    emailRedirectTo: window.location.origin,
                },
            });

            if (error) {
                alert(error.message);
            } else {
                setIsSubmitted(true);
            }
        },
    });

    // Если пользователь уже авторизован? Корневой роут (Root) должен обработать редирект,
    // или мы можем проверить сессию здесь.

    if (isSubmitted) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>{t('auth.checkEmail')}</h1>
                    <p className={styles.subtitle}>{t('auth.magicLinkSent')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h1 className={styles.title}>{t('auth.welcomeBack')}</h1>
                    <p className={styles.subtitle}>
                        {t('auth.signInToAccount')}
                    </p>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        form.handleSubmit();
                    }}
                    className={styles.form}
                >
                    <form.Field
                        name="email"
                        validators={{
                            onChange: z.email({
                                message: t('validation.emailInvalid'),
                            }),
                        }}
                    >
                        {(field) => (
                            <div className={styles.field}>
                                <Label htmlFor={field.name}>
                                    {t('common.email')}
                                </Label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    placeholder="name@example.com"
                                    type="email"
                                    required
                                />
                                {field.state.meta.isTouched &&
                                field.state.meta.errors.length ? (
                                    <p className={styles.error}>
                                        {field.state.meta.errors.join(', ')}
                                    </p>
                                ) : null}
                            </div>
                        )}
                    </form.Field>

                    <form.Subscribe
                        selector={(state) => [
                            state.canSubmit,
                            state.isSubmitting,
                        ]}
                    >
                        {([canSubmit, isSubmitting]) => (
                            <Button
                                type="submit"
                                className={styles.button}
                                disabled={!canSubmit}
                            >
                                {isSubmitting
                                    ? t('auth.sending')
                                    : t('auth.signInWithEmail')}
                            </Button>
                        )}
                    </form.Subscribe>
                </form>
            </div>
        </div>
    );
}
