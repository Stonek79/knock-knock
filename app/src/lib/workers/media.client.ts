import { logger } from "../logger";
import type {
    WorkerMediaPayload,
    WorkerProcessResult,
    WorkerTask,
} from "../types";

/**
 * Клиент для взаимодействия с Media Web Worker.
 * Обеспечивает типизированный интерфейс и управление жизненным циклом воркера.
 */
export class MediaWorkerClient {
    private worker: Error | Worker | null = null;
    private pendingTasks = new Map<
        string,
        {
            resolve: (res: WorkerMediaPayload) => void;
            reject: (err: Error) => void;
        }
    >();

    constructor() {
        if (typeof window !== "undefined") {
            this.initWorker();
        }
    }

    /**
     * Инициализация воркера.
     */
    private initWorker(): void {
        try {
            this.worker = new Worker(
                new URL("./media.worker.ts", import.meta.url),
                {
                    type: "module",
                    name: "media-processor",
                },
            );

            this.worker.onmessage = this.handleMessage.bind(this);
            this.worker.onerror = (err) => {
                logger.error("MediaWorkerClient: Worker error", err);
            };

            logger.info("MediaWorkerClient: Worker initialized");
        } catch (error) {
            this.worker =
                error instanceof Error
                    ? error
                    : new Error("Worker init failed");
            logger.error("MediaWorkerClient: Initialization failed", error);
        }
    }

    /**
     * Обработка сообщений от воркера.
     */
    private handleMessage(event: MessageEvent<WorkerProcessResult>): void {
        const { taskId, success, data, error } = event.data;
        const task = this.pendingTasks.get(taskId);

        if (!task) {
            return;
        }

        if (success && data) {
            task.resolve(data);
        } else {
            task.reject(new Error(error || "Worker processing error"));
        }

        this.pendingTasks.delete(taskId);
    }

    /**
     * Отправка задачи воркеру.
     */
    public async postTask(task: WorkerTask): Promise<WorkerMediaPayload> {
        if (!this.worker || this.worker instanceof Error) {
            throw new Error("Worker not initialized or in error state");
        }

        return new Promise((resolve, reject) => {
            this.pendingTasks.set(task.taskId, { resolve, reject });
            (this.worker as Worker).postMessage(task);
        });
    }

    /**
     * Очистка ресурсов.
     */
    public destroy(): void {
        if (this.worker && !(this.worker instanceof Error)) {
            this.worker.terminate();
        }
        this.worker = null;
        this.pendingTasks.clear();
    }
}

// Экспортируем синглтон
export const mediaWorkerClient = new MediaWorkerClient();
