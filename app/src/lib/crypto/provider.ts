/**
 * Единая безопасная точка доступа к Web Crypto API.
 * Автоматически подстраивается под среду выполнения:
 * - Основной поток браузера (window)
 * - Web Worker (self)
 * - Тестовые среды (globalThis)
 */
export const getCryptoProvider = (): Crypto => {
    if (typeof window !== "undefined" && window.crypto) {
        return window.crypto;
    }
    if (typeof self !== "undefined" && self.crypto) {
        return self.crypto;
    }
    if (typeof globalThis !== "undefined" && globalThis.crypto) {
        return globalThis.crypto;
    }
    throw new Error("Web Crypto API недоступен в текущей среде выполнения.");
};

export const cryptoProvider = getCryptoProvider();
export const subtleProvider = cryptoProvider.subtle;
