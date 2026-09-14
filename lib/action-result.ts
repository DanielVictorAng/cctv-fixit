/** Every server action returns this shape (docs/00-rules.md §Error Handling). */
export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}
