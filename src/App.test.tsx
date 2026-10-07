import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

const TEST_CONFIG = {
  entityName: "Ajuntament d'Exemple",
  logoUrl: './logo.svg',
  contactPhone: '+34 93 000 00 00',
  contactEmail: 'eleccions@exemple.cat',
  incidentsUrl: 'https://seu.exemple.cat/tramit/reclamacio-cens',
}

const FOUND = {
  poblacion: 'RUBÍ',
  distrito: '02',
  seccion: '036',
  mesa: 'A',
  colele: 'ESCOLA NÚM. 36',
  dircol: 'C. MAJOR 36',
  postCode: '08191',
  errorMessage: '',
}

/** Format per defecte del backend als tests: últims 5 caràcters. */
const DEFAULT_FORMATO = { documentChars: 5, firstChars: false, addLetter: false }

/** L'etiqueta del camp varia segons el format; el regex les cobreix totes. */
const DOC_LABEL = /DNI o NIE/

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type ApiHandler = (body: Record<string, unknown>, callCount: number) => Response
type FormatoSetup = unknown

/** Simula fetch: serveix config.json i /api/formato, i enruta /api/consulta al handler; retorna els cossos enviats a /consulta. */
function setupFetch(
  handler: ApiHandler,
  formato: FormatoSetup = DEFAULT_FORMATO,
  config: Record<string, unknown> = TEST_CONFIG,
) {
  const apiCalls: Record<string, unknown>[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: unknown, init?: { body?: string }) => {
      const url = String(input)
      if (url.includes('config.json')) return jsonResponse(config)
      if (url.includes('/formato')) {
        const f = typeof formato === 'function' ? (formato as () => unknown)() : formato
        return f instanceof Response ? f : jsonResponse(f)
      }
      const body = init?.body ? (JSON.parse(init.body) as Record<string, unknown>) : {}
      apiCalls.push(body)
      return handler(body, apiCalls.length)
    }),
  )
  return apiCalls
}

async function renderAndWaitForForm() {
  render(<App />)
  return screen.findByLabelText(DOC_LABEL)
}

async function submitDocument(doc: string) {
  const user = userEvent.setup()
  const input = await renderAndWaitForForm()
  await user.type(input, doc)
  await user.click(screen.getByRole('button', { name: 'Consulta' }))
  return user
}

