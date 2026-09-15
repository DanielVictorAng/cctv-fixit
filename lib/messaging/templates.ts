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

/**
 * Placeholders a template needs, read off the template string itself so the two
 * can never drift apart.
 */
export function templateVars(key: TemplateKey): string[] {
  const found = TEMPLATES[key].match(/{(\w+)}/g) ?? []
  return [...new Set(found.map((placeholder) => placeholder.slice(1, -1)))]
}

/**
 * Placeholders this call would leave blank. A non-empty result means the
 * message would reach a real customer with a hole in it — e.g. "Quote for :
 * ₱500" — so callers must refuse to send.
 */
export function missingTemplateVars(
  key: TemplateKey,
  vars: Record<string, string | number> = {}
): string[] {
  return templateVars(key).filter((name) => {
    const value = vars[name]
    return value === undefined || value === null || String(value).trim() === ''
  })
}

/** Names intake generates when the platform gave us nothing to work with. */
const PLACEHOLDER_NAME = /^(messenger|viber)\s+\S+$/i
const PHONE_LIKE_NAME = /^[+\d()\-\s]+$/

/**
 * First name to greet someone by, or "po".
 *
 * Messenger's webhook carries no name, so intake stores "messenger 1234567" and
 * a literal "Salamat messenger 1234567!" would be embarrassing. "po" is the
 * polite particle and sits exactly where the name goes in the Filipino
 * templates, so the sentence still reads naturally.
 */
export function greetingName(fullName: string | null | undefined): string {
  const name = fullName?.trim()
  if (!name) return 'po'
  if (PLACEHOLDER_NAME.test(name) || PHONE_LIKE_NAME.test(name)) return 'po'
  return name.split(/\s+/)[0]
}
