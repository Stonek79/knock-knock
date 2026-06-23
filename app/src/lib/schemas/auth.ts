import { z } from "zod";

/**
 * Схема полей регистрации (для доступа к .shape в формах)
 */
export const registerFieldsSchema = z.object({
    username: z
        .string()
        .min(3, { message: "auth.usernameTooShort" })
        .max(30, { message: "auth.usernameTooLong" })
        .regex(/^[a-zA-Z0-9_]+$/, { message: "auth.usernameInvalid" }),
    invite_code: z.string().min(6, { message: "auth.inviteCodeTooShort" }),
    display_name: z
        .string()
        .min(2, { message: "auth.displayNameTooShort" })
        .max(50, { message: "auth.displayNameTooLong" }),
    password: z
        .string()
        .min(8, { message: "auth.passwordTooShort" })
        .max(50, { message: "auth.passwordTooLong" })
        .regex(/^[a-zA-Z0-9!@#$%^&*()_+-=]*$/, {
            message: "auth.passwordLatinOnly",
        })
        .regex(/[a-zA-Z]/, { message: "auth.passwordNeedLetter" })
        .regex(/[0-9]/, { message: "auth.passwordNeedNumber" }),
    passwordConfirm: z.string(),
    agreeToTerms: z.literal(true, { message: "auth.mustAgreeToTerms" }),
});

export const loginSchema = z.object({
    username: z.string().min(1, { message: "auth.usernameRequired" }),
    password: z
        .string()
        .min(8, { message: "auth.passwordTooShort" })
        .max(50, { message: "auth.passwordTooLong" }),
});
