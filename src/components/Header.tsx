import type { AppConfig } from '../config'
import { LANGUAGES, LANGUAGE_NAMES, type Language, type Messages } from '../i18n'

interface HeaderProps {
  config: AppConfig
  t: Messages
  language: Language
  onLanguageChange: (lang: Language) => void
}

export function Header({ config, t, language, onLanguageChange }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-brand">
        <img
          className="site-logo"
          src={config.logoUrl}
          alt={config.logoAlt ?? t.logoAltDefault(config.entityName)}
          width="56"
          height="56"
        />
        <div className="site-header-names">
          <p className="site-entity-name">{config.entityName}</p>
          {config.electionName && <p className="site-election-name">{config.electionName}</p>}
        </div>
      </div>
      <nav className="language-selector" aria-label={t.languageSelectorLabel}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            type="button"
            lang={lang}
            aria-pressed={language === lang}
            className="language-button"
            onClick={() => onLanguageChange(lang)}
          >
            {lang.toUpperCase()}
            <span className="visually-hidden"> {LANGUAGE_NAMES[lang]}</span>
          </button>
        ))}
      </nav>
    </header>
  )
}
