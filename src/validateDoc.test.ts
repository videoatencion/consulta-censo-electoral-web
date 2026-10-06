import { describe, expect, it } from 'vitest'
import { checkDocument, normalizeDocument } from './validateDoc'

describe('normalizeDocument', () => {
  it('treu espais i guions i posa majúscules', () => {
    expect(normalizeDocument(' 12345678-z ')).toBe('12345678Z')
    expect(normalizeDocument('12 345 678 z')).toBe('12345678Z')
  })
})

describe('checkDocument: DNI', () => {
  it('accepta un DNI vàlid', () => {
    expect(checkDocument('12345678Z')).toEqual({ ok: true, kind: 'dni', normalized: '12345678Z' })
  })

  it('accepta minúscules, espais i guions', () => {
    expect(checkDocument('12345678z').ok).toBe(true)
    expect(checkDocument('12345678-Z').ok).toBe(true)
    expect(checkDocument('12 345 678 z').ok).toBe(true)
  })

  it('rebutja una lletra de control incorrecta', () => {
    const result = checkDocument('12345678A')
    expect(result).toEqual({ ok: false, reason: 'letter' })
  })

  it('rebutja lletres que no són de la taula (I, O, U, Ñ)', () => {
    expect(checkDocument('12345678I')).toEqual({ ok: false, reason: 'letter' })
  })
})

describe('checkDocument: NIE', () => {
  it('accepta NIE X, Y i Z vàlids', () => {
    expect(checkDocument('X1234567L')).toEqual({ ok: true, kind: 'nie', normalized: 'X1234567L' })
    expect(checkDocument('Y1234567X').ok).toBe(true)
    expect(checkDocument('Z1234567R').ok).toBe(true)
  })

  it('accepta un NIE en minúscules', () => {
    expect(checkDocument('x1234567l').ok).toBe(true)
  })

  it('rebutja un NIE amb la lletra malament', () => {
    expect(checkDocument('X1234567A')).toEqual({ ok: false, reason: 'letter' })
  })
})

describe('checkDocument: altres documents (passaports CERE)', () => {
  it('accepta documents alfanumèrics de 5 a 20 caràcters sense validar lletra', () => {
    expect(checkDocument('AB123456')).toEqual({ ok: true, kind: 'other', normalized: 'AB123456' })
    expect(checkDocument('PAA12345678901234567').ok).toBe(true) // 20 caràcters
  })

  it('un DNI sense lletra es tracta com a "altre document" (el backend decidirà)', () => {
    expect(checkDocument('12345678')).toEqual({ ok: true, kind: 'other', normalized: '12345678' })
  })

  it('rebutja documents massa curts, massa llargs o amb símbols', () => {
    expect(checkDocument('')).toEqual({ ok: false, reason: 'format' })
    expect(checkDocument('AB12')).toEqual({ ok: false, reason: 'format' })
    expect(checkDocument('A'.repeat(21))).toEqual({ ok: false, reason: 'format' })
    expect(checkDocument('ABC+234')).toEqual({ ok: false, reason: 'format' })
  })
})
