import type { DBClient } from '@/lib/supabase-client'

/** A catalog material and how many of it a job needs. */
export type MaterialLine = { material_id: string; quantity: number }

/** A material line with its catalog cost at the time it was priced. */
export type PricedLine = MaterialLine & { unit_cost: number }

/** One line per material: the same material picked twice becomes one line. */
export function mergeMaterialLines(lines: MaterialLine[]): MaterialLine[] {
  const quantities = new Map<string, number>()
  for (const line of lines) {
    quantities.set(line.material_id, (quantities.get(line.material_id) ?? 0) + line.quantity)
  }
  return [...quantities].map(([material_id, quantity]) => ({ material_id, quantity }))
}

/**
 * Attach each line's catalog cost_price, never a price from the browser
 * (docs/00-rules.md §Architecture Rules 5). Null when a material no longer exists.
 */
export async function priceMaterialLines(
  supabase: DBClient,
  lines: MaterialLine[]
): Promise<PricedLine[] | null> {
  if (lines.length === 0) return []
  const { data } = await supabase
    .from('materials')
    .select('id,cost_price')
    .in('id', lines.map((line) => line.material_id))
  const costs = new Map((data ?? []).map((material) => [material.id, Number(material.cost_price)]))
  if (lines.some((line) => !costs.has(line.material_id))) return null
  return lines.map((line) => ({ ...line, unit_cost: costs.get(line.material_id) ?? 0 }))
}

/** Each line's cost (unit cost × quantity), ready for calculateQuote(). */
export function lineCosts(lines: PricedLine[]): number[] {
  return lines.map((line) => line.unit_cost * line.quantity)
}
