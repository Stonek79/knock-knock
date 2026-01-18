import { z } from 'zod';

export const loginSchema = z.object({
    email: z.email({ message: 'validation.emailInvalid' }),
});

export type LoginSchema = z.infer<typeof loginSchema>;
