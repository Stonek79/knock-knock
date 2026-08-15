/**
 * Неизменяемые константы маршрутов, лимитов и имён коллекций для custom
 * user-routes. Модуль не содержит $app/$apis/$security/Record, не открывает
 * сеть и не имеет побочных эффектов при загрузке.
 */

const USERS_API_ROUTES = {
	CONTACTS: "/api/custom/users/contacts",
	SEARCH: "/api/custom/users/search",
	KEYS: "/api/custom/users/keys",
};

const SUPERUSERS_COLLECTION_NAME = "_superusers";

const USERS_ROUTE_LIMITS = {
	MAX_CONTACTS: 500,
	DEFAULT_SEARCH_PAGE_SIZE: 50,
	MAX_SEARCH_PAGE_SIZE: 50,
	MAX_SEARCH_PAGE: 100,
	MAX_SEARCH_QUERY_LENGTH: 100,
};

module.exports = {
	USERS_API_ROUTES,
	SUPERUSERS_COLLECTION_NAME,
	USERS_ROUTE_LIMITS,
};
