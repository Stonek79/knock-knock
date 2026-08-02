import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Text } from "@/components/ui/Text";
import { ROUTES } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { useAuthStore } from "@/stores/auth";
import { useCreateDM } from "../../../creation/hooks/useCreateDM";
import styles from "./dminitializer.module.css";

/**
 * Компонент инициализации DM-чата.
 */
export function DMInitializer() {
    const { userId } = useParams({ from: ROUTES.AUTH_DM });
    const { isPrivate } = useSearch({ from: ROUTES.AUTH_DM });
    const navigate = useNavigate();
    const { t } = useTranslation();
    const createDM = useCreateDM();
    const user = useAuthStore((state) => state.profile);

    const [error, setError] = useState<string | null>(null);
    const initializing = useRef(false);

    const tRef = useRef(t);
    const navigateRef = useRef(navigate);
    const createDMRef = useRef(createDM);

    tRef.current = t;
    navigateRef.current = navigate;
    createDMRef.current = createDM;

    // Эффект инициализации чата при монтировании
    useEffect(() => {
        // Проверяем наличие необходимых данных и отсутствие запущенного процесса
        if (!user || !userId || initializing.current) {
            return;
        }

        initializing.current = true;

        const initializeDM = async () => {
            try {
                logger.info("Инициализация DM чата", { targetUserId: userId });

                const roomId = await createDMRef.current.mutateAsync({
                    currentUserId: user.id,
                    targetUserId: userId,
                    isPrivate,
                });

                logger.info("Чат успешно инициализирован", { roomId });

                navigateRef.current({
                    to: ROUTES.CHAT_ROOM,
                    params: { roomId },
                    replace: true,
                });
            } catch (err) {
                logger.error("Ошибка при инициализации DM:", err);
                setError(
                    err instanceof Error
                        ? err.message
                        : tRef.current(
                              "chat.errors.createFailed",
                              "Не удалось создать чат",
                          ),
                );
                initializing.current = false; // Позволяем повторную попытку при ошибке
            }
        };

        initializeDM();
    }, [user, userId, isPrivate]);

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
            <Text as="span" className={styles.initText}>
                {t("chat.initializing", "Инициализация чата...")}
            </Text>
        </Box>
    );
}
