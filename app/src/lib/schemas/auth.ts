import { z } from 'zod';

export const loginSchema = z.object({
    email: z.email({ message: 'Invalid email address' }), // TODO: почему хардкодим? нужно использовать локали
});

export type LoginSchema = z.infer<typeof loginSchema>;
