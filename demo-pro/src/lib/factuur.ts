import type { DataStore } from '../data/store'
import { nieuwId } from '../data/store'
import type { Factuur, FactuurRegel, FactuurType, ID, Opdracht } from '../types'
import { berekenNacalculatie, UURSOORT_LABEL, urenVanRegel, verkoopVanUren } from './calculatie'
import { dagenVooruit, getal, vandaag, weekNummer } from './format'

const r2 = (n: number) => Math.round(n * 100) / 100

export interface FactuurVoorstel {
  type: FactuurType
  omschrijving: string
  regels: FactuurRegel[]
  toelichting: string
}

/**
 * Bouwt een factuurvoorstel voor een opdracht:
 * - termijn: percentage van de aanneemsom op basis van voortgang, minus eerder gefactureerd
 * - eindafrekening: restant van de aanneemsom
 * - regie: goedgekeurde, nog niet gefactureerde uren + materiaal
 * - meerwerk: akkoord gegeven, nog niet gefactureerde meerwerkposten
 */
export function maakFactuurVoorstel(store: DataStore, opdrachtId: ID, type: FactuurType, opties?: { termijnPct?: number; van?: string; tot?: string }): FactuurVoorstel {
  const o = store.getOpdracht(opdrachtId)!
  const btw = o.btwPercentage
  const facturen = store.getFacturen({ opdrachtId })
  const regels: FactuurRegel[] = []
  let omschrijving = ''
  let toelichting = ''

  if (type === 'termijn' || type === 'eindafrekening') {
    const som = o.aanneemsom ?? 0
    const eerder = facturen.flatMap((f) => f.regels).filter((r) => r.bron?.type === 'termijn').reduce((s, r) => s + r.bedrag, 0)
    const eerderPct = som ? Math.round((eerder / som) * 100) : 0
    const nr = facturen.filter((f) => f.type === 'termijn').length + 1
    if (type === 'termijn') {
      const pct = opties?.termijnPct ?? Math.max(0, o.voortgang - eerderPct)
      const bedrag = r2((som * pct) / 100)
      omschrijving = `${nr}e termijn ${o.omschrijving}`
      regels.push(regel(`${o.omschrijving} – ${nr}e termijn ${pct}% bij ${o.voortgang}% voortgang`, 1, 'termijn', bedrag, btw, { type: 'termijn', ids: [] }))
      toelichting = `Aanneemsom ${euroTekst(som)}; eerder gefactureerd ${eerderPct}% (${euroTekst(eerder)}). Voortgang ${o.voortgang}% → nu ${pct}%.`
    } else {
      const rest = r2(som - eerder)
      omschrijving = `Eindafrekening ${o.omschrijving}`
      regels.push(regel(`${o.omschrijving} – eindafrekening (restant aanneemsom, ${100 - eerderPct}%)`, 1, 'post', rest, btw, { type: 'termijn', ids: [] }))
      toelichting = `Aanneemsom ${euroTekst(som)} minus ${euroTekst(eerder)} aan termijnen.`
    }
    // Akkoord meerwerk meenemen
    regels.push(...meerwerkRegels(store, o, btw))
  }

  if (type === 'regie') {
    const alGefactureerd = new Set(facturen.flatMap((f) => f.regels).filter((r) => r.bron?.type === 'uren' || r.bron?.type === 'materiaal').flatMap((r) => r.bron!.ids))
    const uren = store.getUren({ opdrachtId }).filter((u) => u.goedgekeurd && u.eind && !alGefactureerd.has(u.id)).filter((u) => (!opties?.van || u.datum >= opties.van) && (!opties?.tot || u.datum <= opties.tot))
    const mws = store.getMedewerkers()
    // groeperen per medewerker + uursoort
    const groepen = new Map<string, { naam: string; tarief: number; uren: number; ids: ID[]; soort: string }>()
    for (const u of uren) {
      const mw = mws.find((m) => m.id === u.medewerkerId)
      if (!mw) continue
      const key = `${mw.id}_${u.uursoort}`
      const g = groepen.get(key) ?? { naam: mw.naam, tarief: verkoopVanUren({ ...u, start: '00:00', eind: '01:00', pauzeMinuten: 0 }, mw), uren: 0, ids: [], soort: UURSOORT_LABEL[u.uursoort] }
      g.uren += urenVanRegel(u)
      g.ids.push(u.id)
      groepen.set(key, g)
    }
    const weken = [...new Set(uren.map((u) => weekNummer(u.datum)))].sort((a, b) => a - b)
    for (const g of groepen.values()) {
      regels.push(regel(`Arbeid ${g.naam}${g.soort !== 'Normaal' ? ` (${g.soort.toLowerCase()})` : ''}`, r2(g.uren), 'uur', g.tarief, btw, { type: 'uren', ids: g.ids }))
    }
    const materiaal = store.getMateriaal({ opdrachtId }).filter((m) => !alGefactureerd.has(m.id)).filter((m) => (!opties?.van || m.datum >= opties.van) && (!opties?.tot || m.datum <= opties.tot))
    if (materiaal.length) {
      const artikelen = store.getArtikelen()
      // materiaal met 9% apart (bijv. schilderwerk)
      const per = new Map<number, typeof materiaal>()
      for (const m of materiaal) {
        const a = artikelen.find((x) => x.id === m.artikelId)
        const pct = o.btwPercentage === 9 ? 9 : (a?.btwPercentage ?? 21)
        per.set(pct, [...(per.get(pct) ?? []), m])
      }
      for (const [pct, ms] of per) {
        regels.push(regel(`Materiaal volgens werkbonnen (${ms.length} regels)`, 1, 'post', r2(ms.reduce((s, m) => s + m.aantal * m.verkoopprijs, 0)), pct, { type: 'materiaal', ids: ms.map((m) => m.id) }))
      }
    }
    regels.push(...meerwerkRegels(store, o, btw))
    omschrijving = `Regiefactuur ${o.omschrijving}${weken.length ? ` – week ${weken[0]}${weken.length > 1 ? `–${weken.at(-1)}` : ''}` : ''}`
    toelichting = uren.length ? `${uren.length} goedgekeurde urenregels (${getal(uren.reduce((s, u) => s + urenVanRegel(u), 0), 1)} uur) en ${materiaal.length} materiaalregels die nog niet gefactureerd zijn.` : 'Geen goedgekeurde, ongefactureerde uren in deze periode.'
  }

  if (type === 'meerwerk') {
    regels.push(...meerwerkRegels(store, o, btw))
    omschrijving = `Meerwerk ${o.omschrijving}`
    toelichting = regels.length ? `${regels.length} akkoord gegeven meerwerkpost(en) die nog niet gefactureerd zijn.` : 'Geen akkoord meerwerk dat nog gefactureerd moet worden.'
  }

  return { type, omschrijving, regels, toelichting }
}

