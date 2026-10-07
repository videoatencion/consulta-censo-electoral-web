import { useCallback, useEffect, useRef, useState } from 'react'
import { consulta, type ConsultaPayload, type PollingStation, type UserField } from './api'
import { loadConfig, resolveText, type AppConfig } from './config'
import {
  loadFormato,
  normalizeForIndex,
  reduceDocument,
  reducedMaxLength,
  type DocumentFormat,
} from './formato'
import { dictionaries, isLanguage, type Language } from './i18n'
import { checkDocument } from './validateDoc'
import { Header } from './components/Header'
import { HelpBlock } from './components/HelpBlock'
import { DocForm } from './components/DocForm'
import { DisambiguateForm } from './components/DisambiguateForm'
import { ResultCard } from './components/ResultCard'
import { MessageScreen } from './components/MessageScreen'

type Screen =
  | 'form'
  | 'disambiguate'
  | 'result'
  | 'not-found'
  | 'mismatch'
  | 'cannot-determine'
  | 'rate-limited'
  | 'service-loading'
  | 'error'
  | 'too-many-attempts'

type Phase = 'loading-config' | 'config-error' | 'formato-error' | 'ready'

const MAX_ATTEMPTS = 5
const INACTIVITY_MS = 5 * 60 * 1000
const LANGUAGE_STORAGE_KEY = 'cens-language'

/** Primer camp de la llista ordenada que no està ni contestat ni descartat. */
function firstRemainingField(
  fields: UserField[],
  answered: Partial<Record<UserField, string>>,
  dismissed: UserField[],
): UserField | null {
  return fields.find((f) => answered[f] === undefined && !dismissed.includes(f)) ?? null
}

/** L'idioma desat només s'aplica si la configuració actual l'ofereix. */
function readStoredLanguage(languages: Language[]): Language | null {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isLanguage(stored) && languages.includes(stored) ? stored : null
  } catch {
    return null
  }
}

