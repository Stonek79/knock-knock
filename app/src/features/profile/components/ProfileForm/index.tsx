import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ChangeEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { DB_TABLES, VALIDATION } from "@/lib/constants";
import { COMPONENT_INTENT } from "@/lib/constants/ui";
import { profileSchema } from "@/lib/schemas/profile";
import { supabase } from "@/lib/supabase";
import type { ComponentIntent } from "@/lib/types/ui";
import { useAuthStore } from "@/stores/auth";
import styles from "./profileform.module.css";

/**
 * Форма редактирования профиля пользователя.
 * Использует наш кастомный TextField вместо Radix TextField.
 */
export function ProfileForm() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [statusMessage, setStatusMessage] = useState<{
        type: ComponentIntent;
        text: string;
    } | null>(null);

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            if (!user) {
                return null;
            }
            const { data, error } = await supabase
                .from(DB_TABLES.PROFILES)
                .select("*")
                .eq("id", user.id)
                .single();

            if (error && error.code !== "PGRST116") {
                throw error;
            }
            return data;
        },
        enabled: !!user,
    });

    const form = useForm({
        defaultValues: {
            username: profile?.username || "",
            display_name: profile?.display_name || "",
        },
        onSubmit: async ({ value }) => {
            if (!user) {
                return;
            }
            setStatusMessage(null);

            const { error } = await supabase.from(DB_TABLES.PROFILES).upsert({
                id: user.id,
                username: value.username,
                display_name: value.display_name,
                updated_at: new Date().toISOString(),
            });

            if (error) {
                setStatusMessage({
                    type: COMPONENT_INTENT.DANGER,
                    text: error.message,
                });
            } else {
                queryClient.invalidateQueries({ queryKey: ["profile"] });
                setStatusMessage({
                    type: COMPONENT_INTENT.SUCCESS,
                    text: t("profile.profileUpdated"),
                });
            }
        },
    });

    return (
        <Flex direction="column" gap="4" className={styles.container}>
            {statusMessage && (
                <Alert variant={statusMessage.type}>
                    <AlertTitle>
                        {statusMessage.type === COMPONENT_INTENT.SUCCESS
                            ? t("common.success")
                            : t("common.error")}
                    </AlertTitle>
                    <AlertDescription>{statusMessage.text}</AlertDescription>
                </Alert>
            )}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
            >
                <Flex direction="column" gap="4">
                    <form.Field
                        name="username"
                        validators={{
                            onChange: profileSchema.shape.username,
                        }}
                    >
                        {(field) => (
                            <Flex direction="column" gap="2">
                                <label
                                    htmlFor="username"
                                    className={styles.fieldLabel}
                                >
                                    {t("profile.username")}
                                </label>
                                <TextField
                                    id="username"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(
                                        e: ChangeEvent<HTMLInputElement>,
                                    ) => field.handleChange(e.target.value)}
                                    required
                                />
                                {field.state.meta.isTouched &&
                                field.state.meta.errors.length ? (
                                    <span className={styles.fieldError}>
                                        {field.state.meta.errors
                                            .map((err) =>
                                                t(String(err), {
                                                    min: VALIDATION.USERNAME_MIN_LENGTH,
                                                }),
                                            )
                                            .join(", ")}
                                    </span>
                                ) : null}
                            </Flex>
                        )}
                    </form.Field>

                    <form.Field name="display_name">
                        {(field) => (
                            <Flex direction="column" gap="2">
                                <label
                                    htmlFor="display_name"
                                    className={styles.fieldLabel}
                                >
                                    {t("profile.displayName")}
                                </label>
                                <TextField
                                    id="display_name"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(
                                        e: ChangeEvent<HTMLInputElement>,
                                    ) => field.handleChange(e.target.value)}
                                />
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
                            >
                                {isSubmitting
                                    ? t("common.saving")
                                    : t("profile.saveProfile")}
                            </Button>
                        )}
                    </form.Subscribe>
                </Flex>
            </form>
        </Flex>
    );
}
