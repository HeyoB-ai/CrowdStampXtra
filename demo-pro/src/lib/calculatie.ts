import type { DataStore } from '../data/store'
import type { Factuur, ID, Kostensoort, Medewerker, Opdracht, Urenregel, Uursoort } from '../types'
import { urenTussen } from './format'
import { afstandMeters } from './geo'

export const KOSTENSOORTEN: { code: Kostensoort; naam: string }[] = [
  { code: 'arbeid', naam: 'Arbeid (eigen personeel)' },
  { code: 'onderaanneming', naam: 'Onderaanneming' },
  { code: 'materiaal', naam: 'Materiaal' },
  { code: 'materieel', naam: 'Materieel' },
]

export const UURSOORT_FACTOR: Record<Uursoort, number> = { normaal: 1, overwerk125: 1.25, overwerk150: 1.5, reistijd: 1 }

export function urenVanRegel(u: Urenregel): number {
  return urenTussen(u.start, u.eind, u.pauzeMinuten)
}

/** Kostprijs van een urenregel (kostprijs medewerker × uren × toeslagfactor) */
export function kostVanUren(u: Urenregel, mw: Medewerker | undefined): number {
  if (!mw) return 0
  return urenVanRegel(u) * mw.uurtariefKostprijs * UURSOORT_FACTOR[u.uursoort]
}

/** Verkoopwaarde van een urenregel */
export function verkoopVanUren(u: Urenregel, mw: Medewerker | undefined): number {
  if (!mw) return 0
  return urenVanRegel(u) * mw.uurtariefVerkoop * UURSOORT_FACTOR[u.uursoort]
}

export interface SoortResultaat {
  soort: Kostensoort
  naam: string
  begrootKost: number
  begrootVerkoop: number
  werkelijkKost: number
  werkelijkVerkoop: number
  /** verschil in kosten: werkelijk − begroot (positief = overschrijding) */
  verschil: number
  verschilPct: number
  /** verwacht bij huidige voortgang */
  verwachtKost: number
}

export interface Nacalculatie {
  opdracht: Opdracht
  perSoort: SoortResultaat[]
  begrootKost: number
  begrootVerkoop: number
  /** aanneemsom, of begrote verkoopwaarde bij regie */
  contractwaarde: number
  werkelijkKost: number
  /** verkoopwaarde van gerealiseerd werk (uren × verkoop + materiaal verkoop) */
  werkelijkVerkoop: number
  meerwerkAkkoord: number
  meerwerkTerAkkoord: number
  voortgang: number
  /** prognose eindkosten: werkelijk / voortgang (min. begroot bij <10% voortgang) */
  prognoseKost: number
  prognoseOmzet: number
  prognoseResultaat: number
  begrootResultaat: number
  begrootMargePct: number
  prognoseMargePct: number
  budgetVerbruiktPct: number
  gefactureerd: number
  teFactureren: number
  kleur: 'good' | 'warn' | 'bad'
  gewerkteUren: number
  begroteUren: number
}

