// Простая реализация EventEmitter для имитации Realtime
export class MockEventEmitter {
	// biome-ignore lint/complexity/noBannedTypes: Mocking type
	private listeners: Record<string, Function[]> = {};

	// biome-ignore lint/complexity/noBannedTypes: Mocking type
	on(event: string, callback: Function) {
		if (!this.listeners[event]) this.listeners[event] = [];
		this.listeners[event].push(callback);
		return () => {
			this.listeners[event] = this.listeners[event].filter(
				(l) => l !== callback,
			);
		};
	}

	// biome-ignore lint/suspicious/noExplicitAny: Mocking payload
	emit(event: string, payload: any) {
		if (this.listeners[event]) {
			this.listeners[event].forEach((l) => {
				l(payload);
			});
		}
	}
}

export const mockEE = new MockEventEmitter();
