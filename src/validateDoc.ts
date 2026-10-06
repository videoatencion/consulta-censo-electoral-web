/**
 * Validació de documents d'identitat espanyols (DNI/NIE) amb la taula de
 * lletres de control, més l'acceptació d'altres documents (passaports UE del
 * CERE) sense validació de lletra.
 */

const CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

export type DocumentKind = 'dni' | 'nie' | 'other'

export type DocumentCheck =
  | { ok: true; kind: DocumentKind; normalized: string }
  | { ok: false; reason: 'letter' | 'format' }

/** Treu espais i guions i posa majúscules (només per validar; s'envia el text original). */
export function normalizeDocument(raw: string): string {
  return raw.replace(/[\s-]+/g, '').toUpperCase()
}

function controlLetter(num: number): string {
  return CONTROL_LETTERS[num % 23]
}

export function checkDocument(raw: string): DocumentCheck {
  const value = normalizeDocument(raw.trim())

  const dni = /^(\d{8})([A-Z])$/.exec(value)
  if (dni) {
    return controlLetter(Number.parseInt(dni[1], 10)) === dni[2]
      ? { ok: true, kind: 'dni', normalized: value }
      : { ok: false, reason: 'letter' }
  }

  const nie = /^([XYZ])(\d{7})([A-Z])$/.exec(value)
  if (nie) {
    const prefix = String('XYZ'.indexOf(nie[1]))
    return controlLetter(Number.parseInt(prefix + nie[2], 10)) === nie[3]
      ? { ok: true, kind: 'nie', normalized: value }
      : { ok: false, reason: 'letter' }
  }

  // Altres documents (passaports de ciutadans UE al CERE): sense lletra de control.
  if (/^[A-Z0-9]{5,20}$/.test(value)) {
    return { ok: true, kind: 'other', normalized: value }
  }

  return { ok: false, reason: 'format' }
}
