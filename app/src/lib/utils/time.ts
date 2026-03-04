/**
 * Форматирует время (в секундах) в строку формата `M:SS`.
 *
 * Используется для отображения длительности аудио/видео, таймеров и т.д.
 *
 * @example
 * ```ts
 * formatTime(0)      // "0:00"
 * formatTime(5)      // "0:05"
 * formatTime(65)     // "1:05"
 * formatTime(125)    // "2:05"
 * formatTime(NaN)    // "0:00"
 * ```
 *
 * @param time — Время в секундах (например, `audio.currentTime` или `audio.duration`)
 * @returns Отформатированная строка вида `M:SS` (минуты:секунды с ведущим нулём)
 */
export const formatTime = (time: number) => {
    if (!time || Number.isNaN(time)) {
        return "0:00";
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
