import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pb } from "@/lib/pocketbase";
import { isDatabaseCleanupAllowed } from "./helpers/db-cleanup";

const describeIntegration = describe.skipIf(!isDatabaseCleanupAllowed());

describeIntegration("PocketBase filter parameter binding", () => {
    beforeAll(async () => {
        await pb
            .collection("users")
            .authWithPassword("user1@example.com", "password123");
    });

    afterAll(() => {
        pb.authStore.clear();
    });

    it("rejects an invalid invite payload instead of creating a user", async () => {
        const username = `binding-probe-${Date.now()}`;
        const injectedInvite = "' || code != '' || code = '";

        await expect(
            pb.collection("users").create({
                username,
                password: "password123",
                passwordConfirm: "password123",
                invite_code: injectedInvite,
            }),
        ).rejects.toThrow();

        await expect(
            pb.collection("users").getFirstListItem(`username = '${username}'`),
        ).rejects.toThrow();
    });

    it("does not turn a search query into an unrestricted user filter", async () => {
        const injectedQuery = "' || id != '' || username ~ '";
        const response = await pb.send<unknown[]>(
            `/api/custom/users/search?q=${encodeURIComponent(injectedQuery)}`,
            { method: "GET" },
        );

        expect(response).toEqual([]);
    });
});
