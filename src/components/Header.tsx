import { resolveText, type AppConfig } from '../config'
import { LANGUAGE_NAMES, type Language, type Messages } from '../i18n'

interface HeaderProps {
  config: AppConfig
  t: Messages
  language: Language
  languages: Language[]
  onLanguageChange: (lang: Language) => void
}

export function Header({ config, t, language, languages, onLanguageChange }: HeaderProps) {
  const entityName = resolveText(config.entityName, language, config.defaultLanguage)
  const electionName = config.electionName
    ? resolveText(config.electionName, language, config.defaultLanguage)
    : undefined
  const logoAlt = config.logoAlt
    ? resolveText(config.logoAlt, language, config.defaultLanguage)
    : t.logoAltDefault(entityName)

  return (
    <header className="site-header">
      <div className="site-header-brand">
        <img
          className="site-logo"
          src={config.logoUrl}
          alt={logoAlt}
          width="56"
          height="56"
        />
        <div className="site-header-names">
          <p className="site-entity-name">{entityName}</p>
          {electionName && <p className="site-election-name">{electionName}</p>}
        </div>
      </div>
      {languages.length > 1 && (
        <nav className="language-selector" aria-label={t.languageSelectorLabel}>
          {languages.map((lang) => (
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
      )}
    </header>
  )
}
