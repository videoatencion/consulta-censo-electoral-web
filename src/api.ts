/**
 * Client de l'API del backend de consulta del cens electoral.
 * Contracte: POST {apiBaseUrl}/consulta amb JSON; el navegador no envia mai
 * cap capçalera d'autorització (l'afegeix el proxy nginx).
 */

export const DISAMBIG_FIELDS = ['day', 'year', 'fn', 'sn1', 'sn2', 'postCode', 'colele'] as const
export type DisambigField = (typeof DISAMBIG_FIELDS)[number]

/** Camps que pot aportar el ciutadà (colele no). */
export type UserField = Exclude<DisambigField, 'colele'>
export const USER_FIELDS: readonly UserField[] = ['day', 'year', 'fn', 'sn1', 'sn2', 'postCode']

export interface PollingStation {
  poblacion: string
  distrito: string
  seccion: string
  mesa: string
  colele: string
  dircol: string
  postCode?: string
}

export interface ConsultaPayload {
  citizenId: string
  day?: string
  year?: string
  fn?: string
  sn1?: string
  sn2?: string
  postCode?: string
}

export type ConsultaResult =
  | { type: 'found'; station: PollingStation }
  | { type: 'disambiguate'; fields: UserField[]; onlyColele: boolean }
  | { type: 'not-found' }
  | { type: 'invalid'; message: string }
  | { type: 'service-loading' }
  | { type: 'unauthorized' }
  | { type: 'rate-limited' }
  | { type: 'network-error' }

/** Parseja "[day year sn2]" → ['day','year','sn2']; ignora valors desconeguts. */
export function parseDisambiguation(message: string): DisambigField[] {
  const m = /^\[([^\]]*)\]$/.exec(message.trim())
  if (!m) return []
  return m[1]
    .split(/\s+/)
    .filter((f): f is DisambigField => (DISAMBIG_FIELDS as readonly string[]).includes(f))
}

const TIMEOUT_MS = 10_000

export async function consulta(
  apiBaseUrl: string,
  payload: ConsultaPayload,
  timeoutMs: number = TIMEOUT_MS,
): Promise<ConsultaResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(`${apiBaseUrl}/consulta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch {
    return { type: 'network-error' }
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 429) return { type: 'rate-limited' }
  if (res.status === 503) return { type: 'service-loading' }
  if (res.status === 403) return { type: 'unauthorized' }
  if (!res.ok) return { type: 'network-error' }

  let body: Record<string, unknown>
  try {
    body = (await res.json()) as Record<string, unknown>
  } catch {
    return { type: 'network-error' }
  }

  const errorMessage = typeof body.errorMessage === 'string' ? body.errorMessage : ''

  if (errorMessage === '') {
    // Una resposta 200 sense col·legi ni mesa no és un resultat vàlid.
    if (!body.colele && !body.mesa) return { type: 'network-error' }
    return {
      type: 'found',
      station: {
        poblacion: String(body.poblacion ?? ''),
        distrito: String(body.distrito ?? ''),
        seccion: String(body.seccion ?? ''),
        mesa: String(body.mesa ?? ''),
        colele: String(body.colele ?? ''),
        dircol: String(body.dircol ?? ''),
        postCode: typeof body.postCode === 'string' ? body.postCode : undefined,
      },
    }
  }

  if (errorMessage === 'no records found') return { type: 'not-found' }
  if (errorMessage === 'service loading') return { type: 'service-loading' }

  if (errorMessage.startsWith('[')) {
    const fields = parseDisambiguation(errorMessage)
    const userFields = fields.filter((f): f is UserField => f !== 'colele')
    return { type: 'disambiguate', fields: userFields, onlyColele: userFields.length === 0 }
  }

  if (errorMessage.startsWith('invalid request')) {
    return { type: 'invalid', message: errorMessage }
  }

  // Missatge desconegut: es tracta com a petició invàlida.
  return { type: 'invalid', message: errorMessage }
}
