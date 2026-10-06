import { isLanguage, type Language } from './i18n'

/**
 * Càrrega i validació en runtime de public/config.json. Sense llibreries:
 * si falta algun camp obligatori o algun valor és insegur, l'aplicació mostra
 * una pantalla d'error de configuració en lloc d'arriscar-se a funcionar malament.
 */

export interface AppConfig {
  entityName: string
  logoUrl: string
  logoAlt?: string
  contactPhone?: string
  contactEmail?: string
  incidentsUrl?: string
  electionName?: string
  apiBaseUrl: string
  defaultLanguage: Language
  primaryColor?: string
}

export type ConfigResult =
  | { ok: true; config: AppConfig }
  | { ok: false; errors: string[] }

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

export function validateConfig(raw: unknown): ConfigResult {
  const errors: string[] = []
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['config.json no és un objecte JSON'] }
  }
  const obj = raw as Record<string, unknown>

  const entityName = optionalString(obj.entityName)
  if (!entityName) errors.push('Falta el camp obligatori "entityName"')

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

  const defaultLanguage: Language = isLanguage(obj.defaultLanguage) ? obj.defaultLanguage : 'ca'
  if (obj.defaultLanguage !== undefined && !isLanguage(obj.defaultLanguage)) {
    errors.push('"defaultLanguage" ha de ser "ca" o "es"')
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

  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    config: {
      entityName: entityName as string,
      logoUrl: logoUrl as string,
      logoAlt: optionalString(obj.logoAlt),
      contactPhone: optionalString(obj.contactPhone),
      contactEmail: optionalString(obj.contactEmail),
      incidentsUrl,
      electionName: optionalString(obj.electionName),
      apiBaseUrl,
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
