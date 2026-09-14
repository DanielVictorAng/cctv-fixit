export const PHOTO_BUCKET = 'ticket-photos'
export const MAX_PHOTO_BYTES = 1024 * 1024
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Materials at or below this stock level get a low-stock alert. */
export const LOW_STOCK_THRESHOLD = 5