export function berekenNacalculatie(store: DataStore, opdrachtId: ID): Nacalculatie | undefined {
  const o = store.getOpdracht(opdrachtId)
  if (!o) return undefined
  const uren = store.getUren({ opdrachtId })
  const materiaal = store.getMateriaal({ opdrachtId })
  const meerwerk = store.getMeerwerk({ opdrachtId })
  const facturen = store.getFacturen({ opdrachtId })
  const artikelen = store.getArtikelen()
  const mwMap = new Map(store.getMedewerkers().map((m) => [m.id, m]))

  const regulier = o.voorcalculatie.filter((r) => !r.uitMeerwerk)
  const meerwerkAkkoord = meerwerk.filter((m) => m.status === 'akkoord').reduce((s, m) => s + m.bedrag, 0)
  const meerwerkTerAkkoord = meerwerk.filter((m) => m.status === 'ter_akkoord').reduce((s, m) => s + m.bedrag, 0)

  const perSoort: SoortResultaat[] = KOSTENSOORTEN.map(({ code, naam }) => {
    const regels = regulier.filter((r) => r.type === code)
    const begrootKost = regels.reduce((s, r) => s + r.aantal * r.kostprijs, 0)
    const begrootVerkoop = regels.reduce((s, r) => s + r.aantal * r.verkoopprijs, 0)
    let werkelijkKost = 0
    let werkelijkVerkoop = 0
    if (code === 'arbeid' || code === 'onderaanneming') {
      const soort = code === 'arbeid' ? 'eigen' : 'onderaannemer'
      for (const u of uren) {
        const mw = mwMap.get(u.medewerkerId)
        if (mw?.soort === soort) {
          werkelijkKost += kostVanUren(u, mw)
          werkelijkVerkoop += verkoopVanUren(u, mw)
        }
      }
    } else {
      for (const m of materiaal) {
        const art = artikelen.find((a) => a.id === m.artikelId)
        const groep = art?.groep ?? 'materiaal'
        if (groep === code) {
          werkelijkKost += m.aantal * m.kostprijs
          werkelijkVerkoop += m.aantal * m.verkoopprijs
        }
      }
    }
    const voortgang = Math.max(o.voortgang, 1) / 100
    const verwachtKost = begrootKost * voortgang
    const verschil = werkelijkKost - verwachtKost
    return {
      soort: code,
      naam,
      begrootKost,
      begrootVerkoop,
      werkelijkKost,
      werkelijkVerkoop,
      verschil,
      verschilPct: verwachtKost ? (verschil / verwachtKost) * 100 : werkelijkKost ? 100 : 0,
      verwachtKost,
    }
  })

  const begrootKost = perSoort.reduce((s, p) => s + p.begrootKost, 0)
  const begrootVerkoop = perSoort.reduce((s, p) => s + p.begrootVerkoop, 0)
  const contractwaarde = o.contractvorm === 'aanneemsom' && o.aanneemsom ? o.aanneemsom : begrootVerkoop
  const werkelijkKost = perSoort.reduce((s, p) => s + p.werkelijkKost, 0)
  const werkelijkVerkoop = perSoort.reduce((s, p) => s + p.werkelijkVerkoop, 0)
  const voortgang = o.voortgang
  const prognoseKost = voortgang >= 10 ? werkelijkKost / (voortgang / 100) : Math.max(begrootKost, werkelijkKost)
  // Bij regie is de omzet wat er gewerkt wordt; bij aanneemsom de vaste som + meerwerk
  const prognoseOmzet = o.contractvorm === 'aanneemsom' ? contractwaarde + meerwerkAkkoord : (voortgang >= 10 ? werkelijkVerkoop / (voortgang / 100) : begrootVerkoop) + meerwerkAkkoord
  const prognoseResultaat = prognoseOmzet - prognoseKost - meerwerkAkkoord * 0.72
  const begrootResultaat = contractwaarde - begrootKost
  const gefactureerd = facturen.filter((f) => f.status !== 'concept').reduce((s, f) => s + f.subtotaal, 0)
  const teFactureren = berekenTeFactureren(o, werkelijkVerkoop, meerwerk.filter((m) => m.status === 'akkoord' && !m.gefactureerd).reduce((s, m) => s + m.bedrag, 0), facturen)
  const budgetVerbruiktPct = begrootKost ? (werkelijkKost / begrootKost) * 100 : 0
  const afwijkingPct = begrootResultaat ? ((prognoseResultaat - begrootResultaat) / Math.abs(begrootResultaat)) * 100 : 0
  const kleur: Nacalculatie['kleur'] = prognoseResultaat < 0 || afwijkingPct < -25 ? 'bad' : afwijkingPct < -5 ? 'warn' : 'good'

  return {
    opdracht: o,
    perSoort,
    begrootKost,
    begrootVerkoop,
    contractwaarde,
    werkelijkKost,
    werkelijkVerkoop,
    meerwerkAkkoord,
    meerwerkTerAkkoord,
    voortgang,
    prognoseKost,
    prognoseOmzet,
    prognoseResultaat,
    begrootResultaat,
    begrootMargePct: contractwaarde ? (begrootResultaat / contractwaarde) * 100 : 0,
    prognoseMargePct: prognoseOmzet ? (prognoseResultaat / prognoseOmzet) * 100 : 0,
    budgetVerbruiktPct,
    gefactureerd,
    teFactureren,
    kleur,
    gewerkteUren: uren.reduce((s, u) => s + urenVanRegel(u), 0),
    begroteUren: regulier.filter((r) => r.type === 'arbeid' || r.type === 'onderaanneming').filter((r) => r.eenheid === 'uur').reduce((s, r) => s + r.aantal, 0),
  }
}

/** Nog te factureren bedrag (excl. btw) */
function berekenTeFactureren(o: Opdracht, werkelijkVerkoop: number, openMeerwerk: number, facturen: Factuur[]): number {
  // Ook conceptfacturen tellen mee: dat bedrag is al 'geclaimd'
  const gefactureerdExMeerwerk = facturen
    .flatMap((f) => f.regels)
    .filter((r) => r.bron?.type !== 'meerwerk')
    .reduce((s, r) => s + r.bedrag, 0)
  if (o.status === 'offerte') return 0
  if (o.contractvorm === 'aanneemsom') {
    const som = o.aanneemsom ?? 0
    const recht = (som * o.voortgang) / 100
    return Math.max(0, recht - gefactureerdExMeerwerk) + openMeerwerk
  }
  return Math.max(0, werkelijkVerkoop - gefactureerdExMeerwerk) + openMeerwerk
}

