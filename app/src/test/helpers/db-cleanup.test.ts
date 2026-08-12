import { describe, expect, it } from "vitest";
import { isDatabaseCleanupAllowed } from "./db-cleanup";

describe("isDatabaseCleanupAllowed", () => {
    it.each([
        ["https://api.whoami.ninja", "true"],
        ["https://unknown.example", "true"],
        ["https://dev-api.whoami.ninja", "false"],
        ["https://dev-api.whoami.ninja", undefined],
        ["", "true"],
        ["not-a-url", "true"],
    ])("запрещает cleanup для %s с флагом %s", (pbUrl, allowCleanup) => {
        expect(isDatabaseCleanupAllowed({ pbUrl, allowCleanup })).toBe(false);
    });

    it.each([
        "http://localhost:8090",
        "http://127.0.0.1:9090",
        "https://dev-api.whoami.ninja",
        "https://staging-api.whoami.ninja",
        "https://test-api.whoami.ninja",
    ])("разрешает cleanup только на известном test URL: %s", (pbUrl) => {
        expect(isDatabaseCleanupAllowed({ pbUrl, allowCleanup: "true" })).toBe(
            true,
        );
    });
});