function storeLanguage(lang: Language) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  } catch {
    // Emmagatzematge no disponible: l'idioma simplement no persisteix.
  }
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('loading-config')
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [configErrors, setConfigErrors] = useState<string[]>([])
  const [format, setFormat] = useState<DocumentFormat | null>(null)
  const [language, setLanguage] = useState<Language>('ca')

  const [screen, setScreen] = useState<Screen>('form')
  const [submitting, setSubmitting] = useState(false)
  const [docInput, setDocInput] = useState('')
  const [document_, setDocument] = useState('')
  const [docError, setDocError] = useState<string | null>(null)
  const [requestedFields, setRequestedFields] = useState<UserField[]>([])
  const [answered, setAnswered] = useState<Partial<Record<UserField, string>>>({})
  const [dismissed, setDismissed] = useState<UserField[]>([])
  const [currentField, setCurrentField] = useState<UserField | null>(null)
  const [draft, setDraft] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [station, setStation] = useState<PollingStation | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [liveMessage, setLiveMessage] = useState('')

  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const lastPayloadRef = useRef<ConsultaPayload | null>(null)

  const t = dictionaries[language]

  // Carrega de la configuració en temps d'execució i, a continuació, del
  // format del document que indexa el backend. Si el format no es pot obtenir
  // NO s'assumeix el document sencer: es mostra un error amb reintent.
  useEffect(() => {
    let cancelled = false
    void loadConfig().then(async (result) => {
      if (cancelled) return
      if (!result.ok) {
        setConfigErrors(result.errors)
        setPhase('config-error')
        return
      }
      setConfig(result.config)
      setLanguage(readStoredLanguage(result.config.languages) ?? result.config.defaultLanguage)
      const formato = await loadFormato(result.config.apiBaseUrl)
      if (cancelled) return
      if (formato) {
        setFormat(formato)
        setPhase('ready')
      } else {
        setPhase('formato-error')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Reintenta només la càrrega del format (la configuració ja és bona).
  const retryFormato = useCallback(() => {
    if (!config) return
    setPhase('loading-config')
    void loadFormato(config.apiBaseUrl).then((formato) => {
      if (formato) {
        setFormat(formato)
        setPhase('ready')
      } else {
        setPhase('formato-error')
      }
    })
  }, [config])

  // Idioma del document i títol de la pàgina (amb l'entityName de l'idioma actiu).
  useEffect(() => {
    document.documentElement.lang = language
    if (config) {
      const entityName = resolveText(config.entityName, language, config.defaultLanguage)
      document.title = `${t.pageTitle} — ${entityName}`
    }
  }, [language, config, t])

  // Color corporatiu (via CSSOM, permès per la CSP sense unsafe-inline).
  useEffect(() => {
    if (config?.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', config.primaryColor)
    }
  }, [config])

  // Focus al títol de la pantalla quan canvia l'estat.
  useEffect(() => {
    if (phase === 'ready') headingRef.current?.focus()
  }, [screen, phase])

  const resetAll = useCallback((newNotice: string | null = null) => {
    setDocInput('')
    setDocument('')
    setDocError(null)
    setRequestedFields([])
    setAnswered({})
    setDismissed([])
    setCurrentField(null)
    setDraft('')
    setFieldError(null)
    setFormError(null)
    setAttempts(0)
    setStation(null)
    setSubmitting(false)
    lastPayloadRef.current = null
    setNotice(newNotice)
    setScreen('form')
  }, [])

  // Temporitzador d'inactivitat (quioscs públics): a qualsevol pantalla que
  // contingui dades personals, no només al resultat.
  const holdsPersonalData = docInput !== '' || document_ !== '' || station !== null
  useEffect(() => {
    if (!holdsPersonalData) return
    let timer = window.setTimeout(onIdle, INACTIVITY_MS)
    function onIdle() {
      resetAll(dictionaries[language].inactivityNotice)
    }
    function reset() {
      window.clearTimeout(timer)
      timer = window.setTimeout(onIdle, INACTIVITY_MS)
    }
    window.addEventListener('pointerdown', reset)
    window.addEventListener('keydown', reset)
    window.addEventListener('input', reset)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointerdown', reset)
      window.removeEventListener('keydown', reset)
      window.removeEventListener('input', reset)
    }
  }, [holdsPersonalData, language, resetAll])

  const runConsulta = useCallback(
    async (
      cfg: AppConfig,
      payload: ConsultaPayload,
      hadExtraData: boolean,
      answeredNow: Partial<Record<UserField, string>>,
      dismissedNow: UserField[],
    ) => {
      setSubmitting(true)
      setLiveMessage(t.liveLoading)
      const result = await consulta(cfg.apiBaseUrl, payload)
      setSubmitting(false)

      switch (result.type) {
        case 'found':
          setStation(result.station)
          setScreen('result')
          setLiveMessage(t.liveResult)
          break
        case 'disambiguate':
          if (result.onlyColele) {
            setScreen('cannot-determine')
            setLiveMessage(t.liveError)
          } else {
            // La nova llista substitueix l'ordre anterior: és l'ordre bo per a
            // les persones que encara coincideixen.
            setRequestedFields(result.fields)
            const next = firstRemainingField(result.fields, answeredNow, dismissedNow)
            if (next === null) {
              setScreen('cannot-determine')
              setLiveMessage(t.liveError)
            } else {
              setCurrentField(next)
              setScreen('disambiguate')
              setLiveMessage(t.liveDisambiguate)
            }
          }
          break
        case 'not-found':
          setScreen(hadExtraData ? 'mismatch' : 'not-found')
          setLiveMessage(t.liveError)
          break
        case 'service-loading':
          setScreen('service-loading')
          setLiveMessage(t.liveError)
          break
        case 'rate-limited':
          setScreen('rate-limited')
          setLiveMessage(t.liveError)
          break
        case 'unauthorized':
        case 'invalid':
        case 'network-error':
          setScreen('error')
          setLiveMessage(t.liveError)
          break
      }
    },
    [t],
  )

  function handleDocSubmit(raw: string) {
    if (!config || !format) return
    const n = format.documentChars
    let citizenId: string

    if (n === 0) {
      // El backend indexa el document sencer: validació completa com sempre.
      const check = checkDocument(raw.trim())
      if (!check.ok) {
        setDocError(check.reason === 'letter' ? t.errorDocInvalidLetter : t.errorDocInvalidFormat)
        return
      }
      citizenId = check.normalized
    } else {
      const normalized = normalizeForIndex(raw)
      const maxLen = reducedMaxLength(format)
      if (normalized === '') {
        setDocError(t.errorDocInvalidFormatReduced)
        return
      }
      const fullShape = /^\d{8}[A-Z]$/.test(normalized) || /^[XYZ]\d{7}[A-Z]$/.test(normalized)
      if (fullShape) {
        // Document sencer: es valida la lletra de control i es retalla abans d'enviar.
        const check = checkDocument(normalized)
        if (!check.ok) {
          setDocError(
            check.reason === 'letter' ? t.errorDocInvalidLetter : t.errorDocInvalidFormat,
          )
          return
        }
        citizenId = reduceDocument(normalized, format)
      } else if (normalized.length === maxLen) {
        // Ja té la longitud exacta de la part indexada (amb la lletra, si el
        // format la inclou): s'envia tal qual (la lletra no es pot validar;
        // és acceptable). Una longitud diferent NO s'accepta tal qual.
        citizenId = normalized
      } else if (normalized.length > maxLen && /^[A-Z0-9]{5,20}$/.test(normalized)) {
        // Un altre document més llarg (passaport...): es retalla amb les
        // mateixes regles. Més curt que la part indexada no pot ser: error.
        citizenId = reduceDocument(normalized, format)
      } else {
        setDocError(t.errorDocInvalidFormatReduced)
        return
      }
      if (citizenId === '' || citizenId.length > maxLen) {
        setDocError(t.errorDocInvalidFormatReduced)
        return
      }
    }

    setDocError(null)
    setNotice(null)
    setDocument(citizenId)
    setAttempts(1)
    setRequestedFields([])
    setAnswered({})
    setDismissed([])
    setCurrentField(null)
    setDraft('')
    setFieldError(null)
    setFormError(null)
    const payload: ConsultaPayload = { citizenId }
    lastPayloadRef.current = payload
    void runConsulta(config, payload, false, {}, [])
  }

  function handleDisambiguateSubmit() {
    if (!config || !currentField) return
    const value = draft.trim()
    const currentYear = new Date().getFullYear()

    let error: string | null = null
    if (value !== '') {
      if (currentField === 'day' && (!/^\d{1,2}$/.test(value) || Number(value) < 1 || Number(value) > 31)) {
        error = t.errorDay
      } else if (
        currentField === 'year' &&
        (!/^\d{4}$/.test(value) || Number(value) < 1900 || Number(value) > currentYear)
      ) {
        error = t.errorYear(currentYear)
      } else if (currentField === 'postCode' && !/^\d{5}$/.test(value)) {
        error = t.errorPostCode
      }
    }
    if (error) {
      setFieldError(error)
      setFormError(null)
      return
    }
    if (value === '') {
      setFieldError(null)
      setFormError(t.errorEmptyField)
      return
    }

    const nextAttempt = attempts + 1
    if (nextAttempt > MAX_ATTEMPTS) {
      setScreen('too-many-attempts')
      setLiveMessage(t.liveError)
      return
    }

    const newAnswered = { ...answered, [currentField]: value }
    setAnswered(newAnswered)
    setDraft('')
    setFieldError(null)
    setFormError(null)
    setAttempts(nextAttempt)

    const payload: ConsultaPayload = { citizenId: document_, ...newAnswered }
    lastPayloadRef.current = payload
    void runConsulta(config, payload, true, newAnswered, dismissed)
  }

  function handleDontKnow() {
    if (!currentField) return
    const newDismissed = [...dismissed, currentField]
    setDismissed(newDismissed)
    setDraft('')
    setFieldError(null)
    setFormError(null)
    const next = firstRemainingField(requestedFields, answered, newDismissed)
    if (next === null) {
      setScreen('cannot-determine')
      setLiveMessage(t.liveError)
    } else {
      setCurrentField(next)
    }
  }

  function handleEditAnswer(field: UserField) {
    const previous = answered[field]
    setAnswered((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
    setDraft(previous ?? '')
    setCurrentField(field)
    setFieldError(null)
    setFormError(null)
  }

  function handleRetry() {
    if (!config || !lastPayloadRef.current) return
    const hadExtraData = Object.keys(lastPayloadRef.current).length > 1
    void runConsulta(config, lastPayloadRef.current, hadExtraData, answered, dismissed)
  }

  function handleChangeDocument() {
    setRequestedFields([])
    setAnswered({})
    setDismissed([])
    setCurrentField(null)
    setDraft('')
    setFieldError(null)
    setFormError(null)
    setAttempts(0)
    setDocError(null)
    setScreen('form')
  }

  function handleLanguageChange(lang: Language) {
    setLanguage(lang)
    storeLanguage(lang)
  }

  if (phase === 'loading-config') {
    return (
      <main className="app-loading" id="main">
        <p role="status">{dictionaries.ca.loading}</p>
      </main>
    )
  }

  if (phase === 'config-error') {
    const tc = dictionaries.ca
    return (
      <main className="app-config-error" id="main">
        <h1>{tc.configErrorTitle}</h1>
        <p>{tc.configErrorText}</p>
        {configErrors.length > 0 && (
          <ul>
            {configErrors.map((err) => (
              <li key={err}>
                <code>{err}</code>
              </li>
            ))}
          </ul>
        )}
      </main>
    )
  }

  if (phase === 'formato-error') {
    // El format del document no s'ha pogut obtenir: no es consulta amb el
    // document sencer com a alternativa, es demana reintentar.
    return (
      <main className="app-config-error" id="main">
        <h1>{t.genericErrorTitle}</h1>
        <p>{t.genericErrorText}</p>
        <div className="actions">
          <button type="button" className="button button-primary" onClick={retryFormato}>
            {t.retry}
          </button>
        </div>
      </main>
    )
  }

  const cfg = config as AppConfig
  const fmt = format as DocumentFormat

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        {t.skipToContent}
      </a>
      <Header
        config={cfg}
        t={t}
        language={language}
        languages={cfg.languages}
        onLanguageChange={handleLanguageChange}
      />

      <main id="main" tabIndex={-1} className="app-main">
        <div className="visually-hidden" role="status" aria-live="polite">
          {liveMessage}
        </div>

        {screen === 'form' && (
          <DocForm
            t={t}
            headingRef={headingRef}
            format={fmt}
            value={docInput}
            onChange={setDocInput}
            error={docError}
            submitting={submitting}
            notice={notice}
            onSubmit={handleDocSubmit}
          />
        )}

        {screen === 'disambiguate' && currentField && (
          <DisambiguateForm
            t={t}
            headingRef={headingRef}
            document_={document_}
            currentField={currentField}
            answered={answered}
            value={draft}
            fieldError={fieldError}
            formError={formError}
            submitting={submitting}
            onChange={setDraft}
            onSubmit={handleDisambiguateSubmit}
            onDontKnow={handleDontKnow}
            onEditAnswer={handleEditAnswer}
            onChangeDocument={handleChangeDocument}
          />
        )}

        {screen === 'result' && station && (
          <ResultCard
            t={t}
            headingRef={headingRef}
            station={station}
            onNewConsulta={() => resetAll()}
          />
        )}

        {screen === 'not-found' && (
          <MessageScreen headingRef={headingRef} title={t.notFoundTitle}>
            <p>{t.notFoundText}</p>
            <div className="actions">
              <button type="button" className="button button-primary" onClick={() => setScreen('form')}>
                {t.backToStart}
              </button>
            </div>
          </MessageScreen>
        )}

        {screen === 'mismatch' && (
          <MessageScreen headingRef={headingRef} title={t.mismatchTitle}>
            <p>{t.mismatchText}</p>
            <div className="actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => setScreen('disambiguate')}
              >
                {t.reviewData}
              </button>
              <button type="button" className="button button-secondary" onClick={() => resetAll()}>
                {t.newConsulta}
              </button>
            </div>
          </MessageScreen>
        )}

        {screen === 'cannot-determine' && (
          <MessageScreen headingRef={headingRef} title={t.cannotDetermineTitle}>
            <p>{t.cannotDetermineText}</p>
            <HelpBlock config={cfg} t={t} />
            <div className="actions">
              <button type="button" className="button button-secondary" onClick={() => resetAll()}>
                {t.newConsulta}
              </button>
            </div>
          </MessageScreen>
        )}

        {screen === 'too-many-attempts' && (
          <MessageScreen headingRef={headingRef} title={t.tooManyAttemptsTitle}>
            <p>{t.tooManyAttemptsText}</p>
            <HelpBlock config={cfg} t={t} />
            <div className="actions">
              <button type="button" className="button button-secondary" onClick={() => resetAll()}>
                {t.newConsulta}
              </button>
            </div>
          </MessageScreen>
        )}

        {screen === 'rate-limited' && (
          <MessageScreen headingRef={headingRef} title={t.rateLimitTitle}>
            <p>{t.rateLimitText}</p>
            <div className="actions">
              <button type="button" className="button button-primary" onClick={handleRetry}>
                {t.retry}
              </button>
              <button type="button" className="button button-secondary" onClick={() => resetAll()}>
                {t.backToStart}
              </button>
            </div>
          </MessageScreen>
        )}

        {screen === 'service-loading' && (
          <MessageScreen headingRef={headingRef} title={t.serviceLoadingTitle}>
            <p>{t.serviceLoadingText}</p>
            <div className="actions">
              <button type="button" className="button button-primary" onClick={handleRetry}>
                {t.retry}
              </button>
              <button type="button" className="button button-secondary" onClick={() => resetAll()}>
                {t.backToStart}
              </button>
            </div>
          </MessageScreen>
        )}

        {screen === 'error' && (
          <MessageScreen headingRef={headingRef} title={t.genericErrorTitle}>
            <p>{t.genericErrorText}</p>
            <div className="actions">
              <button type="button" className="button button-primary" onClick={handleRetry}>
                {t.retry}
              </button>
              <button type="button" className="button button-secondary" onClick={() => resetAll()}>
                {t.backToStart}
              </button>
            </div>
          </MessageScreen>
        )}
      </main>

      <footer className="site-footer">
        <HelpBlock config={cfg} t={t} />
        <p className="privacy-note">{t.privacyNote}</p>
      </footer>
    </div>
  )
}
