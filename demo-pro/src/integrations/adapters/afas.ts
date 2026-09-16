import { MockErpAdapter } from './mockBasis'

/** AFAS Profit – GetConnector/UpdateConnector (app-token). Mock voor de demo. */
export const afasAdapter = new MockErpAdapter({
  pakket: 'afas',
  naam: 'AFAS Profit',
  administratie: 'Omgeving 12345 · Van der Meulen Afbouw',
  refPrefix: 'AFAS-FI-',
  vertragingMs: [900, 2000],
  fouten: [
    'UpdateConnector FiEntries: veld "Verkooprelatie" verwijst naar onbekende debiteur {deb}.',
    'Projectfase ontbreekt voor kostenplaats – vul de projectfase in AFAS aan.',
    'App-token heeft geen rechten op de UpdateConnector FiEntries.',
  ],
})
