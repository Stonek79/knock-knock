export const OUTBOX_MAX_RETRIES = 5;

export type OutboxFailureUpdate = {
    status: "pending" | "failed";
    retryCount?: number;
};

/** Возвращает безопасное состояние Outbox после неудачной отправки. */
export function getOutboxFailureUpdate(
    retryCount: number,
): OutboxFailureUpdate {
    if (retryCount >= OUTBOX_MAX_RETRIES) {
        return { status: "failed" };
    }

    return {
        status: "pending",
        retryCount: retryCount + 1,
    };
}
