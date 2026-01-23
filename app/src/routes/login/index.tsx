import { Box, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { useForm } from '@tanstack/react-form';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { logger } from '@/lib/logger';
import { loginSchema } from '@/lib/schemas/auth';
import { supabase } from '@/lib/supabase';
import styles from './login.module.css';

export const Route = createFileRoute('/login/')({
    component: LoginPage,
});

/**
 * Страница входа в приложение.
 * Использует Authentication via Magic Link (Supabase).
 */
function LoginPage() {
    const { t } = useTranslation();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const form = useForm({
        defaultValues: {
            email: '',
        },

        onSubmit: async ({ value }) => {
            setSubmitError(null);
            try {
                logger.info('Attempting login', { email: value.email });
                const { error } = await supabase.auth.signInWithOtp({
                    email: value.email,
                    options: {
                        emailRedirectTo: window.location.origin,
                    },
                });

                if (error) {
                    logger.warn('Login failed', error);
                    setSubmitError(getAuthErrorMessage(error));
                } else {
                    logger.info('Magic link sent successfully');
                    setIsSubmitted(true);
                }
            } catch (err) {
                logger.error('Login exception', err);
                // Explicit logging for debugging if needed, but keeping it clean for user
                if (err instanceof Error) {
                    console.error('RAW_LOGIN_ERROR:', err.message);
                }
                setSubmitError(getAuthErrorMessage(err));
            }
        },
    });

    if (isSubmitted) {
        return (
            <div className={styles.loginPage}>
                <Card size="4" className={styles.loginCard}>
                    <Flex direction="column" gap="4" align="center">
                        <Heading size="6" align="center">
                            {t('auth.checkEmail')}
                        </Heading>
                        <Text align="center" color="gray">
                            {t('auth.magicLinkSent')}
                        </Text>
                    </Flex>
                </Card>
            </div>
        );
    }

    return (
        <div className={styles.loginPage}>
            <Card size="4" className={styles.loginCard}>
                <Flex direction="column" gap="5">
                    <Box>
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
                                    onChange: loginSchema.shape.email,
                                }}
                            >
                                {(field) => (
                                    <Flex direction="column" gap="2">
                                        <Label htmlFor={field.name}>
                                            {t('common.email')}
                                        </Label>
                                        <Input
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
                                            : t('auth.signInWithEmail')}
                                    </Button>
                                )}
                            </form.Subscribe>
                        </div>
                    </form>
                </Flex>
            </Card>
        </div>
    );
}
