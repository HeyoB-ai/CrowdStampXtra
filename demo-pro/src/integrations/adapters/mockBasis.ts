import type { Artikel, ErpPakket, Factuur, Klant, Opdracht, Urenregel } from '../../types'
import type { BetaalstatusUpdate, ErpAdapter, ErpResultaat, ErpVerbinding } from '../types'
import { urenVanRegel } from '../../lib/calculatie'

/**
 * Gedeelde mock-basis voor alle pakketten. Simuleert netwerkvertraging en
 * geeft af en toe een realistische foutmelding terug, zodat de synclog en de
 * knop "Opnieuw proberen" iets te doen hebben.
 *
 * Een echte adapter erft NIET van deze klasse maar implementeert ErpAdapter
 * direct (zie README → "ERP-adapter echt implementeren").
 */
export interface MockOpties {
  pakket: ErpPakket
  naam: string
  administratie: string
  /** prefix voor gesimuleerde referenties, bijv. "EOL-VF-" */
  refPrefix: string
  vertragingMs?: [number, number]
  /** kans op fout (0-1) bij pushFactuur */
  foutKans?: number
  /** Pakketspecifieke foutmeldingen */
  fouten?: string[]
}

let volgnummer = 100

export class MockErpAdapter implements ErpAdapter {
  readonly pakket: ErpPakket
  readonly naam: string
  private o: Required<MockOpties>

  constructor(o: MockOpties) {
    this.pakket = o.pakket
    this.naam = o.naam
    this.o = { vertragingMs: [700, 1600], foutKans: 0.18, fouten: ['Tijdelijke fout bij het pakket (HTTP 503) – probeer het later opnieuw.'], ...o }
  }

  protected async wacht(factor = 1) {
    const [a, b] = this.o.vertragingMs
    await new Promise((r) => setTimeout(r, (a + Math.random() * (b - a)) * factor))
  }

  protected ref() {
    volgnummer++
    return `${this.o.refPrefix}${new Date().getFullYear()}${String(volgnummer).padStart(4, '0')}`
  }

  protected faalt(kans = this.o.foutKans) {
    return Math.random() < kans
  }

  protected fout(): string {
    return this.o.fouten[Math.floor(Math.random() * this.o.fouten.length)]
  }

  async verbind(): Promise<ErpResultaat<{ administratie: string }>> {
    await this.wacht(1.6)
    return { ok: true, melding: `Verbonden met ${this.naam}`, data: { administratie: this.o.administratie } }
  }

  async ontkoppel() {
    await this.wacht(0.5)
  }

  async syncKlanten(klanten: Klant[]): Promise<ErpResultaat<{ aantal: number; nieuw: number }>> {
    await this.wacht()
    const zonderNummer = klanten.filter((k) => !k.debiteurnummer).length
    return { ok: true, melding: `${klanten.length} debiteuren gematcht op debiteurnummer${zonderNummer ? `, ${zonderNummer} nieuw aangemaakt` : ''}`, data: { aantal: klanten.length, nieuw: zonderNummer } }
  }

  async syncArtikelen(artikelen: Artikel[]): Promise<ErpResultaat<{ aantal: number }>> {
    await this.wacht()
    return { ok: true, melding: `${artikelen.length} artikelen bijgewerkt (prijzen en btw-codes)`, data: { aantal: artikelen.length } }
  }

  async pushFactuur(f: Factuur, o: Opdracht, k: Klant, v: ErpVerbinding): Promise<ErpResultaat> {
    await this.wacht(1.2)
    // Realistische validatie: debiteur zonder nummer → altijd fout
    if (!k.debiteurnummer) return { ok: false, melding: `Debiteur "${k.naam}" heeft geen debiteurnummer – koppel de relatie eerst in ${this.naam}.` }
    if (f.subtotaal <= 0) return { ok: false, melding: 'Factuur zonder regels/bedrag kan niet worden geboekt.' }
    if (this.faalt()) return { ok: false, melding: this.fout().replace('{deb}', k.debiteurnummer).replace('{gb}', v.instellingen.grootboekOmzet) }
    const ref = this.ref()
    return { ok: true, referentie: ref, melding: `Verkoopfactuur aangemaakt (${ref}) in dagboek ${v.instellingen.dagboek}${v.instellingen.kostenplaatsIsOpdracht ? `, kostenplaats ${o.nummer}` : ''}${f.btwVerlegd ? ', btw verlegd' : ''}` }
  }

  async pushUren(uren: Urenregel[]): Promise<ErpResultaat<{ aantal: number; totaalUren: number }>> {
    await this.wacht()
    const tot = uren.reduce((s, u) => s + urenVanRegel(u), 0)
    if (uren.length === 0) return { ok: false, melding: 'Geen goedgekeurde, nog niet geboekte uren gevonden.' }
    if (this.faalt(0.1)) return { ok: false, melding: 'Kostenplaats onbekend in projectadministratie – controleer of het opdrachtnummer als kostenplaats bestaat.' }
    return { ok: true, melding: `${uren.length} urenregels (${tot.toFixed(1).replace('.', ',')} uur) geboekt op kostenplaatsen`, data: { aantal: uren.length, totaalUren: tot } }
  }

  async haalBetaalstatus(facturen: Factuur[]): Promise<ErpResultaat<BetaalstatusUpdate[]>> {
    await this.wacht(1.1)
    const open = facturen.filter((f) => f.status === 'verzonden')
    // In de demo: alle gesynchroniseerde, verzonden facturen komen als betaald terug
    const updates: BetaalstatusUpdate[] = open.filter((f) => f.erpStatus === 'gesynchroniseerd').map((f) => ({ factuurNummer: f.nummer, betaald: true, betaaldOp: new Date().toISOString(), bedrag: f.totaal }))
    return { ok: true, melding: updates.length ? `${updates.length} betaling(en) gematcht met bankafschrift` : 'Geen nieuwe betalingen gevonden', data: updates }
  }
}
