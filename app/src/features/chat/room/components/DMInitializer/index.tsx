import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { useAuthStore } from "@/stores/auth";
import { useCreateDM } from "../../../creation/hooks/useCreateDM";
import styles from "./dminitializer.module.css";

/**
 * Компонент инициализации DM-чата.
 */
export function DMInitializer() {
    const { userId } = useParams({ from: "/_auth/dm/$userId" });
    const { isPrivate } = useSearch({ from: "/_auth/dm/$userId" });
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const createDM = useCreateDM();

    const [error, setError] = useState<string | null>(null);
    const initializing = useRef(false);

    useEffect(() => {
        if (!user || !userId) {
            return;
        }
        if (initializing.current) {
            return;
        }
        initializing.current = true;

        const initializeDM = async () => {
            try {
                const roomId = await createDM.mutateAsync({
                    currentUserId: user.id,
                    targetUserId: userId,
                    isPrivate,
                });

                navigate({
                    to: "/chat/$roomId",
                    params: { roomId },
                    replace: true,
                });
            } catch (err) {
                console.error("Failed to initialize DM:", err);
                setError(
                    err instanceof Error
                        ? err.message
                        : t(
                              "chat.errors.createFailed",
                              "Не удалось создать чат",
                          ),
                );
            }
        };

        initializeDM();
    }, [user, userId, isPrivate, navigate, t, createDM]);

    if (error) {
        return (
            <Box p="4">
                <Alert variant="danger">
                    <AlertTitle>{t("common.error", "Ошибка")}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </Box>
        );
    }

    return (
        <Box className={styles.container}>
            <Spinner size="lg" />
            <span className={styles.initText}>
                {t("chat.initializing", "Инициализация чата...")}
            </span>
        </Box>
    );
}