// ── Afwijkingen in uren ──
export type AfwijkingType = 'geen_checkout' | 'lange_dag' | 'buiten_locatie'
export interface Afwijking {
  type: AfwijkingType
  tekst: string
}

export const AFSTAND_GRENS_M = 250
export const LANGE_DAG_UREN = 10

export function afwijkingen(u: Urenregel, o: Opdracht | undefined, vandaag: string): Afwijking[] {
  const out: Afwijking[] = []
  if (!u.eind && u.datum < vandaag) out.push({ type: 'geen_checkout', tekst: 'Geen check-out' })
  if (u.eind && urenVanRegel(u) > LANGE_DAG_UREN) out.push({ type: 'lange_dag', tekst: `> ${LANGE_DAG_UREN} uur` })
  if (u.checkIn && o) {
    const m = afstandMeters(u.checkIn, o.locatie)
    if (m > AFSTAND_GRENS_M) out.push({ type: 'buiten_locatie', tekst: `Check-in ${m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : m + ' m'} van locatie` })
  }
  return out
}

// ── Labels ──
export const OPDRACHT_STATUS: Record<Opdracht['status'], { label: string; kleur: string }> = {
  offerte: { label: 'Offerte', kleur: 'bg-bg-2 text-ink-2' },
  gepland: { label: 'Gepland', kleur: 'bg-blue-50 text-blue-700' },
  in_uitvoering: { label: 'In uitvoering', kleur: 'bg-accent-soft text-accent' },
  opgeleverd: { label: 'Opgeleverd', kleur: 'bg-green-50 text-good' },
  gefactureerd: { label: 'Gefactureerd', kleur: 'bg-ink text-white' },
}

export const WERKBON_STATUS: Record<string, { label: string; kleur: string }> = {
  open: { label: 'Open', kleur: 'bg-bg-2 text-ink-2' },
  onderweg: { label: 'Onderweg', kleur: 'bg-blue-50 text-blue-700' },
  in_uitvoering: { label: 'In uitvoering', kleur: 'bg-accent-soft text-accent' },
  gereed: { label: 'Gereed', kleur: 'bg-amber-50 text-warn' },
  goedgekeurd: { label: 'Goedgekeurd', kleur: 'bg-green-50 text-good' },
}

export const MEERWERK_STATUS: Record<string, { label: string; kleur: string }> = {
  gemeld: { label: 'Gemeld', kleur: 'bg-bg-2 text-ink-2' },
  ter_akkoord: { label: 'Ter akkoord bij klant', kleur: 'bg-amber-50 text-warn' },
  akkoord: { label: 'Akkoord', kleur: 'bg-green-50 text-good' },
  afgewezen: { label: 'Afgewezen', kleur: 'bg-red-50 text-bad' },
}

export const FACTUUR_STATUS: Record<string, { label: string; kleur: string }> = {
  concept: { label: 'Concept', kleur: 'bg-bg-2 text-ink-2' },
  verzonden: { label: 'Verzonden', kleur: 'bg-blue-50 text-blue-700' },
  betaald: { label: 'Betaald', kleur: 'bg-green-50 text-good' },
}

export const ERP_STATUS: Record<string, { label: string; kleur: string }> = {
  niet_gesynchroniseerd: { label: 'Niet gesynchroniseerd', kleur: 'bg-bg-2 text-ink-3' },
  gesynchroniseerd: { label: 'Gesynchroniseerd', kleur: 'bg-green-50 text-good' },
  fout: { label: 'Fout', kleur: 'bg-red-50 text-bad' },
}

export const FACTUUR_TYPE: Record<string, string> = {
  termijn: 'Termijnfactuur',
  eindafrekening: 'Eindafrekening',
  regie: 'Regiefactuur',
  meerwerk: 'Meerwerkfactuur',
}

export const UURSOORT_LABEL: Record<Uursoort, string> = {
  normaal: 'Normaal',
  overwerk125: 'Overwerk 125%',
  overwerk150: 'Overwerk 150%',
  reistijd: 'Reistijd',
}

export const FOTO_CATEGORIE: Record<string, string> = { voor: 'Voor', tijdens: 'Tijdens', na: 'Na', schade: 'Schade', meerwerk: 'Meerwerk' }

export const KLANT_SOORT: Record<string, string> = {
  woningcorporatie: 'Woningcorporatie',
  projectontwikkelaar: 'Projectontwikkelaar',
  vve: 'VvE',
  particulier: 'Particulier',
  overig: 'Overig',
}

export const ERP_NAAM: Record<string, string> = {
  exact: 'Exact Online',
  afas: 'AFAS Profit',
  twinfield: 'Twinfield',
  snelstart: 'SnelStart',
  generiek: 'Generiek (UBL/CSV)',
}
