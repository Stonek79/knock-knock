import type { GHOST_STATUS } from "../constants/ghost";

/**
 * Статусы Ghost Mode.
 */
export type GhostStatus = (typeof GHOST_STATUS)[keyof typeof GHOST_STATUS];
