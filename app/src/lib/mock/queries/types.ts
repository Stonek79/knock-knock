export interface QueryFilter {
	column: string;
	value: unknown;
}

export interface QueryOrder {
	column: string;
	options?: {
		ascending?: boolean;
		nullsFirst?: boolean;
		foreignTable?: string;
	};
}

export interface QueryState {
	operation: "select" | "insert" | "update" | "delete";
	filters: QueryFilter[];
	order?: QueryOrder;
	single: boolean;
	limit?: number;
	updateValues?: Record<string, unknown>;
}

export type QueryHandler<T> = (state: QueryState) => Promise<{
	data: T | T[] | null;
	error: { message: string; code: string; details?: unknown } | null;
}>;
