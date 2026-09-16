import { MockErpAdapter } from './mockBasis'

/** SnelStart – B2B API (koppelsleutel). Mock voor de demo. */
export const snelstartAdapter = new MockErpAdapter({
  pakket: 'snelstart',
  naam: 'SnelStart',
  administratie: 'Van der Meulen Afbouw B.V.',
  refPrefix: 'SNS-',
  vertragingMs: [600, 1300],
  fouten: [
    'Relatie met relatiecode {deb} bestaat niet.',
    'Verkoopfactuur kan niet worden geboekt: grootboek {gb} is geen omzetrekening.',
  ],
})