describe('flux complet de consulta', () => {
  it('document → demana [day sn1] → només es veu el dia → resultat', async () => {
    const apiCalls = setupFetch((_body, n) =>
      n === 1 ? jsonResponse({ errorMessage: '[day sn1]' }) : jsonResponse(FOUND),
    )
    const user = await submitDocument('12345678Z')

    // Es mostra només el primer camp de la llista ordenada
    const dayInput = await screen.findByLabelText('Dia de naixement')
    expect(screen.queryByLabelText('Primer cognom')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Any de naixement')).not.toBeInTheDocument()

    await user.type(dayInput, '5')
    await user.click(screen.getByRole('button', { name: 'Continua' }))

    // Resultat
    expect(await screen.findByText('ESCOLA NÚM. 36')).toBeInTheDocument()
    expect(screen.getByText('C. MAJOR 36')).toBeInTheDocument()
    expect(screen.getByText(/02 \/ 036 \/ A/)).toBeInTheDocument()

    // La segona petició porta citizenId + day (i res més)
    expect(apiCalls).toHaveLength(2)
    expect(apiCalls[0]).toEqual({ citizenId: '5678Z' })
    expect(apiCalls[1]).toEqual({ citizenId: '5678Z', day: '5' })
  })

  it('«No ho sé» descarta el camp i passa al següent sense fer cap petició', async () => {
    const apiCalls = setupFetch((_body, n) =>
      n === 1 ? jsonResponse({ errorMessage: '[day sn1]' }) : jsonResponse(FOUND),
    )
    const user = await submitDocument('12345678Z')

    await screen.findByLabelText('Dia de naixement')
    await user.click(screen.getByRole('button', { name: 'No ho sé' }))

    // Apareix el següent camp amb el focus; no s'ha fet cap petició nova
    const sn1Input = await screen.findByLabelText('Primer cognom')
    expect(screen.queryByLabelText('Dia de naixement')).not.toBeInTheDocument()
    expect(sn1Input).toHaveFocus()
    expect(apiCalls).toHaveLength(1)

    await user.type(sn1Input, 'Puig')
    await user.click(screen.getByRole('button', { name: 'Continua' }))

    // S'envia només sn1: el dia descartat no hi és
    expect(await screen.findByText('ESCOLA NÚM. 36')).toBeInTheDocument()
    expect(apiCalls).toHaveLength(2)
    expect(apiCalls[1]).toEqual({ citizenId: '5678Z', sn1: 'Puig' })
  })

  it('per al segon cognom el botó és «No en tinc / no ho sé»', async () => {
    setupFetch((_body, n) =>
      n === 1 ? jsonResponse({ errorMessage: '[sn2]' }) : jsonResponse(FOUND),
    )
    const user = await submitDocument('12345678Z')

    const sn2Input = await screen.findByLabelText('Segon cognom')
    await user.click(screen.getByRole('button', { name: 'No en tinc / no ho sé' }))

    // Era l'únic camp: descartar-lo porta a la pantalla d'ajuda
    expect(
      await screen.findByText('No s’ha pogut determinar el col·legi electoral'),
    ).toBeInTheDocument()
    expect(sn2Input).not.toBeInTheDocument()
  })

  it('desempat en dues passes: acumula respostes i la nova llista substitueix l’ordre', async () => {
    const apiCalls = setupFetch((_body, n) => {
      if (n === 1) return jsonResponse({ errorMessage: '[day sn1]' })
      if (n === 2) return jsonResponse({ errorMessage: '[sn1 year]' })
      return jsonResponse(FOUND)
    })
    const user = await submitDocument('12345678Z')

    await user.type(await screen.findByLabelText('Dia de naixement'), '5')
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    expect(apiCalls[1]).toEqual({ citizenId: '5678Z', day: '5' })

    // La nova llista [sn1 year] substitueix l'ordre: es mostra el primer cognom
    const sn1Input = await screen.findByLabelText('Primer cognom')
    expect(screen.queryByLabelText('Dia de naixement')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Any de naixement')).not.toBeInTheDocument()

    // El dia ja contestat queda com a resum de només lectura
    const summary = within(screen.getByRole('list', { name: 'Dades que ja heu donat' }))
    expect(summary.getByText('5')).toBeInTheDocument()
    expect(summary.getByRole('button', { name: 'Canvia: Dia de naixement' })).toBeInTheDocument()

    await user.type(sn1Input, 'Puig')
    await user.click(screen.getByRole('button', { name: 'Continua' }))

    // La tercera petició acumula el dia i el cognom
    expect(await screen.findByText('ESCOLA NÚM. 36')).toBeInTheDocument()
    expect(apiCalls).toHaveLength(3)
    expect(apiCalls[2]).toEqual({ citizenId: '5678Z', day: '5', sn1: 'Puig' })
  })

  it('«Canvia» torna editable una dada ja contestada', async () => {
    const apiCalls = setupFetch((_body, n) => {
      if (n === 1) return jsonResponse({ errorMessage: '[day sn1]' })
      if (n === 2) return jsonResponse({ errorMessage: '[sn1 year]' })
      return jsonResponse(FOUND)
    })
    const user = await submitDocument('12345678Z')

    await user.type(await screen.findByLabelText('Dia de naixement'), '5')
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await screen.findByLabelText('Primer cognom')

    // El dia surt al resum; «Canvia» el torna a posar com a camp actual amb el valor
    await user.click(screen.getByRole('button', { name: 'Canvia: Dia de naixement' }))
    const dayInput = await screen.findByLabelText('Dia de naixement')
    expect(dayInput).toHaveValue('5')
    expect(dayInput).toHaveFocus()
    expect(screen.queryByRole('list', { name: 'Dades que ja heu donat' })).not.toBeInTheDocument()

    await user.clear(dayInput)
    await user.type(dayInput, '7')
    await user.click(screen.getByRole('button', { name: 'Continua' }))

    expect(await screen.findByText('ESCOLA NÚM. 36')).toBeInTheDocument()
    expect(apiCalls[2]).toEqual({ citizenId: '5678Z', day: '7' })
  })

  it('descartar tots els camps porta a la pantalla d’ajuda sense cap petició extra', async () => {
    const apiCalls = setupFetch(() => jsonResponse({ errorMessage: '[day sn1]' }))
    const user = await submitDocument('12345678Z')

    await screen.findByLabelText('Dia de naixement')
    await user.click(screen.getByRole('button', { name: 'No ho sé' }))
    await screen.findByLabelText('Primer cognom')
    await user.click(screen.getByRole('button', { name: 'No ho sé' }))

    expect(
      await screen.findByText('No s’ha pogut determinar el col·legi electoral'),
    ).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: /Presenta una reclamació al cens/ })
    expect(links.length).toBeGreaterThan(0)
    expect(apiCalls).toHaveLength(1)
  })

  it('enviar el camp buit mostra error i no envia res', async () => {
    const apiCalls = setupFetch(() => jsonResponse({ errorMessage: '[day]' }))
    const user = await submitDocument('12345678Z')

    await screen.findByLabelText('Dia de naixement')
    await user.click(screen.getByRole('button', { name: 'Continua' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/No ho sé/)
    expect(apiCalls).toHaveLength(1)
  })

  it('si la nova llista no té cap camp pendent, pantalla d’ajuda', async () => {
    setupFetch((_body, n) => {
      if (n === 1) return jsonResponse({ errorMessage: '[day]' })
      // El dia ja està contestat: no queda cap camp per preguntar
      return jsonResponse({ errorMessage: '[day]' })
    })
    const user = await submitDocument('12345678Z')

    await user.type(await screen.findByLabelText('Dia de naixement'), '5')
    await user.click(screen.getByRole('button', { name: 'Continua' }))

    expect(
      await screen.findByText('No s’ha pogut determinar el col·legi electoral'),
    ).toBeInTheDocument()
  })

  it('[colele] com a única opció → missatge d’ajuda amb contacte', async () => {
    setupFetch(() => jsonResponse({ errorMessage: '[colele]' }))
    await submitDocument('12345678Z')

    expect(
      await screen.findByText('No s’ha pogut determinar el col·legi electoral'),
    ).toBeInTheDocument()
    // El bloc d'ajuda apareix tant a la pantalla com al peu: en comprovem el contingut.
    const links = screen.getAllByRole('link', { name: /Presenta una reclamació al cens/ })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', 'https://seu.exemple.cat/tramit/reclamacio-cens')
  })

  it('429 → missatge de límit de consultes', async () => {
    setupFetch(() => jsonResponse({}, 429))
    await submitDocument('12345678Z')
    expect(await screen.findByText('Massa consultes seguides')).toBeInTheDocument()
    expect(screen.getByText(/Espereu un minut/)).toBeInTheDocument()
  })

  it('503 → missatge de servei actualitzant-se', async () => {
    setupFetch(() => jsonResponse({ errorMessage: 'service loading' }, 503))
    await submitDocument('12345678Z')
    expect(await screen.findByText('El servei s’està actualitzant')).toBeInTheDocument()
    expect(screen.getByText(/uns minuts/)).toBeInTheDocument()
  })

  it('"no records found" → pantalla de no trobat', async () => {
    setupFetch(() => jsonResponse({ errorMessage: 'no records found' }))
    await submitDocument('12345678Z')
    expect(await screen.findByText('No us hem trobat al cens')).toBeInTheDocument()
  })

  it('"Nova consulta" esborra totes les dades', async () => {
    setupFetch(() => jsonResponse(FOUND))
    const user = await submitDocument('12345678Z')

    await screen.findByText('ESCOLA NÚM. 36')
    await user.click(screen.getByRole('button', { name: 'Nova consulta' }))

    const input = await screen.findByLabelText(DOC_LABEL)
    expect(input).toHaveValue('')
  })

  it('una lletra de control incorrecta mostra error i no envia res', async () => {
    const apiCalls = setupFetch(() => jsonResponse(FOUND))
    await submitDocument('12345678A')

    expect(await screen.findByRole('alert')).toHaveTextContent(/lletra de control/)
    expect(apiCalls).toHaveLength(0)
  })

  it('després d’aportar dades, "no records found" → les dades no coincideixen', async () => {
    setupFetch((_body, n) =>
      n === 1 ? jsonResponse({ errorMessage: '[day]' }) : jsonResponse({ errorMessage: 'no records found' }),
    )
    const user = await submitDocument('12345678Z')

    await user.type(await screen.findByLabelText('Dia de naixement'), '5')
    await user.click(screen.getByRole('button', { name: 'Continua' }))

    expect(await screen.findByText('Les dades no coincideixen')).toBeInTheDocument()
  })
})

describe('privadesa en quioscos', () => {
  it('esborra el document per inactivitat també a mig desempat', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      setupFetch(() => jsonResponse({ errorMessage: '[day sn1]' }))
      await submitDocument('12345678Z')
      await screen.findByLabelText('Dia de naixement')

      await act(async () => {
        vi.advanceTimersByTime(5 * 60 * 1000 + 100)
      })
    } finally {
      vi.useRealTimers()
    }

    expect(await screen.findByLabelText(DOC_LABEL)).toHaveValue('')
    expect(screen.queryByText('5678Z')).not.toBeInTheDocument()
  })

  it('una resposta 200 sense col·legi no es mostra com a resultat', async () => {
    setupFetch(() => jsonResponse({ errorMessage: '' }))
    await submitDocument('12345678Z')
    expect(await screen.findByRole('button', { name: /torna-ho a provar|reintenta/i })).toBeInTheDocument()
  })
})

