import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import { API_ROUTES } from "../constants";
import { logger } from "../logger";
import { pb } from "../pocketbase";

export const InviteService = {
    generateInvite: async (): Promise<Result<{ code: string }, Error>> => {
        try {
            const result = await pb.send(API_ROUTES.INVITES_GENERATE, {
                method: "POST",
            });
            return ok(result);
        } catch (error: unknown) {
            logger.error("Ошибка при генерации инвайта:", error);
            if (error instanceof Error) {
                return err(error);
            }
            if (error && typeof error === "object" && "message" in error) {
                return err(new Error(String(error.message)));
            }
            return err(new Error("Неизвестная ошибка генерации инвайта"));
        }
    },
};
