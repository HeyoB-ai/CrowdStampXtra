import { MockErpAdapter } from './mockBasis'

/** Exact Online – REST API (OAuth2). Mock voor de demo. */
export const exactAdapter = new MockErpAdapter({
  pakket: 'exact',
  naam: 'Exact Online',
  administratie: 'Van der Meulen Afbouw B.V. (1234567)',
  refPrefix: 'EOL-VF-',
  fouten: [
    'Debiteurnummer {deb} onbekend in administratie – controleer de relatiekaart in Exact Online.',
    'Grootboekrekening {gb} is geblokkeerd voor handmatige boekingen.',
    'Btw-code "VERLEGD" ontbreekt in de administratie.',
    'Access token verlopen (401) – opnieuw autoriseren.',
  ],
})
