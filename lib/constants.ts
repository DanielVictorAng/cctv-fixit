export const PHOTO_BUCKET = 'ticket-photos'
export const MAX_PHOTO_BYTES = 1024 * 1024
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Materials at or below this stock level get a low-stock alert. */
export const LOW_STOCK_THRESHOLD = 5

/** outbound_queue drain. Cron cadence per docs/04-integrations.md is 15 min. */
export const OUTBOUND_RETRY_MS = 15 * 60 * 1000
/** After this many total attempts a queued message stops retrying and is FAILED. */
export const OUTBOUND_MAX_ATTEMPTS = 10
/** Rows handled per drain run. */
export const OUTBOUND_BATCH_SIZE = 25
