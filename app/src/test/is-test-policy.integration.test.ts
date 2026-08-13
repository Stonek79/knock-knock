import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pb } from "@/lib/pocketbase";
import {
    cleanupDatabase,
    isDatabaseCleanupAllowed,
} from "./helpers/db-cleanup";

const describeIntegration = describe.skipIf(!isDatabaseCleanupAllowed());

describeIntegration("PocketBase is_test policy", () => {
    const createdIds: { room?: string } = {};

    beforeAll(async () => {
        await cleanupDatabase();
        await pb
            .collection("users")
            .authWithPassword("user1@example.com", "password123");
    });

    afterAll(async () => {
        if (createdIds.room) {
            // Security hook deliberately forbids deleting the owner membership.
            // Deleting its room is the supported cleanup path.
            await pb.collection("rooms").delete(createdIds.room);
        }
        pb.authStore.clear();
    });

    it("не позволяет обычному пользователю создать is_test=true", async () => {
        await expect(
            pb.collection("rooms").create({
                created_by: pb.authStore.model?.id,
                type: "group",
                visibility: "private",
                name: "runtime-policy-check-create",
                is_test: true,
            }),
        ).rejects.toThrow();
    });

    it("не позволяет обычному пользователю изменить is_test", async () => {
        const userId = pb.authStore.model?.id;
        const room = await pb.collection("rooms").create({
            created_by: userId,
            type: "group",
            visibility: "private",
            name: "runtime-policy-check-update",
            is_test: false,
        });
        createdIds.room = room.id;

        const member = await pb.collection("room_members").create({
            room: room.id,
            user: userId,
            role: "owner",
            unread_count: 0,
        });
        expect(member.id).toBeTruthy();

        await expect(
            pb.collection("rooms").update(room.id, {
                is_test: true,
            }),
        ).rejects.toThrow();

        const persisted = await pb.collection("rooms").getOne(room.id);
        expect(persisted.is_test).not.toBe(true);
    });
});
