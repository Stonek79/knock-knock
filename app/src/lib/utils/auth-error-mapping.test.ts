import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@/lib/constants";
import { appError } from "@/lib/utils/result";
import { getAuthErrorKey } from "./auth-error-mapping";

describe("getAuthErrorKey", () => {
    it("maps known registration invite failures without exposing backend text", () => {
        const error = appError(
            ERROR_CODES.VALIDATION_ERROR,
            "Ошибка регистрации",
            { response: { message: "Invite expired" } },
        );

        expect(getAuthErrorKey(error, "register")).toBe(
            "auth.errors.inviteExpired",
        );
    });

    it("uses a generic registration message for unknown backend failures", () => {
        const error = appError(ERROR_CODES.DB_ERROR, "Ошибка регистрации", {
            response: { message: "internal details" },
        });

        expect(getAuthErrorKey(error, "register")).toBe(
            "auth.errors.registerFailed",
        );
    });

    it("keeps login and network semantics distinct", () => {
        expect(
            getAuthErrorKey(
                appError(ERROR_CODES.AUTHENTICATION_ERROR, "login failed"),
            ),
        ).toBe("auth.errors.invalidCredentials");
        expect(
            getAuthErrorKey(appError(ERROR_CODES.NETWORK_ERROR, "offline")),
        ).toBe("auth.errors.serverUnreachable");
    });

    it("never returns raw technical text for an unknown standard error", () => {
        expect(
            getAuthErrorKey(new Error("PocketBase connection details")),
        ).toBe("auth.errors.unknown");
        expect(
            getAuthErrorKey(
                new Error("PocketBase connection details"),
                "register",
            ),
        ).toBe("auth.errors.registerFailed");
    });

    it("maps unauthorized errors to the safe localized key", () => {
        expect(
            getAuthErrorKey(
                appError(
                    ERROR_CODES.UNAUTHORIZED_ERROR,
                    "Пожалуйста, войдите в систему",
                ),
            ),
        ).toBe("auth.errors.unauthorized");
    });

    it("uses the nested PocketBase validation message for invite mapping", () => {
        const error = appError(ERROR_CODES.VALIDATION_ERROR, "Ошибка", {
            response: {
                data: {
                    invite_code: { message: "Invite code is required" },
                },
            },
        });

        expect(getAuthErrorKey(error, "register")).toBe(
            "auth.errors.inviteRequired",
        );
    });
});
