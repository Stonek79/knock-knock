/**
 * Форматирует размер в байтах в человекочитаемый вид (KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
    if (!Number.isFinite(bytes) || bytes === 0) {
        return "0 Bytes";
    }

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}
