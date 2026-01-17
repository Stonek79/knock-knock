import { useCallback } from 'react';

/**
 * Хук для скачивания данных в виде файла.
 * Инкапсулирует работу с DOM (создание ссылок, revokeObjectURL).
 */
export function useFileDownloader() {
    const downloadJson = useCallback((data: unknown, filename: string) => {
        try {
            const blob = new Blob([JSON.stringify(data)], {
                type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');

            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            // Очистка
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            throw new Error('Failed to download file');
        }
    }, []);

    return { downloadJson };
}
