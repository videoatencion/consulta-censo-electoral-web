import type { Messages } from './i18n'

/**
 * Format de la part del document que indexa el backend (GET {apiBaseUrl}/formato)
 * i retall del document al navegador, amb les mateixes regles que el
 * `documentKey` del microservei Go: el document sencer no surt mai del navegador.
 */

export interface DocumentFormat {
  documentChars: number
  firstChars: boolean
  addLetter: boolean
}

/** DNI fictici usat als exemples d'ajuda del formulari. */
export const EXAMPLE_DOC = '12345678Z'

/** Majúscules i només [A-Z0-9] (treu espais, guions, punts...). Regla 1 del backend. */
export function normalizeForIndex(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Retalla el document exactament com el backend:
 * - documentChars == 0 → el document sencer.
 * - firstChars && addLetter → primers n + l'últim caràcter (si és més llarg de n+1).
 * - firstChars → primers n.
 * - altrament → els n últims.
 */
export function reduceDocument(raw: string, format: DocumentFormat): string {
  const doc = normalizeForIndex(raw)
  const n = format.documentChars
  if (n === 0) return doc
  if (format.firstChars && format.addLetter) {
    return doc.length <= n + 1 ? doc : doc.slice(0, n) + doc.slice(-1)
  }
  if (format.firstChars) {
    return doc.length <= n ? doc : doc.slice(0, n)
  }
  return doc.length <= n ? doc : doc.slice(-n)
}

/** Longitud màxima de la part indexada (n, o n+1 si s'hi afegeix la lletra). */
export function reducedMaxLength(format: DocumentFormat): number {
  if (format.documentChars === 0) return 20
  return format.firstChars && format.addLetter ? format.documentChars + 1 : format.documentChars
}

/** Valida la resposta de GET /formato: enters >= 0 i booleans estrictes. */
export function validateFormato(raw: unknown): DocumentFormat | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  const { documentChars, firstChars, addLetter } = obj
  if (
    typeof documentChars !== 'number' ||
    !Number.isInteger(documentChars) ||
    documentChars < 0
  ) {
    return null
  }
  if (typeof firstChars !== 'boolean' || typeof addLetter !== 'boolean') return null
  return { documentChars, firstChars, addLetter }
}

const TIMEOUT_MS = 10_000

/**
 * Carrega el format del document del backend. Si falla (xarxa, 403, 404, 5xx,
 * timeout o resposta invàlida) retorna null: MAI s'assumeix el document sencer.
 */
export async function loadFormato(
  apiBaseUrl: string,
  timeoutMs: number = TIMEOUT_MS,
): Promise<DocumentFormat | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${apiBaseUrl}/formato`, { signal: controller.signal })
    if (!res.ok) return null
    return validateFormato(await res.json())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Etiqueta, ajuda i placeholder del camp del document segons el format. */
export function docFieldTexts(
  t: Messages,
  format: DocumentFormat,
): { label: string; help: string; placeholder: string } {
  if (format.documentChars === 0) {
    return { label: t.docLabel, help: t.docHelp, placeholder: t.docPlaceholder }
  }
  const example = reduceDocument(EXAMPLE_DOC, format)
  const label = format.firstChars
    ? format.addLetter
      ? t.docLabelFirstLetter(format.documentChars)
      : t.docLabelFirst(format.documentChars)
    : t.docLabelLast(format.documentChars)
  return {
    label,
    help: t.docHelpReduced(example),
    placeholder: t.docPlaceholderReduced(example),
  }
}
