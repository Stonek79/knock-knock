import { z } from 'zod';

export const loginSchema = z.object({
    email: z.email({ message: 'validation.emailInvalid' }),
    password: z.string().optional(),
});
