import "@testing-library/jest-dom";

/**
 * Mock для window.matchMedia, так как JSDOM не поддерживает его по умолчанию.
 * Возвращает "не совпадает" для всех media queries в тестах.
 */
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    }),
});
