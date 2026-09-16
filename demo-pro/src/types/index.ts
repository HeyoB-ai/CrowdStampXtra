/**
 * Datamodel CrowdStamp Pro (demo).
 * Deze types zijn zo opgezet dat ze 1-op-1 te mappen zijn op Supabase-tabellen
 * (snake_case in de database, camelCase hier). Zie README → "Naar Supabase".
 */

export type ID = string

export interface Adres {
  straat: string
  postcode: string
  plaats: string
}

export interface Locatie extends Adres {
  lat: number
  lng: number
}

export interface Klant {
  id: ID
  naam: string
  kvk: string
  adres: Adres
  contactpersoon: string
  email: string
  telefoon?: string
  debiteurnummer: string
  /** Type klant, alleen voor weergave in de demo */
  soort: 'woningcorporatie' | 'projectontwikkelaar' | 'vve' | 'particulier' | 'overig'
}

export type OpdrachtStatus = 'offerte' | 'gepland' | 'in_uitvoering' | 'opgeleverd' | 'gefactureerd'
export type Contractvorm = 'aanneemsom' | 'regie'
export type Kostensoort = 'arbeid' | 'materiaal' | 'materieel' | 'onderaanneming'

export interface CalculatieRegel {
  id: ID
  type: Kostensoort
  omschrijving: string
  aantal: number
  eenheid: string
  /** kostprijs per eenheid */
  kostprijs: number
  /** verkoopprijs per eenheid */
  verkoopprijs: number
  opslagPercentage: number
  /** id van de akkoord meerwerkpost waar deze regel uit komt */
  uitMeerwerk?: ID
}

export interface Document {
  id: ID
  naam: string
  type: 'offerte' | 'tekening' | 'contract' | 'overig'
  datum: string // ISO
}

export interface Opdracht {
  id: ID
  nummer: string
  klantId: ID
  omschrijving: string
  toelichting?: string
  locatie: Locatie
  status: OpdrachtStatus
  startdatum: string // ISO yyyy-mm-dd
  einddatum: string
  contractvorm: Contractvorm
  /** Overeengekomen aanneemsom (excl. btw) – alleen bij contractvorm aanneemsom */
  aanneemsom?: number
  voorcalculatie: CalculatieRegel[]
  btwVerlegd: boolean
  /** btw-percentage voor deze opdracht (21 of 9); wordt genegeerd bij btwVerlegd */
  btwPercentage: 21 | 9
  documenten: Document[]
  projectleiderId: ID
  aangemaaktOp: string
  /** Voortgang in % (0-100), door de projectleider bijgehouden; basis voor termijnfacturen */
  voortgang: number
}

export type WerkbonStatus = 'open' | 'onderweg' | 'in_uitvoering' | 'gereed' | 'goedgekeurd'

export interface ChecklistItem {
  id: ID
  tekst: string
  gedaan: boolean
}

export interface Werkbon {
  id: ID
  nummer: string
  opdrachtId: ID
  toegewezenAan: ID[]
  datum: string // yyyy-mm-dd
  omschrijving: string
  status: WerkbonStatus
  checklist: ChecklistItem[]
  handtekeningKlant?: string // data-URL
  handtekeningNaam?: string
  handtekeningOp?: string
  notities: string
  /** Startuur volgens planning, bv. "07:30" */
  geplandStart: string
  geplandUren: number
}

export type Uursoort = 'normaal' | 'overwerk125' | 'overwerk150' | 'reistijd'

export interface GpsPunt {
  lat: number
  lng: number
  nauwkeurigheid: number
  tijd: string // ISO
}

export interface Urenregel {
  id: ID
  medewerkerId: ID
  werkbonId: ID
  opdrachtId: ID
  datum: string
  start: string // HH:mm
  eind?: string // HH:mm – leeg als er nog niet is uitgecheckt
  pauzeMinuten: number
  uursoort: Uursoort
  checkIn?: GpsPunt
  checkOut?: GpsPunt
  goedgekeurd: boolean
  toelichting?: string
}

export interface Materiaalregel {
  id: ID
  werkbonId: ID
  opdrachtId: ID
  artikelId?: ID
  artikel: string
  aantal: number
  eenheid: string
  kostprijs: number
  verkoopprijs: number
  datum: string
}

export type FotoCategorie = 'voor' | 'tijdens' | 'na' | 'schade' | 'meerwerk'

export interface Foto {
  id: ID
  werkbonId: ID
  opdrachtId: ID
  dataUrl: string
  tijdstempel: string // ISO
  gps?: { lat: number; lng: number }
  categorie: FotoCategorie
  bijschrift: string
  medewerkerId?: ID
}

export type MeerwerkStatus = 'gemeld' | 'ter_akkoord' | 'akkoord' | 'afgewezen'

