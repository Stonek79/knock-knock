import type { z } from "zod";
import type {
    activeCallSessionSchema,
    activeCallStatusSchema,
    incomingCallSessionSchema,
} from "@/lib/schemas/calls";

/**
 * Статус активной сессии вызова (FSM), выведенный из Zod-схемы
 */
export type ActiveCallStatus = z.infer<typeof activeCallStatusSchema>;

/**
 * Интерфейс текущей активной сессии звонка, выведенный из Zod-схемы
 */
export type ActiveCallSession = z.infer<typeof activeCallSessionSchema>;

/**
 * Интерфейс входящей сессии звонка (вторая линия), выведенный из Zod-схемы
 */
export type IncomingCallSession = z.infer<typeof incomingCallSessionSchema>;
