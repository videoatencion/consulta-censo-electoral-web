export const LANGUAGES = ['ca', 'es'] as const
export type Language = (typeof LANGUAGES)[number]

export const LANGUAGE_NAMES: Record<Language, string> = {
  ca: 'Català',
  es: 'Castellano',
}

const ca = {
  skipToContent: 'Salta al contingut principal',
  languageSelectorLabel: 'Idioma',
  pageTitle: 'Consulta on has d’anar a votar',
  logoAltDefault: (entityName: string) => `Logotip: ${entityName}`,

  docLabel: 'DNI o NIE',
  docHelp:
    'Escriviu el document amb la lletra. També s’admeten passaports i documents de ciutadans de la UE.',
  docPlaceholder: 'p. ex. 12345678Z',
  submit: 'Consulta',
  loading: 'S’està consultant, espereu…',
  errorDocInvalidLetter:
    'La lletra de control no correspon al número del document. Reviseu-lo i torneu-ho a provar.',
  errorDocInvalidFormat:
    'El format del document no és vàlid. Escriviu un DNI, un NIE o un altre document de 5 a 20 caràcters.',

  documentReadonlyLabel: 'Document',
  changeDocument: 'Canvia el document',
  disambiguateTitle: 'Necessitem alguna dada més',
  disambiguateText:
    'Hi ha més d’una persona amb aquestes dades. Responeu aquesta pregunta per identificar-vos.',
  fieldDay: 'Dia de naixement',
  fieldYear: 'Any de naixement',
  fieldFn: 'Nom',
  fieldSn1: 'Primer cognom',
  fieldSn2: 'Segon cognom',
  fieldPostCode: 'Codi postal del vostre domicili',
  answeredSummaryLabel: 'Dades que ja heu donat',
  changeAnswer: 'Canvia',
  dontKnow: 'No ho sé',
  dontKnowSn2: 'No en tinc / no ho sé',
  submitAgain: 'Continua',
  errorEmptyField: 'Escriviu la dada o premeu «No ho sé» si no la sabeu.',
  errorDay: 'Introduïu un dia entre 1 i 31.',
  errorYear: (maxYear: number) => `Introduïu un any de 4 xifres entre 1900 i ${maxYear}.`,
  errorPostCode: 'Introduïu un codi postal de 5 xifres.',

  resultTitle: 'On heu de votar',
  pollingStation: 'Col·legi electoral',
  address: 'Adreça',
  municipality: 'Població',
  districtSectionMesa: 'Districte / Secció / Mesa',
  howToArrive: 'Com arribar-hi',
  opensNewWindow: '(s’obre en una finestra nova)',
  print: 'Imprimeix',
  newConsulta: 'Nova consulta',

  notFoundTitle: 'No us hem trobat al cens',
  notFoundText:
    'No hi ha cap registre amb aquest document. Reviseu que l’hàgiu escrit bé i torneu-ho a provar.',
  mismatchTitle: 'Les dades no coincideixen',
  mismatchText:
    'Les dades addicionals no coincideixen amb el document. Reviseu-les i torneu-ho a provar.',
  reviewData: 'Revisa les dades',

  cannotDetermineTitle: 'No s’ha pogut determinar el col·legi electoral',
  cannotDetermineText:
    'Hi ha diverses persones amb dades molt semblants i no es pot resoldre la consulta en línia. Contacteu amb nosaltres i us ho resoldrem.',

  rateLimitTitle: 'Massa consultes seguides',
  rateLimitText: 'Espereu un minut i torneu-ho a provar.',
  serviceLoadingTitle: 'El servei s’està actualitzant',
  serviceLoadingText: 'Torneu-ho a provar d’aquí a uns minuts.',
  genericErrorTitle: 'S’ha produït un error',
  genericErrorText:
    'No s’ha pogut completar la consulta per un problema del servei. Torneu-ho a provar.',
  retry: 'Torna-ho a provar',
  backToStart: 'Torna a l’inici',

  tooManyAttemptsTitle: 'No s’ha pogut completar la identificació',
  tooManyAttemptsText:
    'Heu superat el nombre màxim d’intents per a aquest document. Contacteu amb nosaltres i us ajudarem a resoldre la consulta.',

  inactivityNotice:
    'Per seguretat, s’han esborrat les dades després d’un temps sense activitat.',

  helpTitle: 'Necessiteu ajuda?',
  helpPhoneLabel: 'Telèfon',
  helpEmailLabel: 'Correu electrònic',
  incidentsText:
    'Si creieu que hi ha un error a les vostres dades del cens electoral, podeu presentar una reclamació.',
  incidentsLink: 'Presenta una reclamació al cens',

  privacyNote: 'No es desa cap dada personal al navegador ni s’envia a tercers.',

  configErrorTitle: 'Error de configuració',
  configErrorText:
    'L’aplicació no està ben configurada i no es pot fer servir. Si us plau, aviseu el personal responsable del servei.',

  liveLoading: 'S’està consultant el cens.',
  liveDisambiguate: 'Cal alguna dada addicional per identificar-vos.',
  liveQuestion: (label: string) => `Pregunta: ${label}.`,
  liveResult: 'S’ha trobat el vostre col·legi electoral.',
  liveError: 'No s’ha pogut completar la consulta.',
}

