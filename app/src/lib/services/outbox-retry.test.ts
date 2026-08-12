import { describe, expect, it } from "vitest";
import { getOutboxFailureUpdate, OUTBOX_MAX_RETRIES } from "./outbox-retry";

describe("getOutboxFailureUpdate", () => {
    it("повторяет отправку, пока лимит retry не достигнут", () => {
        expect(getOutboxFailureUpdate(0)).toEqual({
            status: "pending",
            retryCount: 1,
        });
        expect(getOutboxFailureUpdate(OUTBOX_MAX_RETRIES - 1)).toEqual({
            status: "pending",
            retryCount: OUTBOX_MAX_RETRIES,
        });
    });

    it("помечает сообщение failed после лимита retry", () => {
        expect(getOutboxFailureUpdate(OUTBOX_MAX_RETRIES)).toEqual({
            status: "failed",
        });
        expect(getOutboxFailureUpdate(OUTBOX_MAX_RETRIES + 1)).toEqual({
            status: "failed",
        });
    });
});
