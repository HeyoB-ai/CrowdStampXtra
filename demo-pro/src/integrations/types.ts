import type { Artikel, ErpPakket, Factuur, Klant, KoppelingInstellingen, Opdracht, Urenregel } from '../types'

/**
 * Adapter-interface voor boekhoud-/ERP-koppelingen.
 *
 * Elke koppeling (Exact Online, AFAS Profit, Twinfield, SnelStart, generiek)
 * implementeert dezelfde methodes. De UI en de synchronisatielaag praten alleen
 * met deze interface; het pakket-specifieke werk (OAuth, REST/SOAP, veldmapping)
 * zit in de adapter. In de demo zijn alle adapters mocks met vertraging en
 * af en toe een realistische foutmelding.
 */
export interface ErpResultaat<T = void> {
  ok: boolean
  /** referentie in het externe pakket (bijv. factuurnummer/GUID) */
  referentie?: string
  melding: string
  data?: T
}

export interface ErpVerbinding {
  pakket: ErpPakket
  administratie: string
  instellingen: KoppelingInstellingen
}

export interface BetaalstatusUpdate {
  factuurNummer: string
  betaald: boolean
  betaaldOp?: string
  bedrag?: number
}

export interface ErpAdapter {
  readonly pakket: ErpPakket
  readonly naam: string
  /** OAuth/API-key flow – in de demo een gesimuleerde popup-flow */
  verbind(): Promise<ErpResultaat<{ administratie: string }>>
  ontkoppel(): Promise<void>

  /** Klanten (debiteuren) ophalen/matchen op debiteurnummer */
  syncKlanten(klanten: Klant[], v: ErpVerbinding): Promise<ErpResultaat<{ aantal: number; nieuw: number }>>
  /** Artikelen ophalen/bijwerken */
  syncArtikelen(artikelen: Artikel[], v: ErpVerbinding): Promise<ErpResultaat<{ aantal: number }>>
  /** Verkoopfactuur aanmaken in het pakket */
  pushFactuur(factuur: Factuur, opdracht: Opdracht, klant: Klant, v: ErpVerbinding): Promise<ErpResultaat>
  /** Goedgekeurde uren boeken op kostenplaats (projectadministratie) */
  pushUren(uren: Urenregel[], v: ErpVerbinding): Promise<ErpResultaat<{ aantal: number; totaalUren: number }>>
  /** Betaalstatus van openstaande facturen ophalen */
  haalBetaalstatus(facturen: Factuur[], v: ErpVerbinding): Promise<ErpResultaat<BetaalstatusUpdate[]>>
}
