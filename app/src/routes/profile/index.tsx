import { useForm } from '@tanstack/react-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { DB_TABLES, ROUTES, VALIDATION } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import styles from './profile.module.css';

export const Route = createFileRoute(ROUTES.PROFILE)({
    beforeLoad: () => {
        // Мы не можем легко получить доступ к стору (store) здесь без внедрения контекста в роутер,
        // полагаемся на защиту на уровне компонентов или обертку роутера
        // для этого MVP этапа.
    },
    component: ProfilePage,
});

/**
 * Страница профиля пользователя.
 * Позволяет просматривать и редактировать данные профиля (username, display name).
 */
function ProfilePage() {
    const { t } = useTranslation();
    const { user, signOut } = useAuthStore();
    const queryClient = useQueryClient();

    // Хуки должны вызываться безусловно
    const { data: profile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from(DB_TABLES.PROFILES)
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },
        enabled: !!user,
    });

    // Инициализируем форму безусловно, но значения зависят от профиля
    const form = useForm({
        defaultValues: {
            username: profile?.username || '',
            display_name: profile?.display_name || '',
        },

        onSubmit: async ({ value }) => {
            if (!user) return;

            const { error } = await supabase.from(DB_TABLES.PROFILES).upsert({
                id: user.id,
                username: value.username,
                display_name: value.display_name,
                updated_at: new Date().toISOString(),
                // Публичные ключи будут добавлены во 2-й Фазе
                public_key_x25519: 'PLACEHOLDER',
                public_key_ed25519: 'PLACEHOLDER',
            });

            if (error) {
                alert(error.message);
            } else {
                queryClient.invalidateQueries({ queryKey: ['profile'] });
                alert(t('profile.profileUpdated'));
            }
        },
    });

    // Ранний возврат ТОЛЬКО для рендеринга, после всех хуков
    if (!user) {
        return <div>{t('auth.pleaseLogIn')}</div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{t('profile.title')}</h1>

            <div className={styles.userInfo}>
                <p>
                    {t('common.email')}: {user.email}
                </p>
                <Button variant="secondary" onClick={() => signOut()}>
                    {t('common.signOut')}
                </Button>
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
                    name="username"
                    validators={{
                        onChange: z
                            .string()
                            .min(VALIDATION.USERNAME_MIN_LENGTH, {
                                message: t('validation.usernameMin', {
                                    min: VALIDATION.USERNAME_MIN_LENGTH,
                                }),
                            }),
                    }}
                >
                    {(field) => (
                        <div className={styles.field}>
                            <Label htmlFor="username">
                                {t('profile.username')}
                            </Label>
                            <Input
                                id="username"
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
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

                <form.Field name="display_name">
                    {(field) => (
                        <div className={styles.field}>
                            <Label htmlFor="display_name">
                                {t('profile.displayName')}
                            </Label>
                            <Input
                                id="display_name"
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                            />
                        </div>
                    )}
                </form.Field>

                <form.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                    {([canSubmit, isSubmitting]) => (
                        <Button type="submit" disabled={!canSubmit}>
                            {isSubmitting
                                ? t('common.saving')
                                : t('profile.saveProfile')}
                        </Button>
                    )}
                </form.Subscribe>
            </form>
        </div>
    );
}
