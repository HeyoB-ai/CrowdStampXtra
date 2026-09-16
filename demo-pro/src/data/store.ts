import type {
  Artikel,
  CalculatieRegel,
  DemoState,
  ErpPakket,
  ErpSyncStatus,
  Factuur,
  FactuurStatus,
  Foto,
  GpsPunt,
  ID,
  Klant,
  Koppeling,
  Materiaalregel,
  Medewerker,
  Meerwerk,
  Opdracht,
  SyncLogRegel,
  TijdlijnItem,
  Urenregel,
  Werkbon,
  WerkbonStatus,
} from '../types'
import { maakSeed, SEED_VERSIE } from './seed'
import { nuTijd, vandaag } from '../lib/format'

/**
 * Datalaag van de demo.
 *
 * `DataStore` is de interface waar de UI tegen praat. De huidige implementatie
 * (`LocalStore`) houdt alles in het geheugen en spiegelt naar localStorage.
 * Een Supabase-implementatie vervangt alleen deze klasse: dezelfde methodes,
 * maar dan met `supabase.from('werkbonnen').insert(...)` etc. Zie README.
 *
 * Alle methodes zijn synchroon voor eenvoud in de demo; in de Supabase-variant
 * worden ze `async` en gebruikt de UI React Query of SWR.
 */
export interface DataStore {
  getState(): DemoState
  subscribe(listener: () => void): () => void
  resetDemo(): void

  // Stamgegevens
  getKlanten(): Klant[]
  getKlant(id: ID): Klant | undefined
  saveKlant(k: Klant): void
  getMedewerkers(): Medewerker[]
  getMedewerker(id: ID): Medewerker | undefined
  saveMedewerker(m: Medewerker): void
  getArtikelen(): Artikel[]
  saveArtikel(a: Artikel): void
  deleteArtikel(id: ID): void

  // Opdrachten
  getOpdrachten(): Opdracht[]
  getOpdracht(id: ID): Opdracht | undefined
  createOpdracht(o: Omit<Opdracht, 'id' | 'nummer' | 'aangemaaktOp'>): Opdracht
  updateOpdracht(id: ID, patch: Partial<Opdracht>): void
  saveCalculatieRegel(opdrachtId: ID, regel: CalculatieRegel): void
  deleteCalculatieRegel(opdrachtId: ID, regelId: ID): void

  // Werkbonnen
  getWerkbonnen(filter?: { opdrachtId?: ID; medewerkerId?: ID; datum?: string }): Werkbon[]
  getWerkbon(id: ID): Werkbon | undefined
  createWerkbon(w: Omit<Werkbon, 'id' | 'nummer'>): Werkbon
  updateWerkbon(id: ID, patch: Partial<Werkbon>): void
  setWerkbonStatus(id: ID, status: WerkbonStatus, door?: string): void
  toggleChecklist(werkbonId: ID, itemId: ID): void
  deleteWerkbon(id: ID): void

  // Uren
  getUren(filter?: { opdrachtId?: ID; medewerkerId?: ID; werkbonId?: ID; van?: string; tot?: string }): Urenregel[]
  checkIn(werkbonId: ID, medewerkerId: ID, gps: GpsPunt): Urenregel
  checkOut(urenregelId: ID, gps: GpsPunt, pauzeMinuten: number): void
  saveUrenregel(u: Urenregel): void
  keurUrenGoed(ids: ID[], goedgekeurd?: boolean): void
  deleteUrenregel(id: ID): void

  // Materiaal & foto's
  getMateriaal(filter?: { opdrachtId?: ID; werkbonId?: ID }): Materiaalregel[]
  addMateriaal(m: Omit<Materiaalregel, 'id'>): Materiaalregel
  deleteMateriaal(id: ID): void
  getFotos(filter?: { opdrachtId?: ID; werkbonId?: ID }): Foto[]
  addFoto(f: Omit<Foto, 'id'>): Foto
  deleteFoto(id: ID): void