describe('només la part indexada del document', () => {
  it('escriure el document sencer envia només la part indexada', async () => {
    const apiCalls = setupFetch(() => jsonResponse(FOUND))
    await submitDocument('12345678-z')

    expect(await screen.findByText('ESCOLA NÚM. 36')).toBeInTheDocument()
    expect(apiCalls).toHaveLength(1)
    expect(apiCalls[0]).toEqual({ citizenId: '5678Z' })
  })

  it('escriure només la part indexada l’envia tal qual', async () => {
    const apiCalls = setupFetch(() => jsonResponse(FOUND))
    await submitDocument('5678Z')

    expect(await screen.findByText('ESCOLA NÚM. 36')).toBeInTheDocument()
    expect(apiCalls[0]).toEqual({ citizenId: '5678Z' })
  })

  it('a la pantalla de desempat es mostra la part enviada, no el document sencer', async () => {
    setupFetch(() => jsonResponse({ errorMessage: '[day]' }))
    await submitDocument('12345678Z')

    await screen.findByLabelText('Dia de naixement')
    expect(screen.getByText('5678Z')).toBeInTheDocument()
    expect(screen.queryByText('12345678Z')).not.toBeInTheDocument()
  })

  it('un document curt que no encaixa amb el format dona error i no envia res', async () => {
    const apiCalls = setupFetch(() => jsonResponse(FOUND))
    await submitDocument('AB1')

    expect(await screen.findByRole('alert')).toHaveTextContent(/format del document no és vàlid/)
    expect(apiCalls).toHaveLength(0)
  })

  it('amb firstChars i addLetter envia les primeres xifres i la lletra', async () => {
    const apiCalls = setupFetch(() => jsonResponse(FOUND), {
      documentChars: 5,
      firstChars: true,
      addLetter: true,
    })
    const user = userEvent.setup()
    render(<App />)
    const input = await screen.findByLabelText('Primeres 5 xifres i la lletra del DNI o NIE')
    await user.type(input, '12345678Z')
    await user.click(screen.getByRole('button', { name: 'Consulta' }))

    expect(await screen.findByText('ESCOLA NÚM. 36')).toBeInTheDocument()
    expect(apiCalls[0]).toEqual({ citizenId: '12345Z' })
  })

  it('amb documentChars 0 envia el document sencer normalitzat', async () => {
    const apiCalls = setupFetch(() => jsonResponse(FOUND), {
      documentChars: 0,
      firstChars: false,
      addLetter: false,
    })
    const user = userEvent.setup()
    render(<App />)
    const input = await screen.findByLabelText('DNI o NIE')
    await user.type(input, '12345678-z')
    await user.click(screen.getByRole('button', { name: 'Consulta' }))

    expect(await screen.findByText('ESCOLA NÚM. 36')).toBeInTheDocument()
    expect(apiCalls[0]).toEqual({ citizenId: '12345678Z' })
  })

  it('l’etiqueta del camp canvia segons el format', async () => {
    setupFetch(() => jsonResponse(FOUND), { documentChars: 5, firstChars: true, addLetter: false })
    render(<App />)
    expect(await screen.findByLabelText('Primeres 5 xifres del DNI o NIE')).toBeInTheDocument()
    expect(screen.getByText(/si el vostre DNI és 12345678Z, escriviu 12345\./)).toBeInTheDocument()
  })

  it('si /formato falla no es pot consultar i «Torna-ho a provar» el recarrega', async () => {
    let formatoCalls = 0
    const apiCalls = setupFetch(
      () => jsonResponse(FOUND),
      () => (++formatoCalls === 1 ? jsonResponse({}, 500) : DEFAULT_FORMATO),
    )
    const user = userEvent.setup()
    render(<App />)

    // Pantalla d'error de servei, sense formulari ni peticions a /consulta
    expect(await screen.findByText('S’ha produït un error')).toBeInTheDocument()
    expect(screen.queryByLabelText(DOC_LABEL)).not.toBeInTheDocument()
    expect(apiCalls).toHaveLength(0)

    // El reintent recarrega el format i mostra el formulari
    await user.click(screen.getByRole('button', { name: 'Torna-ho a provar' }))
    const input = await screen.findByLabelText(DOC_LABEL)
    expect(formatoCalls).toBe(2)

    // I ja es pot consultar
    await user.type(input, '12345678Z')
    await user.click(screen.getByRole('button', { name: 'Consulta' }))
    expect(await screen.findByText('ESCOLA NÚM. 36')).toBeInTheDocument()
    expect(apiCalls[0]).toEqual({ citizenId: '5678Z' })
  })

  it('amb firstChars+addLetter, escriure les xifres sense la lletra és error de format', async () => {
    const apiCalls = setupFetch(() => jsonResponse(FOUND), {
      documentChars: 5,
      firstChars: true,
      addLetter: true,
    })
    const user = userEvent.setup()
    render(<App />)
    const input = await screen.findByLabelText('Primeres 5 xifres i la lletra del DNI o NIE')
    await user.type(input, '12345')
    await user.click(screen.getByRole('button', { name: 'Consulta' }))

    // La part indexada són 6 caràcters (5 xifres + lletra): «12345» no s'accepta tal qual
    expect(await screen.findByRole('alert')).toHaveTextContent(/format del document no és vàlid/)
    expect(apiCalls).toHaveLength(0)
  })
})

