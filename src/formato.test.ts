import { describe, expect, it } from 'vitest'
import {
  normalizeForIndex,
  reduceDocument,
  reducedMaxLength,
  validateFormato,
  type DocumentFormat,
} from './formato'

const LAST5: DocumentFormat = { documentChars: 5, firstChars: false, addLetter: false }
const FIRST5: DocumentFormat = { documentChars: 5, firstChars: true, addLetter: false }
const FIRST5_LETTER: DocumentFormat = { documentChars: 5, firstChars: true, addLetter: true }
const FULL: DocumentFormat = { documentChars: 0, firstChars: false, addLetter: false }

describe('normalizeForIndex', () => {
  it('posa majúscules i treu tot el que no sigui [A-Z0-9]', () => {
    expect(normalizeForIndex('12345678-z')).toBe('12345678Z')
    expect(normalizeForIndex(' 12.345 678 z ')).toBe('12345678Z')
    expect(normalizeForIndex('x-1234567.l')).toBe('X1234567L')
  })
})

describe('reduceDocument: mode per defecte (n últims)', () => {
  it('retalla un DNI sencer als últims 5 caràcters', () => {
    expect(reduceDocument('12345678Z', LAST5)).toBe('5678Z')
    expect(reduceDocument('12345678-z', LAST5)).toBe('5678Z')
  })

  it('retalla un NIE sencer', () => {
    expect(reduceDocument('X1234567L', LAST5)).toBe('4567L')
  })

  it('un document curt (<= n) queda tal qual', () => {
    expect(reduceDocument('5678Z', LAST5)).toBe('5678Z')
    expect(reduceDocument('ABC', LAST5)).toBe('ABC')
  })
})

describe('reduceDocument: firstChars', () => {
  it('retalla als primers 5 caràcters', () => {
    expect(reduceDocument('12345678Z', FIRST5)).toBe('12345')
    expect(reduceDocument('X1234567L', FIRST5)).toBe('X1234')
  })

  it('un document curt (<= n) queda tal qual', () => {
    expect(reduceDocument('12345', FIRST5)).toBe('12345')
    expect(reduceDocument('AB1', FIRST5)).toBe('AB1')
  })
})

describe('reduceDocument: firstChars + addLetter', () => {
  it('retalla als primers 5 + l’últim caràcter', () => {
    expect(reduceDocument('12345678Z', FIRST5_LETTER)).toBe('12345Z')
    expect(reduceDocument('X1234567L', FIRST5_LETTER)).toBe('X1234L')
  })

  it('un document de longitud <= n+1 queda tal qual', () => {
    expect(reduceDocument('12345Z', FIRST5_LETTER)).toBe('12345Z')
    expect(reduceDocument('12345', FIRST5_LETTER)).toBe('12345')
  })
})

describe('reduceDocument: documentChars == 0 (document sencer)', () => {
  it('retorna el document sencer normalitzat', () => {
    expect(reduceDocument('12345678-z', FULL)).toBe('12345678Z')
    expect(reduceDocument('PAA12345678901234567', FULL)).toBe('PAA12345678901234567')
  })
})

describe('reducedMaxLength', () => {
  it('és n, n+1 amb lletra, o 20 pel document sencer', () => {
    expect(reducedMaxLength(LAST5)).toBe(5)
    expect(reducedMaxLength(FIRST5)).toBe(5)
    expect(reducedMaxLength(FIRST5_LETTER)).toBe(6)
    expect(reducedMaxLength(FULL)).toBe(20)
  })
})

describe('validateFormato', () => {
  it('accepta el contracte del backend', () => {
    expect(validateFormato({ documentChars: 5, firstChars: false, addLetter: false })).toEqual(
      LAST5,
    )
    expect(validateFormato({ documentChars: 0, firstChars: true, addLetter: true })).toEqual({
      documentChars: 0,
      firstChars: true,
      addLetter: true,
    })
  })

  it('rebutja valors invàlids', () => {
    expect(validateFormato(null)).toBeNull()
    expect(validateFormato({})).toBeNull()
    expect(validateFormato({ documentChars: -1, firstChars: false, addLetter: false })).toBeNull()
    expect(validateFormato({ documentChars: 2.5, firstChars: false, addLetter: false })).toBeNull()
    expect(validateFormato({ documentChars: '5', firstChars: false, addLetter: false })).toBeNull()
    expect(validateFormato({ documentChars: 5, firstChars: 0, addLetter: false })).toBeNull()
    expect(validateFormato({ documentChars: 5, firstChars: false })).toBeNull()
  })
})
