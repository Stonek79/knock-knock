import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { DB_TABLES, ROUTES, USER_ROLE } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types/";
import { useAuthStore } from "@/stores/auth";
import styles from "./admin-layout.module.css";

export function AdminLayout() {
    const { user, loading: authLoading } = useAuthStore();
    const { t } = useTranslation();
    const router = useRouter();

    // Fetch Full Profile to check Role
    const { data: profile, isLoading: profileLoading } = useQuery({
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

            if (error) {
                throw error;
            }
            return data as Profile;
        },
        enabled: !!user,
    });

    if (authLoading || (user && profileLoading)) {
        return (
            <Flex className={styles.centerContainer}>
                <Text>{t("common.loading", "Загрузка...")}</Text>
            </Flex>
        );
    }

    // Check if user is logged in
    if (!user) {
        return <Navigate to={ROUTES.LOGIN} />;
    }

    // Check if user is admin
    if (profile && profile.role !== USER_ROLE.ADMIN) {
        return (
            <Flex className={styles.accessDeniedContainer}>
                <Text size="xl" weight="bold" intent="danger">
                    {t("admin.accessDenied", "Доступ запрещен")}
                </Text>
                <Text intent="secondary">
                    {t(
                        "admin.notAdmin",
                        "У вас нет прав для просмотра этой страницы.",
                    )}
                </Text>
                <Button onClick={() => router.history.back()}>
                    {t("common.goBack", "Назад")}
                </Button>
            </Flex>
        );
    }

    if (!profile) {
        return null;
    }

    return (
        <div className={styles.adminContainer}>
            <header className={styles.adminHeader}>
                <Text weight="bold" size="lg">
                    Admin Panel
                </Text>
                <Flex gap="3" align="center">
                    <Text size="md" intent="secondary">
                        Logged as: {profile.username} ({profile.role})
                    </Text>
                </Flex>
            </header>
            <main className={styles.adminContent}>
                <Outlet />
            </main>
        </div>
    );
}
