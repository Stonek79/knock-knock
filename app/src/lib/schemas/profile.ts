import { z } from 'zod';
import { VALIDATION } from '@/lib/constants';

export const profileSchema = z.object({
    username: z
        .string()
        .min(VALIDATION.USERNAME_MIN_LENGTH, {
            message: 'validation.usernameMin',
        })
        .optional(),
    display_name: z.string().optional(),
});

export type ProfileSchema = z.infer<typeof profileSchema>;
