import { MockErpAdapter } from './mockBasis'

/**
 * Generiek (UBL/CSV) – geen API, maar bestandsexport. Deze "adapter" is
 * altijd verbonden; pushFactuur levert een UBL-bestand op i.p.v. een API-call.
 */
export const generiekAdapter = new MockErpAdapter({
  pakket: 'generiek',
  naam: 'Generiek (UBL/CSV)',
  administratie: 'UBL 2.1 / CSV-export',
  refPrefix: 'UBL-',
  vertragingMs: [200, 400],
  foutKans: 0,
})