  // Meerwerk
  getMeerwerk(filter?: { opdrachtId?: ID; werkbonId?: ID }): Meerwerk[]
  getMeerwerkItem(id: ID): Meerwerk | undefined
  createMeerwerk(m: Omit<Meerwerk, 'id' | 'nummer' | 'bedrag' | 'gefactureerd'>): Meerwerk
  updateMeerwerk(id: ID, patch: Partial<Meerwerk>): void
  stuurMeerwerkTerAkkoord(id: ID): void
  akkoordMeerwerk(id: ID, naam: string, handtekening: string): void
  wijsMeerwerkAf(id: ID, reden: string): void

  // Facturatie
  getFacturen(filter?: { opdrachtId?: ID }): Factuur[]
  getFactuur(id: ID): Factuur | undefined
  createFactuur(f: Omit<Factuur, 'id' | 'nummer'>): Factuur
  updateFactuur(id: ID, patch: Partial<Factuur>): void
  setFactuurStatus(id: ID, status: FactuurStatus): void
  setErpStatus(id: ID, status: ErpSyncStatus, referentie?: string, pakket?: ErpPakket, melding?: string): void
  deleteFactuur(id: ID): void

  // Integraties
  getKoppelingen(): Koppeling[]
  getKoppeling(pakket: ErpPakket): Koppeling
  updateKoppeling(pakket: ErpPakket, patch: Partial<Koppeling>): void
  getSyncLog(): SyncLogRegel[]
  addSyncLog(r: Omit<SyncLogRegel, 'id' | 'tijdstip'>): SyncLogRegel
  updateSyncLog(id: ID, patch: Partial<SyncLogRegel>): void

  // Tijdlijn
  getTijdlijn(opdrachtId: ID): TijdlijnItem[]
  addTijdlijn(item: Omit<TijdlijnItem, 'id' | 'tijdstip'>): void

  volgendNummer(type: 'opdracht' | 'werkbon' | 'factuur' | 'meerwerk'): string
}

const STORAGE_KEY = `crowdstamp-pro-demo-v${SEED_VERSIE}`

