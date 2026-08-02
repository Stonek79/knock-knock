import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { COMPONENT_INTENT, QUERY_KEYS } from "@/lib/constants";
import { broadcastService } from "@/lib/services/broadcast";
import type { TaskQueueResponse } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils/result";
import styles from "./broadcast-settings.module.css";
import { BroadcastHeader } from "./components/BroadcastHeader";
import { BroadcastHistory } from "./components/BroadcastHistory";
import { BroadcastInput } from "./components/BroadcastInput";
import { DeleteBroadcastDialog } from "./components/DeleteBroadcastDialog";

/**
 * Основной компонент управления рассылками (Панель администратора).
 * Организует интерфейс в стиле чата:
 * - Сверху: шапка с описанием.
 * - В центре: прокручиваемая лента истории отправленных сообщений.
 * - Снизу: закрепленное поле ввода с поддержкой медиафайлов.
 */
export function Broadcast() {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
    const [status, setStatus] = useState<{
        type: typeof COMPONENT_INTENT.SUCCESS | typeof COMPONENT_INTENT.ERROR;
        message: string;
    } | null>(null);

    const {
        data: historyData,
        isLoading: isLoadingHistory,
        refetch: refetchHistory,
    } = useQuery({
        queryKey: QUERY_KEYS.broadcastHistory(),
        queryFn: async () => {
            const result = await broadcastService.getBroadcastHistory();
            if (result.isOk()) {
                const data = result.value as {
                    items?: TaskQueueResponse[];
                };
                return data.items ?? [];
            }
            return [] as TaskQueueResponse[];
        },
    });

    const history = historyData || [];

    /**
     * Обработчик удаления рассылки из истории
     */
    const handleDelete = async (id: string) => {
        const result = await broadcastService.deleteBroadcast(id);
        if (result.isOk()) {
            refetchHistory();
            setStatus({
                type: COMPONENT_INTENT.SUCCESS,
                message: t("settings.broadcast.deleteSuccess"),
            });
        } else {
            setStatus({
                type: COMPONENT_INTENT.ERROR,
                message:
                    getErrorMessage(result.error) ||
                    t("settings.broadcast.deleteError"),
            });
        }
        setDeleteTaskId(null);
    };

    /**
     * Обработчик отправки новой рассылки
     */
    const handleSend = async ({
        text,
        files,
        audioBlob,
    }: {
        text: string;
        files?: File[];
        audioBlob?: Blob;
    }) => {
        if (!text.trim() && (!files || files.length === 0) && !audioBlob) {
            return;
        }

        setIsLoading(true);
        setStatus(null);

        const result = await broadcastService.sendBroadcast({
            text,
            files,
            audioBlob,
        });

        if (result.isOk()) {
            setStatus({
                type: COMPONENT_INTENT.SUCCESS,
                message: t("settings.broadcast.success"),
            });
            refetchHistory();
        } else {
            setStatus({
                type: COMPONENT_INTENT.ERROR,
                message: getErrorMessage(result.error) || t("common.error"),
            });
        }

        setIsLoading(false);
    };

    return (
        <Box className={styles.container}>
            <BroadcastHeader />
            <BroadcastHistory
                history={history}
                onDeleteClick={setDeleteTaskId}
                isLoadingHistory={isLoadingHistory}
            />
            <BroadcastInput
                onSend={handleSend}
                isLoading={isLoading}
                status={status}
            />
            <DeleteBroadcastDialog
                open={deleteTaskId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteTaskId(null);
                    }
                }}
                onConfirm={() => {
                    if (deleteTaskId) {
                        handleDelete(deleteTaskId);
                    }
                }}
            />
        </Box>
    );
}