export interface Meerwerk {
  id: ID
  nummer: string
  opdrachtId: ID
  werkbonId?: ID
  omschrijving: string
  reden: string
  fotoIds: ID[]
  geschatteUren: number
  uurtarief: number
  materiaalBedrag: number
  materiaalOmschrijving?: string
  /** Totaal excl. btw */
  bedrag: number
  status: MeerwerkStatus
  gemeldDoor: ID
  gemeldOp: string
  akkoordDoor?: string
  akkoordOp?: string
  akkoordHandtekening?: string
  afgewezenReden?: string
  /** true zodra dit meerwerk op een factuur staat */
  gefactureerd: boolean
}

export type MedewerkerRol =
  | 'projectleider'
  | 'uitvoerder'
  | 'monteur'
  | 'timmerman'
  | 'schilder'
  | 'stukadoor'
  | 'tegelzetter'
  | 'administratie'

export interface Medewerker {
  id: ID
  naam: string
  initialen: string
  rol: MedewerkerRol
  uurtariefKostprijs: number
  uurtariefVerkoop: number
  bedrijf: string
  /** eigen personeel of onderaannemer */
  soort: 'eigen' | 'onderaannemer'
  telefoon: string
  email: string
  kleur: string
}

export interface Artikel {
  id: ID
  code: string
  naam: string
  eenheid: string
  kostprijs: number
  verkoopprijs: number
  btwPercentage: 21 | 9
  groep: 'materiaal' | 'materieel'
}

export interface UursoortDef {
  code: Uursoort
  naam: string
  factor: number
}

export type FactuurType = 'termijn' | 'eindafrekening' | 'regie' | 'meerwerk'
export type FactuurStatus = 'concept' | 'verzonden' | 'betaald'
export type ErpSyncStatus = 'niet_gesynchroniseerd' | 'gesynchroniseerd' | 'fout'

export interface FactuurRegel {
  id: ID
  omschrijving: string
  aantal: number
  eenheid: string
  prijs: number
  btwPercentage: number
  bedrag: number
  /** Herkomst voor traceerbaarheid */
  bron?: { type: 'uren' | 'materiaal' | 'meerwerk' | 'termijn'; ids: ID[] }
}

export interface Factuur {
  id: ID
  nummer: string
  opdrachtId: ID
  klantId: ID
  type: FactuurType
  datum: string
  vervaldatum: string
  regels: FactuurRegel[]
  subtotaal: number
  btw: number
  totaal: number
  btwVerlegd: boolean
  status: FactuurStatus
  erpStatus: ErpSyncStatus
  erpReferentie?: string
  erpPakket?: ErpPakket
  erpMelding?: string
  betaaldOp?: string
  verzondenOp?: string
  omschrijving: string
}

export type ErpPakket = 'exact' | 'afas' | 'twinfield' | 'snelstart' | 'generiek'

export interface KoppelingInstellingen {
  grootboekOmzet: string
  grootboekOmzetVerlegd: string
  grootboekBtw: string
  grootboekDebiteuren: string
  dagboek: string
  kostenplaatsIsOpdracht: boolean
  autoSyncBijVerzonden: boolean
}

export interface Koppeling {
  pakket: ErpPakket
  verbonden: boolean
  verbondenOp?: string
  administratie?: string
  instellingen: KoppelingInstellingen
  laatsteSync?: string
}

export type SyncRichting = 'naar_erp' | 'van_erp'
export type SyncStatus = 'bezig' | 'ok' | 'fout'
export type SyncActie = 'pushFactuur' | 'pushUren' | 'syncKlanten' | 'syncArtikelen' | 'haalBetaalstatus'

export interface SyncLogRegel {
  id: ID
  tijdstip: string
  pakket: ErpPakket
  richting: SyncRichting
  object: string
  objectId?: ID
  status: SyncStatus
  melding: string
  /** actie die opnieuw geprobeerd kan worden */
  actie?: SyncActie
}

export interface TijdlijnItem {
  id: ID
  opdrachtId: ID
  tijdstip: string
  type: 'opdracht' | 'werkbon' | 'uren' | 'foto' | 'meerwerk' | 'calculatie' | 'factuur' | 'erp' | 'notitie'
  tekst: string
  door?: string
}

export interface Bedrijf {
  naam: string
  adres: Adres
  kvk: string
  btw: string
  iban: string
  email: string
  telefoon: string
  website: string
}

export type Rol = 'beheer' | 'veld'

/** Volledige demo-state die in localStorage staat */
export interface DemoState {
  versie: number
  bedrijf: Bedrijf
  klanten: Klant[]
  medewerkers: Medewerker[]
  artikelen: Artikel[]
  uursoorten: UursoortDef[]
  opdrachten: Opdracht[]
  werkbonnen: Werkbon[]
  uren: Urenregel[]
  materiaal: Materiaalregel[]
  fotos: Foto[]
  meerwerk: Meerwerk[]
  facturen: Factuur[]
  koppelingen: Koppeling[]
  syncLog: SyncLogRegel[]
  tijdlijn: TijdlijnItem[]
  tellers: Record<string, number>
}
