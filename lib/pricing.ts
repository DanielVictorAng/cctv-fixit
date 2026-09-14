// Pricing engine — docs/02-logic.md §Pricing Engine
// Formula: baseLabour + (sum(materialCosts) × MARKUP) + sum(surcharges), rounded to integer.

export const MARKUP = 1.2

export const SURCHARGES = {
  EMERGENCY: 500,
  WEEKEND: 200,
  AFTER_HOURS: 300,
  ZONE_6: 300,
} as const

export type SurchargeType = keyof typeof SURCHARGES

const DOWNPAYMENT_THRESHOLD = 5000

export type PricingInput = {
  baseLabour: number
  materialCosts: number[]
  surcharges?: SurchargeType[]
}

export type PricingResult = {
  quoted_labour: number
  quoted_materials: number
  final_total: number
  downpayment_amount: number | null
}

export function calculateQuote({
  baseLabour,
  materialCosts,
  surcharges = [],
}: PricingInput): PricingResult {
  const materialCost = materialCosts.reduce((sum, cost) => sum + cost, 0)
  const surchargeTotal = surcharges.reduce((sum, s) => sum + SURCHARGES[s], 0)

  const quoted_labour = Math.round(baseLabour)
  const quoted_materials = Math.round(materialCost * MARKUP)
  const final_total = Math.round(baseLabour + materialCost * MARKUP + surchargeTotal)

  return {
    quoted_labour,
    quoted_materials,
    final_total,
    downpayment_amount:
      final_total > DOWNPAYMENT_THRESHOLD ? Math.round(final_total * 0.5) : null,
  }
}

/** Warranty claim: no labour, materials at cost (no markup). docs/02-logic.md §Warranty */
export function calculateWarrantyQuote({
  materialCosts,
}: {
  materialCosts: number[]
}): PricingResult {
  const materialCost = Math.round(materialCosts.reduce((sum, cost) => sum + cost, 0))
  return {
    quoted_labour: 0,
    quoted_materials: materialCost,
    final_total: materialCost,
    downpayment_amount: null,
  }
}
