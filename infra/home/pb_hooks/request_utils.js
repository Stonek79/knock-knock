/**
 * Чистый разбор/нормализация request body без PocketBase side effects.
 * Модуль не использует $app/$apis/$security/Record и не открывает сеть.
 */

/**
 * Разбирает JSON-тело POST-запроса. В PocketBase v0.25+ тело иногда не
 * попадает в requestInfo().body автоматически, поэтому есть raw fallback.
 */
function parseJsonBody(e) {
	const info = e.requestInfo();
	const body = info?.body;
	if (body && typeof body === "object" && !Array.isArray(body)) {
		return body;
	}
	const raw = e?.request.body ? toString(e.request.body) : "";
	if (raw) {
		try {
			return JSON.parse(raw);
		} catch (err) {
			console.error(`❌ [HOOK_ERROR] JSON parse error: ${err.message || err}`);
			return {};
		}
	}
	return {};
}

module.exports = { parseJsonBody };
