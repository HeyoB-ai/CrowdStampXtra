import { MockErpAdapter } from './mockBasis'

/** Twinfield – SOAP/XML (OAuth2 via Wolters Kluwer). Mock voor de demo. */
export const twinfieldAdapter = new MockErpAdapter({
  pakket: 'twinfield',
  naam: 'Twinfield',
  administratie: 'Office VDM001 · Van der Meulen Afbouw',
  refPrefix: 'TWF-VRK-',
  fouten: [
    'Dimensie type DEB: code {deb} niet gevonden.',
    'Periode is afgesloten – boek in een open periode.',
    'Btw-code VH21 is niet gekoppeld aan grootboek {gb}.',
  ],
})
