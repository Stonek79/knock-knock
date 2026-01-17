import { useForm } from '@tanstack/react-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { DB_TABLES, VALIDATION } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import styles from './ProfileForm.module.css';

/**
 * Форма редактирования профиля пользователя.
 */
export function ProfileForm() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // Получение данных профиля
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
                // Ключи не трогаем здесь, они управляются через SecuritySettings (или при создании)
            });

            if (error) {
                alert(error.message);
            } else {
                queryClient.invalidateQueries({ queryKey: ['profile'] });
                alert(t('profile.profileUpdated'));
            }
        },
    });

    return (
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
                    onChange: z.string().min(VALIDATION.USERNAME_MIN_LENGTH, {
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
                            onChange={(e) => field.handleChange(e.target.value)}
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
                            onChange={(e) => field.handleChange(e.target.value)}
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
    );
}
