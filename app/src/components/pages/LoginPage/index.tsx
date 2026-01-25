import { Box, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { useForm } from '@tanstack/react-form';
import { Navigate } from '@tanstack/react-router';
import { type MouseEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { AppLogo } from '@/components/ui/AppLogo';
import { Button } from '@/components/ui/Button';
import { EmailInput } from '@/components/ui/EmailInput';
import { Label } from '@/components/ui/Label';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { AUTH_MODES, ROUTES } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { loginSchema } from '@/lib/schemas/auth';
import { supabase } from '@/lib/supabase';
import type { AuthMode } from '@/lib/types/auth';
import { useAuthStore } from '@/stores/auth';
import styles from './login.module.css';
import { SuccessView } from './SuccessView';

/**
 * Страница входа в приложение.
 * Использует Authentication via Magic Link (Supabase) или Password.
 */
export function LoginPage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [authMode, setAuthMode] = useState<AuthMode>(AUTH_MODES.MAGIC_LINK);

    const form = useForm({
        defaultValues: {
            email: '',
            password: '',
        },

        onSubmit: async ({ value }) => {
            setSubmitError(null);
            try {
                if (authMode === AUTH_MODES.MAGIC_LINK) {
                    logger.info('Attempting magic link login', {
                        email: value.email,
                    });
                    const { error } = await supabase.auth.signInWithOtp({
                        email: value.email,
                        options: {
                            emailRedirectTo: window.location.origin,
                        },
                    });

                    if (error) throw error;

                    logger.info('Magic link sent successfully');
                    setIsSubmitted(true);
                } else {
                    logger.info('Attempting password login', {
                        email: value.email,
                    });
                    const { error } = await supabase.auth.signInWithPassword({
                        email: value.email,
                        password: value.password || '',
                    });

                    if (error) throw error;

                    logger.info('Password login successful');
                }
            } catch (err) {
                logger.error('Login exception', err);
                setSubmitError(getAuthErrorMessage(err));
            }
        },
    });

    const toggleAuthMode = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setAuthMode((prev) =>
            prev === AUTH_MODES.MAGIC_LINK
                ? AUTH_MODES.PASSWORD
                : AUTH_MODES.MAGIC_LINK,
        );
        setSubmitError(null);
    };

    // Redirect if member, but ensure hooks are called first
    if (user) {
        return <Navigate to={ROUTES.CHAT_LIST} />;
    }

    if (isSubmitted) {
        return <SuccessView onBack={() => setIsSubmitted(false)} />;
    }

    return (
        <div className={styles.loginPage}>
            <Card size="4" className={styles.loginCard}>
                <Flex direction="column" gap="5">
                    <Box>
                        <Flex justify="center" mb="4">
                            <AppLogo width={120} />
                        </Flex>
                        <Heading size="6" align="center" mb="2">
                            {t('auth.welcomeBack')}
                        </Heading>
                        <Text as="p" align="center" color="gray">
                            {t('auth.signInToAccount')}
                        </Text>
                    </Box>

                    {submitError && (
                        <Alert variant="destructive">
                            <AlertTitle>{t('auth.error')}</AlertTitle>
                            <AlertDescription>{submitError}</AlertDescription>
                        </Alert>
                    )}

                    <form
                        autoComplete="off"
                        onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            form.handleSubmit();
                        }}
                    >
                        <div className={styles.formContainer}>
                            <form.Field
                                name="email"
                                validators={{
                                    onChange: ({ value }) => {
                                        const result =
                                            loginSchema.shape.email.safeParse(
                                                value,
                                            );
                                        return result.success
                                            ? undefined
                                            : t(result.error.issues[0].message);
                                    },
                                }}
                            >
                                {(field) => (
                                    <Flex direction="column" gap="2">
                                        <Label htmlFor={field.name}>
                                            {t('common.email')}
                                        </Label>
                                        <EmailInput
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="name@example.com"
                                        />
                                        {field.state.meta.isTouched &&
                                        field.state.meta.errors.length ? (
                                            <Text color="red" size="1">
                                                {field.state.meta.errors.join(
                                                    ', ',
                                                )}
                                            </Text>
                                        ) : null}
                                    </Flex>
                                )}
                            </form.Field>

                            {authMode === AUTH_MODES.PASSWORD && (
                                <form.Field
                                    name="password"
                                    validators={{
                                        onChange: ({ value }) =>
                                            !value
                                                ? t('common.required')
                                                : undefined,
                                    }}
                                >
                                    {(field) => (
                                        <Flex direction="column" gap="2">
                                            <Label htmlFor={field.name}>
                                                {t('common.password')}
                                            </Label>
                                            <PasswordInput
                                                id={field.name}
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="••••••••"
                                            />
                                            {field.state.meta.isTouched &&
                                            field.state.meta.errors.length ? (
                                                <Text color="red" size="1">
                                                    {field.state.meta.errors.join(
                                                        ', ',
                                                    )}
                                                </Text>
                                            ) : null}
                                        </Flex>
                                    )}
                                </form.Field>
                            )}

                            <Flex direction="column" gap="3" mt="2">
                                <form.Subscribe
                                    selector={(state) => [
                                        state.canSubmit,
                                        state.isSubmitting,
                                    ]}
                                >
                                    {([canSubmit, isSubmitting]) => (
                                        <Button
                                            type="submit"
                                            disabled={!canSubmit}
                                            variant="solid"
                                            size="3"
                                            className={styles.submitButton}
                                        >
                                            {isSubmitting
                                                ? t('auth.sending')
                                                : authMode ===
                                                    AUTH_MODES.MAGIC_LINK
                                                  ? t('auth.signInWithEmail')
                                                  : t('auth.signIn')}
                                        </Button>
                                    )}
                                </form.Subscribe>

                                <Button
                                    variant="ghost"
                                    size="2"
                                    onClick={toggleAuthMode}
                                    style={{ margin: '0 auto' }}
                                >
                                    {authMode === AUTH_MODES.MAGIC_LINK
                                        ? t('auth.signInWithPassword')
                                        : t('auth.signInWithMagicLink')}
                                </Button>
                            </Flex>
                        </div>
                    </form>
                </Flex>
            </Card>
        </div>
    );
}