describe('idiomes configurables', () => {
  const CONFIG_ES = {
    ...TEST_CONFIG,
    entityName: 'Ayuntamiento de Ejemplo',
    languages: ['es'],
    electionName: 'Elecciones municipales 2027',
  }

  it('web mono-idioma: cap selector ni navegació «Idioma», html lang i textos en castellà', async () => {
    setupFetch(() => jsonResponse(FOUND), DEFAULT_FORMATO, CONFIG_ES)
    render(<App />)

    // Formulari en castellà
    expect(await screen.findByRole('button', { name: 'Consultar' })).toBeInTheDocument()
    expect(screen.getByText('Elecciones municipales 2027')).toBeInTheDocument()
    expect(screen.getByText('Ayuntamiento de Ejemplo')).toBeInTheDocument()

    // Ni el nav «Idioma» ni cap botó d'idioma
    expect(screen.queryByRole('navigation', { name: 'Idioma' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /castellano/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /català/i })).not.toBeInTheDocument()

    expect(document.documentElement.lang).toBe('es')
  })

  it('un idioma desat al localStorage que no és a languages s’ignora', async () => {
    window.localStorage.setItem('cens-language', 'ca')
    setupFetch(() => jsonResponse(FOUND), DEFAULT_FORMATO, CONFIG_ES)
    render(<App />)

    // Tot i tenir «ca» desat, la web només ofereix castellà
    expect(await screen.findByRole('button', { name: 'Consultar' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
  })

  it('un idioma desat que sí és a languages s’aplica', async () => {
    window.localStorage.setItem('cens-language', 'es')
    setupFetch(() => jsonResponse(FOUND))
    render(<App />)

    expect(await screen.findByRole('button', { name: 'Consultar' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
  })

  it('l’electionName per idioma canvia en canviar d’idioma', async () => {
    setupFetch(() => jsonResponse(FOUND), DEFAULT_FORMATO, {
      ...TEST_CONFIG,
      languages: ['ca', 'es'],
      electionName: {
        ca: 'Eleccions municipals 2027',
        es: 'Elecciones municipales 2027',
      },
    })
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('Eleccions municipals 2027')).toBeInTheDocument()
    expect(screen.queryByText('Elecciones municipales 2027')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /castellano/i }))

    expect(await screen.findByText('Elecciones municipales 2027')).toBeInTheDocument()
    expect(screen.queryByText('Eleccions municipals 2027')).not.toBeInTheDocument()
  })

  it('si falta la traducció de l’idioma actiu, es mostra la del defaultLanguage', async () => {
    setupFetch(() => jsonResponse(FOUND), DEFAULT_FORMATO, {
      ...TEST_CONFIG,
      languages: ['ca', 'es'],
      defaultLanguage: 'ca',
      electionName: { ca: 'Eleccions municipals 2027' },
    })
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('Eleccions municipals 2027')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /castellano/i }))

    // En castellà no hi ha traducció: cau al català (defaultLanguage)
    expect(await screen.findByRole('button', { name: 'Consultar' })).toBeInTheDocument()
    expect(screen.getByText('Eleccions municipals 2027')).toBeInTheDocument()
  })
})
