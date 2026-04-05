import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Flex } from "@/components/layout/Flex";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { QUERY_KEYS, ROUTES, USER_ROLE } from "@/lib/constants";
import { userRepository } from "@/lib/repositories/user.repository";
import type { Profile } from "@/lib/types/";
import { useAuthStore } from "@/stores/auth";
import styles from "./admin-layout.module.css";

/**
 * Лейаут админ-панели.
 * Проверяет роль пользователя через userRepository и QUERY_KEYS.
 */
export function AdminLayout() {
    const { t } = useTranslation();
    const router = useRouter();
    const pbUser = useAuthStore((state) => state.pbUser);
    const authLoading = useAuthStore((state) => state.loading);

    // Загрузка профиля для проверки роли через репозиторий
    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: QUERY_KEYS.profile(pbUser?.id),
        queryFn: async (): Promise<Profile | null> => {
            if (!pbUser) {
                return null;
            }

            const result = await userRepository.getUserById(pbUser.id);

            if (result.isErr()) {
                return null;
            }

            return result.value;
        },
        enabled: !!pbUser,
    });

    if (authLoading || (pbUser && profileLoading)) {
        return (
            <Flex className={styles.centerContainer}>
                <Text>{t("common.loading", "Загрузка...")}</Text>
            </Flex>
        );
    }

    // Проверка авторизации
    if (!pbUser) {
        return <Navigate to={ROUTES.LOGIN} />;
    }

    if (!profile) {
        return null;
    }

    const { display_name, role, username } = profile;

    // Проверка роли администратора
    if (profile && role !== USER_ROLE.ADMIN) {
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

    return (
        <div className={styles.adminContainer}>
            <header className={styles.adminHeader}>
                <Button onClick={() => router.history.back()}>
                    <ArrowLeft />
                </Button>
                <Text weight="bold" size="lg">
                    {t("admin.adminPanel", "Панель администратора")}
                </Text>
                <Flex gap="3" align="center">
                    <Text size="md" intent="secondary">
                        {t("admin.youAreAdmin", "Вы вошли как: ")}
                        <Text weight="bold">
                            {username || display_name || ""}
                        </Text>{" "}
                        <Text intent="secondary">({role})</Text>
                    </Text>
                </Flex>
            </header>
            <main className={styles.adminContent}>
                <Outlet />
            </main>
        </div>
    );
}
