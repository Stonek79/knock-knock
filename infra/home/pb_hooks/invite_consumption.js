/**
 * Atomically spends an invite usage in the PocketBase SQLite database.
 *
 * The conditional UPDATE is the concurrency boundary: SQLite serializes the
 * write, and rowsAffected() tells the caller whether this request won the
 * usage slot. The preliminary record read is still useful for a friendly
 * error, but it is not trusted for the final decision.
 */
function consumeInviteAtomically(app, inviteId, { room = "" } = {}) {
	if (!app || typeof app.db !== "function" || !inviteId) {
		throw new Error("Invite storage is unavailable");
	}

	const DB = require(`${__hooks}/db.js`);
	const result = app
		.db()
		.newQuery(
			`UPDATE ${DB.TABLES.INVITES}
			 SET uses_count = COALESCE(uses_count, 0) + 1
			 WHERE id = {:inviteId}
			   AND (COALESCE(max_uses, 0) = 0 OR COALESCE(uses_count, 0) < COALESCE(max_uses, 0))
			   AND (COALESCE(expires_at, '') = '' OR datetime(expires_at) > datetime('now'))
			   AND COALESCE(room, '') = {:room}`,
		)
		.bind({ inviteId, room })
		.execute();

	const affectedRows =
		typeof result?.rowsAffected === "function"
			? result.rowsAffected()
			: result?.rowsAffected;
	if (!Number.isFinite(affectedRows)) {
		throw new Error("Invite storage did not report affected rows");
	}

	return affectedRows === 1;
}

module.exports = { consumeInviteAtomically };
