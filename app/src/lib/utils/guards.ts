/** Проверки значений, полученных на недоверенных границах. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;