let idTeller = Date.now() % 100000
export const nieuwId = (p: string) => `${p}_${(idTeller++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

export class LocalStore implements DataStore {
  private state: DemoState
  private listeners = new Set<() => void>()

  constructor() {
    this.state = this.laad()
  }

  // ── infrastructuur ──
  private laad(): DemoState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as DemoState
        if (parsed.versie === SEED_VERSIE && parsed.opdrachten?.length) return parsed
      }
    } catch {
      /* ongeldige opslag → seed */
    }
    // Oude versies opruimen
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('crowdstamp-pro-demo-v') && k !== STORAGE_KEY)
        .forEach((k) => localStorage.removeItem(k))
    } catch {
      /* negeren */
    }
    return structuredClone(maakSeed())
  }

  private bewaar() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    } catch {
      // Opslag vol (bijv. veel camerafoto's): bewaar zonder camerafoto-data.
      try {
        const licht: DemoState = {
          ...this.state,
          fotos: this.state.fotos.map((f) => (f.dataUrl.startsWith('data:image/jpeg') ? { ...f, dataUrl: '' } : f)),
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(licht))
      } catch {
        /* dan alleen in geheugen */
      }
    }
  }

  private commit(fn: (s: DemoState) => void) {
    const next = { ...this.state }
    fn(next)
    this.state = next
    this.bewaar()
    this.listeners.forEach((l) => l())
  }

  getState() {
    return this.state
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  resetDemo() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* negeren */
    }
    this.state = structuredClone(maakSeed())
    this.bewaar()
    this.listeners.forEach((l) => l())
  }

  volgendNummer(type: 'opdracht' | 'werkbon' | 'factuur' | 'meerwerk'): string {
    const n = (this.state.tellers[type] ?? 0) + 1
    this.commit((s) => {
      s.tellers = { ...s.tellers, [type]: n }
    })
    const jaar = new Date().getFullYear()
    switch (type) {
      case 'opdracht':
        return `OPD-${jaar}-${String(n).padStart(3, '0')}`
      case 'werkbon':
        return `WB-${String(n).padStart(4, '0')}`
      case 'factuur':
        return `F-${jaar}-${String(n).padStart(3, '0')}`
      case 'meerwerk':
        return `MW-${String(n).padStart(3, '0')}`
    }
  }

  // ── stamgegevens ──
  getKlanten() {
    return this.state.klanten
  }
  getKlant(id: ID) {
    return this.state.klanten.find((k) => k.id === id)
  }
  saveKlant(k: Klant) {
    this.commit((s) => {
      s.klanten = s.klanten.some((x) => x.id === k.id) ? s.klanten.map((x) => (x.id === k.id ? k : x)) : [...s.klanten, k]
    })
  }
  getMedewerkers() {
    return this.state.medewerkers
  }
  getMedewerker(id: ID) {
    return this.state.medewerkers.find((m) => m.id === id)
  }
  saveMedewerker(m: Medewerker) {
    this.commit((s) => {
      s.medewerkers = s.medewerkers.some((x) => x.id === m.id) ? s.medewerkers.map((x) => (x.id === m.id ? m : x)) : [...s.medewerkers, m]
    })
  }
  getArtikelen() {
    return this.state.artikelen
  }
  saveArtikel(a: Artikel) {
    this.commit((s) => {
      s.artikelen = s.artikelen.some((x) => x.id === a.id) ? s.artikelen.map((x) => (x.id === a.id ? a : x)) : [...s.artikelen, a]
    })
  }
  deleteArtikel(id: ID) {
    this.commit((s) => {
      s.artikelen = s.artikelen.filter((a) => a.id !== id)
    })
  }

  // ── opdrachten ──
  getOpdrachten() {
    return this.state.opdrachten
  }
  getOpdracht(id: ID) {
    return this.state.opdrachten.find((o) => o.id === id)
  }
  createOpdracht(o: Omit<Opdracht, 'id' | 'nummer' | 'aangemaaktOp'>): Opdracht {
    const nummer = this.volgendNummer('opdracht')
    const nieuw: Opdracht = { ...o, id: nieuwId('o'), nummer, aangemaaktOp: new Date().toISOString() }
    this.commit((s) => {
      s.opdrachten = [...s.opdrachten, nieuw]
    })
    this.addTijdlijn({ opdrachtId: nieuw.id, type: 'opdracht', tekst: `Opdracht ${nummer} aangemaakt (${o.contractvorm})`, door: 'Projectleider' })
    return nieuw
  }
  updateOpdracht(id: ID, patch: Partial<Opdracht>) {
    this.commit((s) => {
      s.opdrachten = s.opdrachten.map((o) => (o.id === id ? { ...o, ...patch } : o))
    })
  }
  saveCalculatieRegel(opdrachtId: ID, regel: CalculatieRegel) {
    this.commit((s) => {
      s.opdrachten = s.opdrachten.map((o) => {
        if (o.id !== opdrachtId) return o
        const bestaat = o.voorcalculatie.some((r) => r.id === regel.id)
        return { ...o, voorcalculatie: bestaat ? o.voorcalculatie.map((r) => (r.id === regel.id ? regel : r)) : [...o.voorcalculatie, regel] }
      })
    })
  }
  deleteCalculatieRegel(opdrachtId: ID, regelId: ID) {
    this.commit((s) => {
      s.opdrachten = s.opdrachten.map((o) => (o.id === opdrachtId ? { ...o, voorcalculatie: o.voorcalculatie.filter((r) => r.id !== regelId) } : o))
    })
  }

  // ── werkbonnen ──
  getWerkbonnen(filter?: { opdrachtId?: ID; medewerkerId?: ID; datum?: string }) {
    let w = this.state.werkbonnen
    if (filter?.opdrachtId) w = w.filter((x) => x.opdrachtId === filter.opdrachtId)
    if (filter?.medewerkerId) w = w.filter((x) => x.toegewezenAan.includes(filter.medewerkerId!))
    if (filter?.datum) w = w.filter((x) => x.datum === filter.datum)
    return w
  }
  getWerkbon(id: ID) {
    return this.state.werkbonnen.find((w) => w.id === id)
  }
  createWerkbon(w: Omit<Werkbon, 'id' | 'nummer'>): Werkbon {
    const nummer = this.volgendNummer('werkbon')
    const nieuw: Werkbon = { ...w, id: nieuwId('wb'), nummer }
    this.commit((s) => {
      s.werkbonnen = [...s.werkbonnen, nieuw]
    })
    this.addTijdlijn({ opdrachtId: w.opdrachtId, type: 'werkbon', tekst: `Werkbon ${nummer} aangemaakt – ${w.omschrijving}` })
    return nieuw
  }
  updateWerkbon(id: ID, patch: Partial<Werkbon>) {
    this.commit((s) => {
      s.werkbonnen = s.werkbonnen.map((w) => (w.id === id ? { ...w, ...patch } : w))
    })
  }
  setWerkbonStatus(id: ID, status: WerkbonStatus, door?: string) {
    const wb = this.getWerkbon(id)
    if (!wb) return
    this.updateWerkbon(id, { status })
    const labels: Record<WerkbonStatus, string> = { open: 'open', onderweg: 'onderweg', in_uitvoering: 'in uitvoering', gereed: 'gereed gemeld', goedgekeurd: 'goedgekeurd' }
    this.addTijdlijn({ opdrachtId: wb.opdrachtId, type: 'werkbon', tekst: `Werkbon ${wb.nummer} ${labels[status]}`, door })
    // Opdracht automatisch naar 'in uitvoering' zodra er gewerkt wordt
    const o = this.getOpdracht(wb.opdrachtId)
    if (o && o.status === 'gepland' && (status === 'in_uitvoering' || status === 'gereed')) this.updateOpdracht(o.id, { status: 'in_uitvoering' })
  }
  toggleChecklist(werkbonId: ID, itemId: ID) {
    this.commit((s) => {
      s.werkbonnen = s.werkbonnen.map((w) =>
        w.id === werkbonId ? { ...w, checklist: w.checklist.map((c) => (c.id === itemId ? { ...c, gedaan: !c.gedaan } : c)) } : w,
      )
    })
  }
  deleteWerkbon(id: ID) {
    this.commit((s) => {
      s.werkbonnen = s.werkbonnen.filter((w) => w.id !== id)
      s.uren = s.uren.filter((u) => u.werkbonId !== id)
    })
  }

  // ── uren ──
  getUren(filter?: { opdrachtId?: ID; medewerkerId?: ID; werkbonId?: ID; van?: string; tot?: string }) {
    let u = this.state.uren
    if (filter?.opdrachtId) u = u.filter((x) => x.opdrachtId === filter.opdrachtId)
    if (filter?.medewerkerId) u = u.filter((x) => x.medewerkerId === filter.medewerkerId)
    if (filter?.werkbonId) u = u.filter((x) => x.werkbonId === filter.werkbonId)
    if (filter?.van) u = u.filter((x) => x.datum >= filter.van!)
    if (filter?.tot) u = u.filter((x) => x.datum <= filter.tot!)
    return u
  }
  checkIn(werkbonId: ID, medewerkerId: ID, gps: GpsPunt): Urenregel {
    const wb = this.getWerkbon(werkbonId)!
    const reg: Urenregel = {
      id: nieuwId('ur'),
      medewerkerId,
      werkbonId,
      opdrachtId: wb.opdrachtId,
      datum: vandaag(),
      start: nuTijd(),
      pauzeMinuten: 0,
      uursoort: 'normaal',
      checkIn: gps,
      goedgekeurd: false,
    }
    this.commit((s) => {
      s.uren = [...s.uren, reg]
    })
    const mw = this.getMedewerker(medewerkerId)
    this.addTijdlijn({ opdrachtId: wb.opdrachtId, type: 'uren', tekst: `${mw?.naam ?? 'Medewerker'} ingecheckt op ${wb.nummer} (${reg.start})`, door: mw?.naam })
    if (wb.status === 'open' || wb.status === 'onderweg') this.setWerkbonStatus(werkbonId, 'in_uitvoering', mw?.naam)
    return reg
  }
  checkOut(urenregelId: ID, gps: GpsPunt, pauzeMinuten: number) {
    const reg = this.state.uren.find((u) => u.id === urenregelId)
    if (!reg) return
    const eind = nuTijd()
    this.saveUrenregel({ ...reg, eind: eind <= reg.start ? reg.start : eind, checkOut: gps, pauzeMinuten })
    const mw = this.getMedewerker(reg.medewerkerId)
    const wb = this.getWerkbon(reg.werkbonId)
    this.addTijdlijn({ opdrachtId: reg.opdrachtId, type: 'uren', tekst: `${mw?.naam ?? 'Medewerker'} uitgecheckt op ${wb?.nummer ?? ''} (${eind})`, door: mw?.naam })
  }
  saveUrenregel(u: Urenregel) {
    this.commit((s) => {
      s.uren = s.uren.some((x) => x.id === u.id) ? s.uren.map((x) => (x.id === u.id ? u : x)) : [...s.uren, u]
    })
  }
  keurUrenGoed(ids: ID[], goedgekeurd = true) {
    const set = new Set(ids)
    this.commit((s) => {
      s.uren = s.uren.map((u) => (set.has(u.id) ? { ...u, goedgekeurd } : u))
    })
  }
  deleteUrenregel(id: ID) {
    this.commit((s) => {
      s.uren = s.uren.filter((u) => u.id !== id)
    })
  }

  // ── materiaal & foto's ──
  getMateriaal(filter?: { opdrachtId?: ID; werkbonId?: ID }) {
    let m = this.state.materiaal
    if (filter?.opdrachtId) m = m.filter((x) => x.opdrachtId === filter.opdrachtId)
    if (filter?.werkbonId) m = m.filter((x) => x.werkbonId === filter.werkbonId)
    return m
  }
  addMateriaal(m: Omit<Materiaalregel, 'id'>): Materiaalregel {
    const nieuw = { ...m, id: nieuwId('mt') }
    this.commit((s) => {
      s.materiaal = [...s.materiaal, nieuw]
    })
    return nieuw
  }
  deleteMateriaal(id: ID) {
    this.commit((s) => {
      s.materiaal = s.materiaal.filter((m) => m.id !== id)
    })
  }
  getFotos(filter?: { opdrachtId?: ID; werkbonId?: ID }) {
    let f = this.state.fotos
    if (filter?.opdrachtId) f = f.filter((x) => x.opdrachtId === filter.opdrachtId)
    if (filter?.werkbonId) f = f.filter((x) => x.werkbonId === filter.werkbonId)
    return f
  }
  addFoto(f: Omit<Foto, 'id'>): Foto {
    const nieuw = { ...f, id: nieuwId('ft') }
    this.commit((s) => {
      s.fotos = [...s.fotos, nieuw]
    })
    this.addTijdlijn({ opdrachtId: f.opdrachtId, type: 'foto', tekst: `Foto toegevoegd (${f.categorie}): ${f.bijschrift || 'zonder bijschrift'}` })
    return nieuw
  }
  deleteFoto(id: ID) {
    this.commit((s) => {
      s.fotos = s.fotos.filter((f) => f.id !== id)
    })
  }

  // ── meerwerk ──
  getMeerwerk(filter?: { opdrachtId?: ID; werkbonId?: ID }) {
    let m = this.state.meerwerk
    if (filter?.opdrachtId) m = m.filter((x) => x.opdrachtId === filter.opdrachtId)
    if (filter?.werkbonId) m = m.filter((x) => x.werkbonId === filter.werkbonId)
    return m
  }
  getMeerwerkItem(id: ID) {
    return this.state.meerwerk.find((m) => m.id === id)
  }
  createMeerwerk(m: Omit<Meerwerk, 'id' | 'nummer' | 'bedrag' | 'gefactureerd'>): Meerwerk {
    const nummer = this.volgendNummer('meerwerk')
    const nieuw: Meerwerk = { ...m, id: nieuwId('mw'), nummer, bedrag: Math.round((m.geschatteUren * m.uurtarief + m.materiaalBedrag) * 100) / 100, gefactureerd: false }
    this.commit((s) => {
      s.meerwerk = [...s.meerwerk, nieuw]
    })
    const mw = this.getMedewerker(m.gemeldDoor)
    this.addTijdlijn({ opdrachtId: m.opdrachtId, type: 'meerwerk', tekst: `Meerwerk ${nummer} gemeld: ${m.omschrijving}`, door: mw?.naam })
    return nieuw
  }
  updateMeerwerk(id: ID, patch: Partial<Meerwerk>) {
    this.commit((s) => {
      s.meerwerk = s.meerwerk.map((m) => {
        if (m.id !== id) return m
        const n = { ...m, ...patch }
        n.bedrag = Math.round((n.geschatteUren * n.uurtarief + n.materiaalBedrag) * 100) / 100
        return n
      })
    })
  }
  stuurMeerwerkTerAkkoord(id: ID) {
    const m = this.getMeerwerkItem(id)
    if (!m) return
    this.updateMeerwerk(id, { status: 'ter_akkoord' })
    this.addTijdlijn({ opdrachtId: m.opdrachtId, type: 'meerwerk', tekst: `Meerwerk ${m.nummer} ter akkoord gestuurd naar klant`, door: 'Projectleider' })
  }
  akkoordMeerwerk(id: ID, naam: string, handtekening: string) {
    const m = this.getMeerwerkItem(id)
    if (!m) return
    const nu = new Date().toISOString()
    this.updateMeerwerk(id, { status: 'akkoord', akkoordDoor: naam, akkoordOp: nu, akkoordHandtekening: handtekening })
    // Akkoord meerwerk wordt automatisch een regel in de calculatie
    this.saveCalculatieRegel(m.opdrachtId, {
      id: nieuwId('cr'),
      type: 'arbeid',
      omschrijving: `Meerwerk ${m.nummer}: ${m.omschrijving}`,
      aantal: 1,
      eenheid: 'post',
      kostprijs: Math.round(m.bedrag * 0.72),
      verkoopprijs: m.bedrag,
      opslagPercentage: 38.9,
      uitMeerwerk: m.id,
    })
    this.addTijdlijn({ opdrachtId: m.opdrachtId, type: 'meerwerk', tekst: `Meerwerk ${m.nummer} akkoord door ${naam} – toegevoegd aan calculatie, klaar voor facturatie` })
  }
  wijsMeerwerkAf(id: ID, reden: string) {
    const m = this.getMeerwerkItem(id)
    if (!m) return
    this.updateMeerwerk(id, { status: 'afgewezen', afgewezenReden: reden })
    this.addTijdlijn({ opdrachtId: m.opdrachtId, type: 'meerwerk', tekst: `Meerwerk ${m.nummer} afgewezen: ${reden}` })
  }

  // ── facturatie ──
  getFacturen(filter?: { opdrachtId?: ID }) {
    let f = this.state.facturen
    if (filter?.opdrachtId) f = f.filter((x) => x.opdrachtId === filter.opdrachtId)
    return f
  }
  getFactuur(id: ID) {
    return this.state.facturen.find((f) => f.id === id)
  }
  createFactuur(f: Omit<Factuur, 'id' | 'nummer'>): Factuur {
    const nummer = this.volgendNummer('factuur')
    const nieuw: Factuur = { ...f, id: nieuwId('fc'), nummer }
    this.commit((s) => {
      s.facturen = [...s.facturen, nieuw]
      // meerwerk markeren als gefactureerd
      const mwIds = new Set(f.regels.filter((r) => r.bron?.type === 'meerwerk').flatMap((r) => r.bron!.ids))
      if (mwIds.size) s.meerwerk = s.meerwerk.map((m) => (mwIds.has(m.id) ? { ...m, gefactureerd: true } : m))
    })
    this.addTijdlijn({ opdrachtId: f.opdrachtId, type: 'factuur', tekst: `Factuur ${nummer} (${f.type}) aangemaakt als concept – ${f.omschrijving}` })
    return nieuw
  }
  updateFactuur(id: ID, patch: Partial<Factuur>) {
    this.commit((s) => {
      s.facturen = s.facturen.map((f) => (f.id === id ? { ...f, ...patch } : f))
    })
  }
  setFactuurStatus(id: ID, status: FactuurStatus) {
    const f = this.getFactuur(id)
    if (!f) return
    const nu = new Date().toISOString()
    const patch: Partial<Factuur> = { status }
    if (status === 'verzonden') patch.verzondenOp = nu
    if (status === 'betaald') patch.betaaldOp = nu
    this.updateFactuur(id, patch)
    this.addTijdlijn({ opdrachtId: f.opdrachtId, type: 'factuur', tekst: `Factuur ${f.nummer} ${status}` })
    if (status === 'betaald') {
      // Alle facturen betaald + opgeleverd → opdracht gefactureerd
      const o = this.getOpdracht(f.opdrachtId)
      const alle = this.getFacturen({ opdrachtId: f.opdrachtId })
      if (o && o.status === 'opgeleverd' && alle.every((x) => x.id === id || x.status === 'betaald')) this.updateOpdracht(o.id, { status: 'gefactureerd' })
    }
  }
  setErpStatus(id: ID, status: ErpSyncStatus, referentie?: string, pakket?: ErpPakket, melding?: string) {
    const f = this.getFactuur(id)
    if (!f) return
    this.updateFactuur(id, { erpStatus: status, erpReferentie: referentie ?? f.erpReferentie, erpPakket: pakket ?? f.erpPakket, erpMelding: melding })
    if (status === 'gesynchroniseerd') this.addTijdlijn({ opdrachtId: f.opdrachtId, type: 'erp', tekst: `Factuur ${f.nummer} gesynchroniseerd naar ERP (${referentie ?? ''})` })
  }
  deleteFactuur(id: ID) {
    const f = this.getFactuur(id)
    this.commit((s) => {
      s.facturen = s.facturen.filter((x) => x.id !== id)
      if (f) {
        const mwIds = new Set(f.regels.filter((r) => r.bron?.type === 'meerwerk').flatMap((r) => r.bron!.ids))
        if (mwIds.size) s.meerwerk = s.meerwerk.map((m) => (mwIds.has(m.id) ? { ...m, gefactureerd: false } : m))
      }
    })
  }

  // ── integraties ──
  getKoppelingen() {
    return this.state.koppelingen
  }
  getKoppeling(pakket: ErpPakket) {
    return this.state.koppelingen.find((k) => k.pakket === pakket)!
  }
  updateKoppeling(pakket: ErpPakket, patch: Partial<Koppeling>) {
    this.commit((s) => {
      s.koppelingen = s.koppelingen.map((k) => (k.pakket === pakket ? { ...k, ...patch } : k))
    })
  }
  getSyncLog() {
    return this.state.syncLog
  }
  addSyncLog(r: Omit<SyncLogRegel, 'id' | 'tijdstip'>): SyncLogRegel {
    const nieuw: SyncLogRegel = { ...r, id: nieuwId('sl'), tijdstip: new Date().toISOString() }
    this.commit((s) => {
      s.syncLog = [...s.syncLog, nieuw]
    })
    return nieuw
  }
  updateSyncLog(id: ID, patch: Partial<SyncLogRegel>) {
    this.commit((s) => {
      s.syncLog = s.syncLog.map((r) => (r.id === id ? { ...r, ...patch } : r))
    })
  }

  // ── tijdlijn ──
  getTijdlijn(opdrachtId: ID) {
    return this.state.tijdlijn.filter((t) => t.opdrachtId === opdrachtId).sort((a, b) => b.tijdstip.localeCompare(a.tijdstip))
  }
  addTijdlijn(item: Omit<TijdlijnItem, 'id' | 'tijdstip'>) {
    const nieuw: TijdlijnItem = { ...item, id: nieuwId('tl'), tijdstip: new Date().toISOString() }
    this.commit((s) => {
      s.tijdlijn = [...s.tijdlijn, nieuw]
    })
  }
}

/** Singleton voor de demo. Bij Supabase: vervang door `new SupabaseStore(client)`. */
export const store: DataStore = new LocalStore()
