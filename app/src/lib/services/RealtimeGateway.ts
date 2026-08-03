import type { RecordModel } from "pocketbase";
import { pb } from "@/lib/pocketbase";

export type RealtimeAction = "create" | "update" | "delete";

export interface PBRealtimeEvent<T = RecordModel> {
    action: RealtimeAction;
    record: T;
}

export type RealtimeCallback<T = RecordModel> = (
    event: PBRealtimeEvent<T>,
) => void;

/**
 * Централизованный шлюз для управления подписками Realtime (PocketBase SSE).
 * Реализует паттерн Singleton, авто-реконнект с Exponential Backoff
 * и транслирует события через кастомный Typed EventEmitter.
 */
class RealtimeGateway {
    private static instance: RealtimeGateway;
    private listeners: Map<string, Set<RealtimeCallback<unknown>>> = new Map();
    private activeSubscriptions: Set<string> = new Set();

    private systemListeners: Map<string, Set<() => void>> = new Map();

    private backoffDelay = 1000;
    private maxBackoffDelay = 30000;
    private isReconnecting = false;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    private constructor() {
        this.initConnectionListeners();
    }

    /**
     * Возвращает единственный инстанс RealtimeGateway.
     */
    public static getInstance(): RealtimeGateway {
        if (!RealtimeGateway.instance) {
            RealtimeGateway.instance = new RealtimeGateway();
        }
        return RealtimeGateway.instance;
    }

    private initConnectionListeners(): void {
        if (pb.realtime) {
            pb.realtime.onDisconnect = (activeSubscriptions: Array<string>) => {
                if (activeSubscriptions.length > 0) {
                    this.handleDisconnect();
                }
            };

            // PB_CONNECT is dispatched by PocketBase JS SDK when SSE is established
            pb.realtime.subscribe("PB_CONNECT", () => {
                if (this.isReconnecting) {
                    this.isReconnecting = false;
                    this.backoffDelay = 1000;
                    this.emitSystemEvent("RECONNECTED");
                }
            });
        }

        if (typeof window !== "undefined") {
            window.addEventListener("offline", () => {
                this.handleDisconnect();
            });
            window.addEventListener("online", () => {
                if (this.isReconnecting) {
                    this.attemptReconnect();
                }
            });
        }
    }

    private handleDisconnect(): void {
        if (this.isReconnecting) {
            return;
        }
        this.isReconnecting = true;
        this.attemptReconnect();
    }

    private attemptReconnect(): void {
        if (!this.isReconnecting) {
            return;
        }

        if (typeof navigator !== "undefined" && !navigator.onLine) {
            return;
        }

        pb.health
            .check()
            .then(async () => {
                if (!pb.realtime.isConnected) {
                    for (const collection of this.activeSubscriptions) {
                        await this.subscribeToPocketbase(collection);
                    }
                }
            })
            .catch(() => {
                if (this.reconnectTimeout) {
                    clearTimeout(this.reconnectTimeout);
                }
                this.reconnectTimeout = setTimeout(() => {
                    this.backoffDelay = Math.min(
                        this.backoffDelay * 2,
                        this.maxBackoffDelay,
                    );
                    this.attemptReconnect();
                }, this.backoffDelay);
            });
    }

    /**
     * Подписка на события изменений в коллекции PocketBase.
     * @param collection Имя коллекции
     * @param callback Обработчик событий
     * @returns Функция отписки
     */
    public async subscribe<T = RecordModel>(
        collection: string,
        callback: RealtimeCallback<T>,
    ): Promise<() => void> {
        if (!this.listeners.has(collection)) {
            this.listeners.set(collection, new Set());
        }

        const collectionListeners = this.listeners.get(collection);
        if (collectionListeners) {
            collectionListeners.add(callback as RealtimeCallback<unknown>);
        }

        if (!this.activeSubscriptions.has(collection)) {
            this.activeSubscriptions.add(collection);
            await this.subscribeToPocketbase(collection);
        }

        return () => {
            this.unsubscribe(collection, callback as RealtimeCallback<unknown>);
        };
    }

    private async subscribeToPocketbase(collection: string): Promise<void> {
        try {
            await pb.collection(collection).subscribe("*", (e) => {
                const event = e as unknown as PBRealtimeEvent<RecordModel>;
                this.emit(collection, event);
            });
        } catch (error) {
            console.error(
                `[RealtimeGateway] Error subscribing to ${collection}:`,
                error,
            );
        }
    }

    public async unsubscribe<T = RecordModel>(
        collection: string,
        callback: RealtimeCallback<T>,
    ): Promise<void> {
        const collectionListeners = this.listeners.get(collection);
        if (collectionListeners) {
            collectionListeners.delete(callback as RealtimeCallback<unknown>);

            if (collectionListeners.size === 0) {
                this.listeners.delete(collection);
                this.activeSubscriptions.delete(collection);
                try {
                    await pb.collection(collection).unsubscribe("*");
                } catch (error) {
                    console.error(
                        `[RealtimeGateway] Error unsubscribing from ${collection}:`,
                        error,
                    );
                }
            }
        }
    }

    private emit(
        collection: string,
        event: PBRealtimeEvent<RecordModel>,
    ): void {
        const collectionListeners = this.listeners.get(collection);
        if (collectionListeners) {
            for (const listener of collectionListeners) {
                listener(event);
            }
        }
    }

    public onSystemEvent(
        event: "RECONNECTED",
        callback: () => void,
    ): () => void {
        if (!this.systemListeners.has(event)) {
            this.systemListeners.set(event, new Set());
        }
        this.systemListeners.get(event)?.add(callback);

        return () => {
            this.systemListeners.get(event)?.delete(callback);
        };
    }

    private emitSystemEvent(event: "RECONNECTED"): void {
        const listeners = this.systemListeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                listener();
            }
        }
    }
}

export const realtimeGateway = RealtimeGateway.getInstance();
