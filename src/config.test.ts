import { describe, expect, it, vi } from 'vitest'
import { contrastRatio, isSafeUrl, resolveText, validateConfig } from './config'

const minimalValid = {
  entityName: "Ajuntament d'Exemple",
  logoUrl: './logo.svg',
}

describe('isSafeUrl', () => {
  it('accepta URLs relatives i https', () => {
    expect(isSafeUrl('./logo.svg')).toBe(true)
    expect(isSafeUrl('/logo.svg')).toBe(true)
    expect(isSafeUrl('logo.svg')).toBe(true)
    expect(isSafeUrl('https://example.cat/logo.svg')).toBe(true)
  })

  it('rebutja javascript:, data:, http: i protocol-relative', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeUrl('JaVaScRiPt:alert(1)')).toBe(false)
    expect(isSafeUrl('data:image/svg+xml;base64,xx')).toBe(false)
    expect(isSafeUrl('http://example.cat/logo.svg')).toBe(false)
    expect(isSafeUrl('//example.cat/logo.svg')).toBe(false)
  })
})

describe('contrastRatio', () => {
  it('negre sobre blanc és 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
  })

  it('accepta format curt #abc', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 0)
  })
})

describe('validateConfig', () => {
  it('accepta una configuració mínima vàlida amb els valors per defecte', () => {
    const result = validateConfig(minimalValid)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.config.apiBaseUrl).toBe('/api')
      expect(result.config.languages).toEqual(['ca', 'es'])
      expect(result.config.defaultLanguage).toBe('ca')
      expect(result.config.primaryColor).toBeUndefined()
    }
  })

  it('falla si falta entityName', () => {
    const result = validateConfig({ logoUrl: './logo.svg' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('entityName'))).toBe(true)
    }
  })

  it('falla si falta logoUrl', () => {
    expect(validateConfig({ entityName: 'X' }).ok).toBe(false)
  })

  it('rebutja logoUrl amb javascript:', () => {
    const result = validateConfig({ ...minimalValid, logoUrl: 'javascript:alert(1)' })
    expect(result.ok).toBe(false)
  })

  it('rebutja incidentsUrl amb javascript:', () => {
    const result = validateConfig({ ...minimalValid, incidentsUrl: 'javascript:alert(1)' })
    expect(result.ok).toBe(false)
  })

  it('ignora un primaryColor amb poc contrast (i no falla)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = validateConfig({ ...minimalValid, primaryColor: '#ffff00' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.config.primaryColor).toBeUndefined()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('respecta un primaryColor amb contrast suficient', () => {
    const result = validateConfig({ ...minimalValid, primaryColor: '#8a1538' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.config.primaryColor).toBe('#8a1538')
  })

  it('rebutja un defaultLanguage no suportat', () => {
    expect(validateConfig({ ...minimalValid, defaultLanguage: 'en' }).ok).toBe(false)
  })

  it('rebutja un defaultLanguage vàlid però fora de languages', () => {
    const result = validateConfig({ ...minimalValid, languages: ['es'], defaultLanguage: 'ca' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('defaultLanguage'))).toBe(true)
    }
  })

  it('sense defaultLanguage, el per defecte és el primer de languages', () => {
    const result = validateConfig({ ...minimalValid, languages: ['es', 'ca'] })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.config.languages).toEqual(['es', 'ca'])
      expect(result.config.defaultLanguage).toBe('es')
    }
  })

  it('rebutja una llista languages buida', () => {
    expect(validateConfig({ ...minimalValid, languages: [] }).ok).toBe(false)
  })

  it('rebutja un idioma desconegut a languages', () => {
    expect(validateConfig({ ...minimalValid, languages: ['es', 'en'] }).ok).toBe(false)
    expect(validateConfig({ ...minimalValid, languages: 'es' }).ok).toBe(false)
  })

  it('rebutja idiomes duplicats a languages', () => {
    expect(validateConfig({ ...minimalValid, languages: ['ca', 'ca'] }).ok).toBe(false)
  })

  it('rebutja un apiBaseUrl que no sigui un camí relatiu', () => {
    expect(validateConfig({ ...minimalValid, apiBaseUrl: 'https://api.example.cat' }).ok).toBe(false)
  })

  it('rebutja valors que no són un objecte', () => {
    expect(validateConfig(null).ok).toBe(false)
    expect(validateConfig('text').ok).toBe(false)
    expect(validateConfig([1, 2]).ok).toBe(false)
  })
})

describe('textos del config per idioma', () => {
  it('accepta entityName com a text pla', () => {
    const result = validateConfig(minimalValid)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.config.entityName).toBe("Ajuntament d'Exemple")
  })

  it('accepta entityName com a objecte per idioma', () => {
    const result = validateConfig({
      ...minimalValid,
      entityName: { ca: "Ajuntament d'Exemple", es: 'Ayuntamiento de Ejemplo' },
    })
    expect(result.ok).toBe(true)
  })

  it('rebutja un entityName amb objecte buit', () => {
    const result = validateConfig({ ...minimalValid, entityName: {} })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('entityName'))).toBe(true)
    }
  })

  it('rebutja una clau d’idioma que no és a languages', () => {
    const result = validateConfig({
      ...minimalValid,
      languages: ['es'],
      electionName: { ca: 'Eleccions municipals 2027', es: 'Elecciones municipales 2027' },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('electionName') && e.includes('"ca"'))).toBe(true)
    }
  })

  it('rebutja un text per idioma buit', () => {
    expect(
      validateConfig({ ...minimalValid, entityName: { ca: '  ', es: 'Ayuntamiento' } }).ok,
    ).toBe(false)
  })

  it('un objecte buit en un camp opcional compta com a absent', () => {
    const result = validateConfig({ ...minimalValid, electionName: {} })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.config.electionName).toBeUndefined()
  })
})

describe('resolveText', () => {
  const text = { ca: 'Eleccions municipals 2027', es: 'Elecciones municipales 2027' }

  it('retorna el text pla tal qual', () => {
    expect(resolveText('Hola', 'ca', 'es')).toBe('Hola')
  })

  it('retorna el text de l’idioma actiu', () => {
    expect(resolveText(text, 'es', 'ca')).toBe('Elecciones municipales 2027')
  })

  it('si falta la traducció, cau al defaultLanguage', () => {
    expect(resolveText({ ca: 'Només català' }, 'es', 'ca')).toBe('Només català')
  })

  it('si també falta el defaultLanguage, agafa el primer disponible', () => {
    expect(resolveText({ es: 'Sólo castellano' }, 'ca', 'ca')).toBe('Sólo castellano')
  })
})
