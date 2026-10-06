import { useEffect, useId, useRef, type FormEvent, type RefObject } from 'react'
import type { UserField } from '../api'
import type { Messages } from '../i18n'

type StringMessageKey = {
  [K in keyof Messages]: Messages[K] extends string ? K : never
}[keyof Messages]

interface FieldMeta {
  label: StringMessageKey
  dontKnow: StringMessageKey
  inputMode?: 'numeric' | 'text'
  maxLength?: number
}

const FIELD_META: Record<UserField, FieldMeta> = {
  day: { label: 'fieldDay', dontKnow: 'dontKnow', inputMode: 'numeric', maxLength: 2 },
  year: { label: 'fieldYear', dontKnow: 'dontKnow', inputMode: 'numeric', maxLength: 4 },
  fn: { label: 'fieldFn', dontKnow: 'dontKnow' },
  sn1: { label: 'fieldSn1', dontKnow: 'dontKnow' },
  sn2: { label: 'fieldSn2', dontKnow: 'dontKnowSn2' },
  postCode: { label: 'fieldPostCode', dontKnow: 'dontKnow', inputMode: 'numeric', maxLength: 5 },
}

interface DisambiguateFormProps {
  t: Messages
  headingRef: RefObject<HTMLHeadingElement | null>
  document_: string
  currentField: UserField
  answered: Partial<Record<UserField, string>>
  value: string
  fieldError: string | null
  formError: string | null
  submitting: boolean
  onChange: (value: string) => void
  onSubmit: () => void
  onDontKnow: () => void
  onEditAnswer: (field: UserField) => void
  onChangeDocument: () => void
}

/**
 * Pantalla de desempat d'una dada cada vegada: el document queda fix, les dades
 * ja aportades es mostren com a resum i es demana només el primer camp de la
 * llista ordenada que encara no s'ha contestat ni descartat.
 */
export function DisambiguateForm({
  t,
  headingRef,
  document_,
  currentField,
  answered,
  value,
  fieldError,
  formError,
  submitting,
  onChange,
  onSubmit,
  onDontKnow,
  onEditAnswer,
  onChangeDocument,
}: DisambiguateFormProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const prevFieldRef = useRef<UserField | null>(null)

  const meta = FIELD_META[currentField]
  const fieldId = `${id}-${currentField}`
  const errorId = `${fieldId}-error`
  const answeredEntries = Object.entries(answered) as [UserField, string][]

  // En canviar de pregunta (no de pantalla), el focus va al nou camp. El focus
  // inicial de la pantalla el fa App al títol.
  useEffect(() => {
    if (prevFieldRef.current !== null && prevFieldRef.current !== currentField) {
      inputRef.current?.focus()
    }
    prevFieldRef.current = currentField
  }, [currentField])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="visually-hidden" role="status" aria-live="polite">
        {t.liveQuestion(t[meta.label])}
      </div>

      <h1 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="screen-title">
        {t.disambiguateTitle}
      </h1>

      <div className="readonly-document">
        <span className="readonly-document-label">{t.documentReadonlyLabel}:</span>{' '}
        <strong>{document_}</strong>{' '}
        <button type="button" className="button button-link" onClick={onChangeDocument}>
          {t.changeDocument}
        </button>
      </div>

      <p>{t.disambiguateText}</p>

      {answeredEntries.length > 0 && (
        <ul className="answered-summary" aria-label={t.answeredSummaryLabel}>
          {answeredEntries.map(([field, val]) => (
            <li key={field}>
              <span>
                {t[FIELD_META[field].label]}: <strong>{val}</strong>
              </span>{' '}
              <button
                type="button"
                className="button button-link"
                onClick={() => onEditAnswer(field)}
                disabled={submitting}
                aria-label={`${t.changeAnswer}: ${t[FIELD_META[field].label]}`}
              >
                {t.changeAnswer}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor={fieldId}>{t[meta.label]}</label>
          <input
            ref={inputRef}
            id={fieldId}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode={meta.inputMode}
            maxLength={meta.maxLength}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={fieldError ? errorId : undefined}
            aria-invalid={fieldError ? true : undefined}
            disabled={submitting}
          />
          {fieldError && (
            <p id={errorId} className="field-error" role="alert">
              {fieldError}
            </p>
          )}
        </div>

        {formError && (
          <p className="field-error" role="alert">
            {formError}
          </p>
        )}

        <div className="actions">
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? t.loading : t.submitAgain}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={onDontKnow}
            disabled={submitting}
          >
            {t[meta.dontKnow]}
          </button>
        </div>
      </form>
    </section>
  )
}
