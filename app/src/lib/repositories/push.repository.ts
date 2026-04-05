import { DB_TABLES, PUSH_SUBSCRIPTIONS_FIELDS } from "../constants";
import { pb } from "../pocketbase";
import type {
    AppError,
    PushSubscriptionsRecord,
    PushSubscriptionsResponse,
    Result,
} from "../types";
import { mapPbErrorCode } from "../utils/errors";
import { appError, fromPromise } from "../utils/result";

type PushRepoError = AppError<string>;

export const pushRepository = {
    /**
     * Ищет подписку по endpoint
     */
    findByEndpoint: async (
        endpoint: string,
    ): Promise<Result<PushSubscriptionsResponse | null, PushRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.PUSH_SUBSCRIPTIONS)
                .getFirstListItem<PushSubscriptionsResponse>(
                    `${PUSH_SUBSCRIPTIONS_FIELDS.ENDPOINT}="${endpoint}"`,
                )
                .catch((e) => {
                    // Если ошибка 404 (сообщения нет) - возвращаем null
                    if (e.status === 404) {
                        return null;
                    }

                    throw e;
                }),
            (e) => appError(mapPbErrorCode(e), "Ошибка поиска подписки", e),
        );
    },

    /**
     * Создаёт новую подписку
     */
    create: async (
        data: Omit<PushSubscriptionsRecord, "id" | "created" | "updated">,
    ): Promise<Result<PushSubscriptionsRecord, PushRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.PUSH_SUBSCRIPTIONS)
                .create<PushSubscriptionsRecord>(data),
            (e) => appError(mapPbErrorCode(e), "Ошибка сохранения подписки", e),
        );
    },

    /**
     * Обновляет подписку
     */
    update: async (
        id: string,
        data: Partial<PushSubscriptionsRecord>,
    ): Promise<Result<PushSubscriptionsRecord, PushRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.PUSH_SUBSCRIPTIONS)
                .update<PushSubscriptionsRecord>(id, data),
            (e) => appError(mapPbErrorCode(e), "Ошибка обновления подписки", e),
        );
    },

    /**
     * Удаляет подписку
     */
    delete: async (id: string): Promise<Result<void, PushRepoError>> => {
        return fromPromise(
            pb
                .collection(DB_TABLES.PUSH_SUBSCRIPTIONS)
                .delete(id)
                .then(() => {}),
            (e) => appError(mapPbErrorCode(e), "Ошибка удаления подписки", e),
        );
    },
};
