// docs/04-integrations.md §Outbound Templates
export type TemplateKey = 'quote' | 'dispatch' | 'complete' | 'warranty' | 'reminder' | 'ack'

export const TEMPLATES: Record<TemplateKey, string> = {
  quote: 'Hi {name}! Quote for {service}: ₱{amount}. Valid 7 days. Reply YES to schedule. 🙏',
  dispatch: 'Hi {name}! Tech {tech_name} arriving {time_window}. Salamat! 🙏',
  complete: 'Hi {name}! Job done ✅ Total: ₱{amount}. GCash: {number}. Salamat po!',
  warranty: 'Hi {name}! Follow-up — okay pa ba yung {service}? Message lang po if may issue. 😊',
  reminder: 'Hi {name}! Reminder: appointment tomorrow {time}. See you po! 👍',
  ack: 'Salamat {name}! Natanggap na po namin ang message niyo. We will get back to you shortly. 🙏',
}

/** Substitute {placeholders}; unknown keys become empty strings. */
export function renderTemplate(
  key: TemplateKey,
  vars: Record<string, string | number> = {}
): string {
  return TEMPLATES[key].replace(/{(\w+)}/g, (_match, name: string) => {
    const value = vars[name]
    return value === undefined ? '' : String(value)
  })
}
