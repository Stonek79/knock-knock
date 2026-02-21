import type { Profile } from "@/lib/types/profile";
import { MOCK_USERS } from "../data";
import type { QueryHandler, QueryState } from "./types";

/**
 * Обработчик запросов к таблице profiles
 */
export const handleProfilesQuery: QueryHandler<Profile> = async (
	state: QueryState,
) => {
	// В текущей реализации мы только читаем профили из MOCK_USERS
	// Insert/Update/Delete профилей пока не реализован в моках (обычно через AuthGoTrue)

	// Приводим MockUser к Profile (у MockUser avatar_url?: string, у Profile avatar_url: string | null)
	let data: Profile[] = MOCK_USERS.map((u) => ({
		...u,
		avatar_url: u.avatar_url ?? null,
		created_at: undefined,
		last_seen: undefined,
		status: undefined,
		is_agreed_to_rules: undefined,
		banned_until: undefined,
	}));

	// 1. Filter
	for (const filter of state.filters) {
		data = data.filter((item) => {
			const itemValue = (item as unknown as Record<string, unknown>)[
				filter.column
			];
			if (Array.isArray(filter.value)) {
				return (filter.value as unknown[]).includes(itemValue);
			}
			return itemValue === filter.value;
		});
	}

	// 2. Order
	if (state.order) {
		const { column, options } = state.order;
		data.sort((a, b) => {
			const valA = (a as unknown as Record<string, unknown>)[column];
			const valB = (b as unknown as Record<string, unknown>)[column];
			if ((valA as number) < (valB as number))
				return options?.ascending ? -1 : 1;
			if ((valA as number) > (valB as number))
				return options?.ascending ? 1 : -1;
			return 0;
		});
	}

	// 3. Limit
	if (state.limit) {
		data = data.slice(0, state.limit);
	}

	// 4. Single
	if (state.single) {
		return data.length > 0
			? { data: data[0], error: null }
			: {
					data: null,
					error: { message: "Profile not found", code: "PGRST116" },
				};
	}

	return { data, error: null };
};
