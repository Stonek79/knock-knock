import { z } from "zod";

/**
 * Схема полей регистрации (для доступа к .shape в формах)
 */
export const registerFieldsSchema = z.object({
    email: z.email({ message: "auth.emailInvalid" }),
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
    email: z.email({ message: "auth.emailInvalid" }),
    password: z
        .string()
        .min(8, { message: "auth.passwordTooShort" })
        .max(50, { message: "auth.passwordTooLong" }),
});