export type Messages = typeof ca

const es: Messages = {
  skipToContent: 'Saltar al contenido principal',
  languageSelectorLabel: 'Idioma',
  pageTitle: 'Consulta dónde tienes que ir a votar',
  logoAltDefault: (entityName: string) => `Logotipo de ${entityName}`,

  docLabel: 'DNI o NIE',
  docHelp:
    'Escriba el documento con la letra. También se admiten pasaportes y documentos de ciudadanos de la UE.',
  docPlaceholder: 'p. ej. 12345678Z',
  submit: 'Consultar',
  loading: 'Consultando, espere…',
  errorDocInvalidLetter:
    'La letra de control no corresponde al número del documento. Revíselo e inténtelo de nuevo.',
  errorDocInvalidFormat:
    'El formato del documento no es válido. Escriba un DNI, un NIE u otro documento de 5 a 20 caracteres.',

  documentReadonlyLabel: 'Documento',
  changeDocument: 'Cambiar el documento',
  disambiguateTitle: 'Necesitamos algún dato más',
  disambiguateText:
    'Hay más de una persona con estos datos. Responda a esta pregunta para identificarse.',
  fieldDay: 'Día de nacimiento',
  fieldYear: 'Año de nacimiento',
  fieldFn: 'Nombre',
  fieldSn1: 'Primer apellido',
  fieldSn2: 'Segundo apellido',
  fieldPostCode: 'Código postal de su domicilio',
  answeredSummaryLabel: 'Datos que ya ha aportado',
  changeAnswer: 'Cambiar',
  dontKnow: 'No lo sé',
  dontKnowSn2: 'No tengo / no lo sé',
  submitAgain: 'Continuar',
  errorEmptyField: 'Escriba el dato o pulse «No lo sé» si no lo sabe.',
  errorDay: 'Introduzca un día entre 1 y 31.',
  errorYear: (maxYear: number) => `Introduzca un año de 4 cifras entre 1900 y ${maxYear}.`,
  errorPostCode: 'Introduzca un código postal de 5 cifras.',

  resultTitle: 'Dónde tiene que votar',
  pollingStation: 'Colegio electoral',
  address: 'Dirección',
  municipality: 'Municipio',
  districtSectionMesa: 'Distrito / Sección / Mesa',
  howToArrive: 'Cómo llegar',
  opensNewWindow: '(se abre en una ventana nueva)',
  print: 'Imprimir',
  newConsulta: 'Nueva consulta',

  notFoundTitle: 'No le hemos encontrado en el censo',
  notFoundText:
    'No hay ningún registro con este documento. Revise que lo haya escrito bien e inténtelo de nuevo.',
  mismatchTitle: 'Los datos no coinciden',
  mismatchText:
    'Los datos adicionales no coinciden con el documento. Revíselos e inténtelo de nuevo.',
  reviewData: 'Revisar los datos',

  cannotDetermineTitle: 'No se ha podido determinar el colegio electoral',
  cannotDetermineText:
    'Hay varias personas con datos muy parecidos y no se puede resolver la consulta en línea. Contacte con nosotros y se lo resolveremos.',

  rateLimitTitle: 'Demasiadas consultas seguidas',
  rateLimitText: 'Espere un minuto e inténtelo de nuevo.',
  serviceLoadingTitle: 'El servicio se está actualizando',
  serviceLoadingText: 'Inténtelo de nuevo dentro de unos minutos.',
  genericErrorTitle: 'Se ha producido un error',
  genericErrorText:
    'No se ha podido completar la consulta por un problema del servicio. Inténtelo de nuevo.',
  retry: 'Reintentar',
  backToStart: 'Volver al inicio',

  tooManyAttemptsTitle: 'No se ha podido completar la identificación',
  tooManyAttemptsText:
    'Ha superado el número máximo de intentos para este documento. Contacte con nosotros y le ayudaremos a resolver la consulta.',

  inactivityNotice:
    'Por seguridad, se han borrado los datos tras un tiempo sin actividad.',

  helpTitle: '¿Necesita ayuda?',
  helpPhoneLabel: 'Teléfono',
  helpEmailLabel: 'Correo electrónico',
  incidentsText:
    'Si cree que hay un error en sus datos del censo electoral, puede presentar una reclamación.',
  incidentsLink: 'Presentar una reclamación al censo',

  privacyNote: 'No se guarda ningún dato personal en el navegador ni se envía a terceros.',

  configErrorTitle: 'Error de configuración',
  configErrorText:
    'La aplicación no está bien configurada y no se puede usar. Por favor, avise al personal responsable del servicio.',

  liveLoading: 'Consultando el censo.',
  liveDisambiguate: 'Se necesita algún dato adicional para identificarle.',
  liveQuestion: (label: string) => `Pregunta: ${label}.`,
  liveResult: 'Se ha encontrado su colegio electoral.',
  liveError: 'No se ha podido completar la consulta.',
}

export const dictionaries: Record<Language, Messages> = { ca, es }

export function isLanguage(value: unknown): value is Language {
  return value === 'ca' || value === 'es'
}