function meerwerkRegels(store: DataStore, o: Opdracht, btw: number): FactuurRegel[] {
  return store
    .getMeerwerk({ opdrachtId: o.id })
    .filter((m) => m.status === 'akkoord' && !m.gefactureerd)
    .map((m) => regel(`Meerwerk ${m.nummer}: ${m.omschrijving} (akkoord ${m.akkoordDoor ?? ''})`, 1, 'post', m.bedrag, btw, { type: 'meerwerk', ids: [m.id] }))
}

function regel(omschrijving: string, aantal: number, eenheid: string, prijs: number, btwPercentage: number, bron: FactuurRegel['bron']): FactuurRegel {
  return { id: nieuwId('fr'), omschrijving, aantal, eenheid, prijs, btwPercentage, bedrag: r2(aantal * prijs), bron }
}

export function totalen(regels: FactuurRegel[], btwVerlegd: boolean) {
  const subtotaal = r2(regels.reduce((s, r) => s + r.bedrag, 0))
  const perBtw = new Map<number, { grondslag: number; btw: number }>()
  for (const r of regels) {
    const g = perBtw.get(r.btwPercentage) ?? { grondslag: 0, btw: 0 }
    g.grondslag += r.bedrag
    g.btw += btwVerlegd ? 0 : (r.bedrag * r.btwPercentage) / 100
    perBtw.set(r.btwPercentage, g)
  }
  const btw = r2([...perBtw.values()].reduce((s, g) => s + g.btw, 0))
  return { subtotaal, btw, totaal: r2(subtotaal + btw), perBtw }
}

export function maakFactuur(store: DataStore, opdrachtId: ID, voorstel: FactuurVoorstel): Factuur {
  const o = store.getOpdracht(opdrachtId)!
  const t = totalen(voorstel.regels, o.btwVerlegd)
  return store.createFactuur({
    opdrachtId,
    klantId: o.klantId,
    type: voorstel.type,
    datum: vandaag(),
    vervaldatum: dagenVooruit(30),
    regels: voorstel.regels,
    subtotaal: t.subtotaal,
    btw: t.btw,
    totaal: t.totaal,
    btwVerlegd: o.btwVerlegd,
    status: 'concept',
    erpStatus: 'niet_gesynchroniseerd',
    omschrijving: voorstel.omschrijving,
  })
}

/** Automatische opdrachtstatus na facturatie */
export function werkOpdrachtStatusBij(store: DataStore, opdrachtId: ID) {
  const o = store.getOpdracht(opdrachtId)
  if (!o) return
  const nc = berekenNacalculatie(store, opdrachtId)!
  const facturen = store.getFacturen({ opdrachtId })
  if (o.status === 'opgeleverd' && nc.teFactureren < 1 && facturen.length && facturen.every((f) => f.status === 'betaald')) store.updateOpdracht(o.id, { status: 'gefactureerd' })
}

function euroTekst(n: number) {
  return '€ ' + new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2 }).format(n)
}
