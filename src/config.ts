import { isLanguage, LANGUAGES, type Language } from './i18n'

/**
 * Càrrega i validació en runtime de public/config.json. Sense llibreries:
 * si falta algun camp obligatori o algun valor és insegur, l'aplicació mostra
 * una pantalla d'error de configuració en lloc d'arriscar-se a funcionar malament.
 */

/** Un text vàlid per a tots els idiomes, o un text per idioma (claus de `languages`). */
export type LocalizedText = string | Partial<Record<Language, string>>

export interface AppConfig {
  entityName: LocalizedText
  logoUrl: string
  logoAlt?: LocalizedText
  contactPhone?: string
  contactEmail?: string
  incidentsUrl?: string
  electionName?: LocalizedText
  apiBaseUrl: string
  /** Idiomes que ofereix la web, en l'ordre del selector. Amb un sol idioma no es mostra el selector. */
  languages: Language[]
  defaultLanguage: Language
  primaryColor?: string
}

export type ConfigResult =
  | { ok: true; config: AppConfig }
  | { ok: false; errors: string[] }

/**
 * Resol un LocalizedText a l'idioma actiu; si falta, al defaultLanguage;
 * si tampoc, al primer disponible de l'objecte.
 */
export function resolveText(
  text: LocalizedText,
  language: Language,
  defaultLanguage: Language,
): string {
  if (typeof text === 'string') return text
  return text[language] ?? text[defaultLanguage] ?? Object.values(text)[0] ?? ''
}

/** Accepta només URLs relatives o https: (rebutja javascript:, data:, http:...). */
export function isSafeUrl(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return false
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed)
  if (scheme) return scheme[1].toLowerCase() === 'https'
  // Relativa (./logo.svg, /logo.svg, logo.svg). Es rebutja // per no heredar esquema.
  return !trimmed.startsWith('//')
}

function parseHexColor(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Ratio de contrast WCAG entre dos colors hex (1..21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = parseHexColor(hexA)
  const b = parseHexColor(hexB)
  if (!a || !b) return 1
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** WCAG 2.1 AA: text normal sobre blanc demana >= 4.5:1. */
export function hasAdequateContrastOnWhite(hex: string): boolean {
  return contrastRatio(hex, '#ffffff') >= 4.5
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/**
 * Valida un camp de text traduïble: o bé un text (vàlid per a tots els
 * idiomes) o bé un objecte {idioma: text} amb claus dins de `languages`.
 * Els camps opcionals retornen undefined si no hi són; un objecte buit també
 * compta com a absent per als opcionals, però és error per als obligatoris.
 */
function parseLocalizedText(
  value: unknown,
  field: string,
  languages: Language[],
  required: boolean,
  errors: string[],
): LocalizedText | undefined {
  if (value === undefined || value === null) {
    if (required) errors.push(`Falta el camp obligatori "${field}"`)
    return undefined
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed !== '') return trimmed
    if (required) errors.push(`Falta el camp obligatori "${field}"`)
    return undefined
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      if (required) errors.push(`"${field}" ha de tenir almenys una traducció`)
      return undefined
    }
    const result: Partial<Record<Language, string>> = {}
    for (const [key, text] of entries) {
      if (!isLanguage(key) || !languages.includes(key)) {
        errors.push(`"${field}" té una clau d'idioma que no és a "languages": "${key}"`)
        continue
      }
      const trimmed = optionalString(text)
      if (!trimmed) {
        errors.push(`"${field}" té el text buit per a l'idioma "${key}"`)
        continue
      }
      result[key] = trimmed
    }
    return Object.keys(result).length > 0 ? result : undefined
  }
  errors.push(`"${field}" ha de ser un text o un objecte per idioma`)
  return undefined
}

/** Valida la llista d'idiomes: no buida, tots coneguts i sense duplicats. */
function parseLanguages(value: unknown, errors: string[]): Language[] {
  if (value === undefined) return [...LANGUAGES]
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('"languages" ha de ser una llista no buida d\'idiomes')
    return [...LANGUAGES]
  }
  const seen = new Set<Language>()
  const result: Language[] = []
  for (const item of value) {
    if (!isLanguage(item)) {
      errors.push(`"languages" conté un idioma no suportat: ${JSON.stringify(item)}`)
    } else if (seen.has(item)) {
      errors.push(`"languages" conté l'idioma duplicat "${item}"`)
    } else {
      seen.add(item)
      result.push(item)
    }
  }
  return result.length > 0 ? result : [...LANGUAGES]
}

export function validateConfig(raw: unknown): ConfigResult {
  const errors: string[] = []
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['config.json no és un objecte JSON'] }
  }
  const obj = raw as Record<string, unknown>

  const languages = parseLanguages(obj.languages, errors)

  let defaultLanguage: Language = languages[0]
  if (obj.defaultLanguage !== undefined) {
    if (!isLanguage(obj.defaultLanguage) || !languages.includes(obj.defaultLanguage)) {
      errors.push('"defaultLanguage" ha de ser un dels idiomes de "languages"')
    } else {
      defaultLanguage = obj.defaultLanguage
    }
  }

  const entityName = parseLocalizedText(obj.entityName, 'entityName', languages, true, errors)

  const logoUrl = optionalString(obj.logoUrl)
  if (!logoUrl) {
    errors.push('Falta el camp obligatori "logoUrl"')
  } else if (!isSafeUrl(logoUrl)) {
    errors.push('"logoUrl" ha de ser una URL relativa o https:')
  }

  const incidentsUrl = optionalString(obj.incidentsUrl)
  if (incidentsUrl && !isSafeUrl(incidentsUrl)) {
    errors.push('"incidentsUrl" ha de ser una URL relativa o https:')
  }

  const apiBaseUrl = optionalString(obj.apiBaseUrl) ?? '/api'
  if (!apiBaseUrl.startsWith('/')) {
    errors.push('"apiBaseUrl" ha de ser un camí relatiu al servidor (p. ex. "/api")')
  }

  let primaryColor = optionalString(obj.primaryColor)
  if (primaryColor) {
    if (!parseHexColor(primaryColor)) {
      errors.push('"primaryColor" ha de ser un color hex (#abc o #aabbcc)')
      primaryColor = undefined
    } else if (!hasAdequateContrastOnWhite(primaryColor)) {
      // No és un error fatal: s'ignora i s'usa el color per defecte.
      console.warn(
        `primaryColor ${primaryColor} no arriba al contrast 4.5:1 amb blanc; s'ignora.`,
      )
      primaryColor = undefined
    }
  }

  const logoAlt = parseLocalizedText(obj.logoAlt, 'logoAlt', languages, false, errors)
  const electionName = parseLocalizedText(obj.electionName, 'electionName', languages, false, errors)

  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    config: {
      entityName: entityName as LocalizedText,
      logoUrl: logoUrl as string,
      logoAlt,
      contactPhone: optionalString(obj.contactPhone),
      contactEmail: optionalString(obj.contactEmail),
      incidentsUrl,
      electionName,
      apiBaseUrl,
      languages,
      defaultLanguage,
      primaryColor,
    },
  }
}

export async function loadConfig(): Promise<ConfigResult> {
  try {
    const res = await fetch('./config.json', { cache: 'no-store' })
    if (!res.ok) return { ok: false, errors: [`config.json ha respost ${res.status}`] }
    const raw: unknown = await res.json()
    return validateConfig(raw)
  } catch {
    return { ok: false, errors: ['No s’ha pogut carregar config.json'] }
  }
}
