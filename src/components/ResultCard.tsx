import type { RefObject } from 'react'
import type { PollingStation } from '../api'
import type { Messages } from '../i18n'

interface ResultCardProps {
  t: Messages
  headingRef: RefObject<HTMLHeadingElement | null>
  station: PollingStation
  onNewConsulta: () => void
}

/** Targeta de resultat amb el col·legi electoral i les accions. */
export function ResultCard({ t, headingRef, station, onNewConsulta }: ResultCardProps) {
  const query = encodeURIComponent(`${station.colele}, ${station.dircol}, ${station.poblacion}`)
  const osmUrl = `https://www.openstreetmap.org/search?query=${query}`

  return (
    <section aria-labelledby="result-title" className="result-card">
      <h1 id="result-title" ref={headingRef} tabIndex={-1} className="screen-title">
        {t.resultTitle}
      </h1>

      <dl className="result-data">
        <div className="result-row result-row-main">
          <dt>{t.pollingStation}</dt>
          <dd>{station.colele}</dd>
        </div>
        <div className="result-row">
          <dt>{t.address}</dt>
          <dd>{station.dircol}</dd>
        </div>
        <div className="result-row">
          <dt>{t.municipality}</dt>
          <dd>{station.poblacion}</dd>
        </div>
        <div className="result-row">
          <dt>{t.districtSectionMesa}</dt>
          <dd>
            {station.distrito} / {station.seccion} / {station.mesa}
          </dd>
        </div>
      </dl>

      <div className="actions">
        <a className="button button-primary" href={osmUrl} target="_blank" rel="noopener noreferrer">
          {t.howToArrive}
          <span className="visually-hidden"> {t.opensNewWindow}</span>
          <span aria-hidden="true"> ↗</span>
        </a>
        <button type="button" className="button button-secondary" onClick={() => window.print()}>
          {t.print}
        </button>
        <button type="button" className="button button-secondary" onClick={onNewConsulta}>
          {t.newConsulta}
        </button>
      </div>
    </section>
  )
}
