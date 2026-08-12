import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pb } from "@/lib/pocketbase";
import {
    cleanupDatabase,
    isDatabaseCleanupAllowed,
} from "./helpers/db-cleanup";

const describeIntegration = describe.skipIf(!isDatabaseCleanupAllowed());

describeIntegration("PocketBase is_test policy", () => {
    let folderId: string | undefined;

    beforeAll(async () => {
        await cleanupDatabase();
        await pb
            .collection("users")
            .authWithPassword("user1@example.com", "password123");
    });

    afterAll(async () => {
        if (folderId) {
            await pb.collection("user_folders").delete(folderId);
        }
        pb.authStore.clear();
    });

    it("не позволяет обычному пользователю создать is_test=true", async () => {
        await expect(
            pb.collection("user_folders").create({
                user: pb.authStore.model?.id,
                name: "runtime-policy-check-create",
                is_test: true,
            }),
        ).rejects.toThrow();
    });

    it("не позволяет обычному пользователю изменить is_test", async () => {
        const folder = await pb.collection("user_folders").create({
            user: pb.authStore.model?.id,
            name: "runtime-policy-check-update",
            is_test: false,
        });
        folderId = folder.id;

        await expect(
            pb.collection("user_folders").update(folder.id, {
                is_test: true,
            }),
        ).rejects.toThrow();

        const persisted = await pb.collection("user_folders").getOne(folder.id);
        expect(persisted.is_test).not.toBe(true);
    });
});
