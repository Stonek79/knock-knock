import { MEDIA_ERROR_MESSAGES, MEDIA_SYSTEM_CONSTANTS } from "../constants";
import { logger } from "../logger";
import type {
    WorkerMediaPayload,
    WorkerProcessResult,
    WorkerTask,
} from "../types";

const { WORKER_TIMEOUT_MS, WORKER_NAME } = MEDIA_SYSTEM_CONSTANTS;

/**
 * Фабрика для создания клиента Media Web Worker.
 * Обеспечивает функциональный интерфейс без использования классов.
 */
function createMediaWorkerClient() {
    let worker: Worker | Error | null = null;
    const pendingTasks = new Map<
        string,
        {
            resolve: (res: WorkerMediaPayload) => void;
            reject: (err: Error) => void;
            timeoutId: ReturnType<typeof setTimeout>;
        }
    >();

    /**
     * Обработка сообщений от воркера.
     */
    const handleMessage = (event: MessageEvent<WorkerProcessResult>) => {
        const { taskId, success, data, error } = event.data;
        const task = pendingTasks.get(taskId);

        if (!task) {
            return;
        }

        clearTimeout(task.timeoutId);
        pendingTasks.delete(taskId);

        if (success && data) {
            task.resolve(data);
        } else {
            task.reject(
                new Error(error || MEDIA_ERROR_MESSAGES.WORKER_PROCESS_FAIL),
            );
        }
    };

    /**
     * Инициализация воркера.
     */
    const initWorker = () => {
        if (typeof window === "undefined" || worker instanceof Worker) {
            return;
        }

        try {
            worker = new Worker(new URL("./media.worker.ts", import.meta.url), {
                type: "module",
                name: WORKER_NAME,
            });

            worker.onmessage = handleMessage;
            worker.onerror = (err) => {
                logger.error(
                    "MediaWorkerClient: Критическая ошибка воркера",
                    err,
                );
            };

            logger.info("MediaWorkerClient: Воркер успешно инициализирован");
        } catch (error) {
            worker =
                error instanceof Error
                    ? error
                    : new Error(MEDIA_ERROR_MESSAGES.WORKER_INIT_FAIL);
            logger.error(
                "MediaWorkerClient: Ошибка инициализации воркера",
                error,
            );
        }
    };

    // Первичная инициализация
    initWorker();

    return {
        /**
         * Отправка задачи воркеру с таймаутом.
         * @param task - Данные задачи (id, действие, нагрузка)
         * @returns Результат обработки данных воркером
         */
        postTask: async (task: WorkerTask): Promise<WorkerMediaPayload> => {
            // Попытка переинициализации если воркер упал или не создался
            if (!(worker instanceof Worker)) {
                initWorker();
            }

            // Создаем локальную ссылку для TypeScript чтобы гарантировать тип Worker
            const currentWorker = worker;

            if (!(currentWorker instanceof Worker)) {
                const errorMsg =
                    currentWorker instanceof Error
                        ? currentWorker.message
                        : MEDIA_ERROR_MESSAGES.WORKER_NOT_READY;
                throw new Error(errorMsg);
            }

            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    if (pendingTasks.has(task.taskId)) {
                        pendingTasks.delete(task.taskId);
                        const error = new Error(
                            MEDIA_ERROR_MESSAGES.WORKER_TIMEOUT,
                        );
                        reject(error);
                        logger.error(
                            `MediaWorker: Превышено время ожидания задачи ${task.taskId}`,
                        );
                    }
                }, WORKER_TIMEOUT_MS);

                pendingTasks.set(task.taskId, { resolve, reject, timeoutId });
                currentWorker.postMessage(task);
            });
        },

        /**
         * Очистка ресурсов воркера.
         */
        destroy: () => {
            if (worker instanceof Worker) {
                worker.terminate();
            }
            worker = null;
            for (const task of pendingTasks.values()) {
                clearTimeout(task.timeoutId);
                task.reject(new Error(MEDIA_ERROR_MESSAGES.WORKER_DESTROYED));
            }
            pendingTasks.clear();
            logger.info(
                "MediaWorkerClient: Воркер уничтожен и ресурсы очищены",
            );
        },
    };
}

/**
 * Синглтон-клиент для работы с медиа-воркером.
 */
export const mediaWorkerClient = createMediaWorkerClient();
