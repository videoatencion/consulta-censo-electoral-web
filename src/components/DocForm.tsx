import { useId, type FormEvent, type RefObject } from 'react'
import type { Messages } from '../i18n'

interface DocFormProps {
  t: Messages
  headingRef: RefObject<HTMLHeadingElement | null>
  value: string
  onChange: (value: string) => void
  error: string | null
  submitting: boolean
  notice: string | null
  onSubmit: (raw: string) => void
}

/** Pantalla inicial: un sol camp, el document d'identitat. */
export function DocForm({ t, headingRef, value, onChange, error, submitting, notice, onSubmit }: DocFormProps) {
  const id = useId()
  const errorId = `${id}-error`
  const helpId = `${id}-help`

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(value)
  }

  return (
    <section aria-labelledby={`${id}-title`}>
      <h1 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="screen-title">
        {t.pageTitle}
      </h1>

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor={id}>{t.docLabel}</label>
          <input
            id={id}
            name="citizenId"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t.docPlaceholder}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            autoCapitalize="characters"
            aria-describedby={error ? `${helpId} ${errorId}` : helpId}
            aria-invalid={error ? true : undefined}
            disabled={submitting}
          />
          <p id={helpId} className="field-help">
            {t.docHelp}
          </p>
          {error && (
            <p id={errorId} className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? t.loading : t.submit}
        </button>
      </form>
    </section>
  )
}
