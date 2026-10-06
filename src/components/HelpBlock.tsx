import type { AppConfig } from '../config'
import type { Messages } from '../i18n'

interface HelpBlockProps {
  config: AppConfig
  t: Messages
}

/** Bloc d'ajuda amb contacte i enllaç de reclamació; no es renderitza si no hi ha res configurat. */
export function HelpBlock({ config, t }: HelpBlockProps) {
  const { contactPhone, contactEmail, incidentsUrl } = config
  if (!contactPhone && !contactEmail && !incidentsUrl) return null

  return (
    <section className="help-block" aria-labelledby="help-block-title">
      <h2 id="help-block-title">{t.helpTitle}</h2>
      <ul className="help-block-list">
        {contactPhone && (
          <li>
            <span className="help-label">{t.helpPhoneLabel}:</span>{' '}
            <a href={`tel:${contactPhone.replace(/[\s-]+/g, '')}`}>{contactPhone}</a>
          </li>
        )}
        {contactEmail && (
          <li>
            <span className="help-label">{t.helpEmailLabel}:</span>{' '}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </li>
        )}
        {incidentsUrl && (
          <li>
            {t.incidentsText}{' '}
            <a href={incidentsUrl} target="_blank" rel="noopener noreferrer">
              {t.incidentsLink}
              <span className="visually-hidden"> {t.opensNewWindow}</span>
            </a>
          </li>
        )}
      </ul>
    </section>
  )
}
