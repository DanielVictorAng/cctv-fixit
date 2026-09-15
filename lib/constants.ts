/** Equipment at or below this stock level is shown as low stock. */
export const LOW_STOCK_THRESHOLD = 5

/** outbound_queue drain. Cron cadence per docs/04-integrations.md is 15 min. */
export const OUTBOUND_RETRY_MS = 15 * 60 * 1000
/** After this many total attempts a queued message stops retrying and is FAILED. */
export const OUTBOUND_MAX_ATTEMPTS = 10
/** Rows handled per drain run. */
export const OUTBOUND_BATCH_SIZE = 25
