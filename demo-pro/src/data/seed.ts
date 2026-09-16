import type {
  Artikel,
  CalculatieRegel,
  DemoState,
  Factuur,
  FactuurRegel,
  Foto,
  FotoCategorie,
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
  Uursoort,
  UursoortDef,
  Werkbon,
  WerkbonStatus,
} from '../types'
import { fotoPlaceholder, handtekeningPlaceholder } from './placeholders'
import { dagenTerug, dagenVooruit, parseDatum, urenTussen, vandaag } from '../lib/format'

export const SEED_VERSIE = 8

/**
 * Seed-data voor de demo. Alle datums zijn relatief aan "vandaag", zodat de demo
 * nooit veroudert: de afgelopen drie weken bevatten uren, foto's en meerwerk.
 * Alle namen, bedrijven en adressen zijn fictief.
 */

// ── deterministische pseudo-random zodat de seed altijd hetzelfde is ──
let rngState = 20260916
function rnd(): number {
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff
  return rngState / 0x7fffffff
}
function tussen(min: number, max: number): number {
  return min + rnd() * (max - min)
}

let idTeller = 1000
const uid = (p: string) => `${p}_${(idTeller++).toString(36)}`

const tellers: Record<string, number> = { opdracht: 15, werkbon: 0, factuur: 56, meerwerk: 0 }

const VANDAAG = vandaag()
const isoOffset = (d: number) => (d >= 0 ? dagenVooruit(d) : dagenTerug(-d))
const tijdstip = (datumIso: string, hhmm: string) => {
  const d = parseDatum(datumIso)!
  const [h, m] = hhmm.split(':').map(Number)
  d.setHours(h, m, Math.floor(rnd() * 60), 0)
  return d.toISOString()
}
const isWerkdag = (iso: string) => {
  const d = parseDatum(iso)!.getDay()
  return d !== 0 && d !== 6
}
/** Werkdagen in een bereik van dag-offsets (t.o.v. vandaag), inclusief */
function werkdagen(vanOffset: number, totOffset: number): string[] {
  const out: string[] = []
  for (let o = vanOffset; o <= totOffset; o++) {
    const iso = isoOffset(o)
    if (isWerkdag(iso)) out.push(iso)
  }
  return out
}

// ════════════════════════════════════════════════════════════════════
// Stamgegevens
// ════════════════════════════════════════════════════════════════════

export const BEDRIJF = {
  naam: 'Van der Meulen Afbouw B.V.',
  adres: { straat: 'Polanerbaan 14', postcode: '3447 GN', plaats: 'Woerden' },
  kvk: '30245871',
  btw: 'NL812345678B01',
  iban: 'NL91 RABO 0312 4567 89',
  email: 'administratie@vdmeulen-afbouw.nl',
  telefoon: '0348 – 41 22 80',
  website: 'www.vdmeulen-afbouw.nl',
}

const klanten: Klant[] = [
  {
    id: 'k_groenwest',
    naam: 'Woningstichting GroenWest',
    kvk: '30045512',
    adres: { straat: 'Blekerijlaan 3', postcode: '3447 GR', plaats: 'Woerden' },
    contactpersoon: 'Marloes Verhoef',
    email: 'm.verhoef@groenwest-wonen.nl',
    telefoon: '088 – 012 34 56',
    debiteurnummer: '10234',
    soort: 'woningcorporatie',
  },
  {
    id: 'k_rijnstreek',
    naam: 'Rijnstreek Ontwikkeling B.V.',
    kvk: '30187744',
    adres: { straat: 'Europalaan 400', postcode: '3526 KS', plaats: 'Utrecht' },
    contactpersoon: 'Daan Schouten',
    email: 'd.schouten@rijnstreek-ontwikkeling.nl',
    telefoon: '030 – 288 19 00',
    debiteurnummer: '10871',
    soort: 'projectontwikkelaar',
  },
  {
    id: 'k_parkzicht',
    naam: 'VvE Parkzicht Nieuwegein',
    kvk: '65221903',
    adres: { straat: 'Parkzichtlaan 2-96', postcode: '3437 AB', plaats: 'Nieuwegein' },
    contactpersoon: 'Henk Bosman (voorzitter)',
    email: 'bestuur@vveparkzicht.nl',
    telefoon: '06 – 2231 8790',
    debiteurnummer: '11020',
    soort: 'vve',
  },
  {
    id: 'k_debruin',
    naam: 'Fam. de Bruin',
    kvk: '',
    adres: { straat: 'Lupineoord 27', postcode: '3991 VD', plaats: 'Houten' },
    contactpersoon: 'Sanne de Bruin',
    email: 'sanne.debruin@gmail.com',
    telefoon: '06 – 4187 2265',
    debiteurnummer: '11305',
    soort: 'particulier',
  },
]

const medewerkers: Medewerker[] = [
  mw('m_pieter', 'Pieter van der Meulen', 'projectleider', 55, 85, 'eigen', '#0f0f0f'),
  mw('m_jeroen', 'Jeroen Bakker', 'uitvoerder', 42, 68, 'eigen', '#e8410a'),
  mw('m_kevin', 'Kevin de Jong', 'timmerman', 38, 62, 'eigen', '#2563eb'),
  mw('m_sander', 'Sander Willems', 'monteur', 36, 60, 'eigen', '#16a34a'),
  mw('m_fatima', 'Fatima el Amrani', 'stukadoor', 37, 61, 'eigen', '#d97706'),
  mw('m_ruud', 'Ruud Hendriks', 'schilder', 35, 58, 'eigen', '#7c3aed'),
  mw('m_marco', 'Marco Visser', 'tegelzetter', 45, 65, 'onderaannemer', '#0891b2', 'Visser Tegelwerken (Montfoort)'),
  mw('m_tomasz', 'Tomasz Kowalski', 'timmerman', 40, 62, 'onderaannemer', '#be185d', 'TK Bouw & Montage (IJsselstein)'),
]

function mw(
  id: ID,
  naam: string,
  rol: Medewerker['rol'],
  kost: number,
  verkoop: number,
  soort: Medewerker['soort'],
  kleur: string,
  bedrijf = BEDRIJF.naam,
): Medewerker {
  const delen = naam.split(' ')
  const initialen = (delen[0][0] + delen[delen.length - 1][0]).toUpperCase()
  const slug = naam.toLowerCase().replace(/[^a-z]+/g, '.')
  return {
    id,
    naam,
    initialen,
    rol,
    uurtariefKostprijs: kost,
    uurtariefVerkoop: verkoop,
    bedrijf,
    soort,
    telefoon: `06 – ${Math.floor(1000 + rnd() * 8999)} ${Math.floor(1000 + rnd() * 8999)}`,
    email: soort === 'eigen' ? `${slug}@vdmeulen-afbouw.nl` : `${slug}@${bedrijf.split(' ')[0].toLowerCase()}-bouw.nl`,
    kleur,
  }
}

const artikelen: Artikel[] = [
  art('a_tegel_wand', 'TG-W-3060', 'Wandtegel 30×60 mat wit', 'm²', 22, 29.5),
  art('a_tegel_vloer', 'TG-V-6060', 'Vloertegel 60×60 antraciet R10', 'm²', 27, 36),
  art('a_lijm', 'TG-LIJM-25', 'Tegellijm flex 25 kg', 'zak', 18.5, 24),
  art('a_voeg', 'TG-VOEG-5', 'Voegmiddel 5 kg', 'emmer', 14, 19),
  art('a_kit', 'KIT-SAN', 'Sanitairkit transparant', 'koker', 6.8, 9.5),
  art('a_sanitair', 'SAN-SET-A', 'Sanitairset (toilet, wastafel, doucheset)', 'set', 1180, 1450),
  art('a_kraan', 'SAN-KR-TH', 'Thermostaatkraan douche', 'stuk', 165, 215),
  art('a_leiding', 'LD-PEX-16', 'PEX-leiding 16 mm', 'm', 1.9, 2.8),
  art('a_afvoer', 'LD-PVC-40', 'PVC-afvoer 40 mm', 'm', 3.2, 4.6),
  art('a_gips', 'GP-PL-125', 'Gipsplaat 12,5 mm 260×120', 'plaat', 11.9, 16.5),
  art('a_stuc', 'ST-GIPS-25', 'Stucgips 25 kg', 'zak', 9.4, 13.5),
  art('a_primer', 'VF-PRIM-10', 'Voorstrijk/primer 10 l', 'emmer', 34, 46),
  art('a_muurverf', 'VF-MUUR-10', 'Muurverf mat wit 10 l', 'emmer', 58, 78, 9),
  art('a_lak', 'VF-LAK-25', 'Systeemlak zijdeglans 2,5 l', 'blik', 42, 58, 9),
  art('a_schuur', 'VF-SCH-P', 'Schuurpapier/ -pads assortiment', 'set', 12, 17, 9),
  art('a_hout_bl', 'HT-BL-4460', 'Vurenhout 44×60 mm', 'm', 2.4, 3.6),
  art('a_osb', 'HT-OSB-18', 'OSB-plaat 18 mm 244×122', 'plaat', 21, 29),
  art('a_isolatie', 'IS-PIR-100', 'PIR-isolatie 100 mm', 'm²', 19.5, 27),
  art('a_epdm', 'DK-EPDM', 'EPDM-dakbedekking 1,2 mm', 'm²', 14, 20),
  art('a_schroeven', 'BV-SCHR', 'Bevestigingsmateriaal (schroeven/pluggen)', 'doos', 24, 34),
  art('a_container', 'MT-CONT-6', 'Afvalcontainer 6 m³ incl. afvoer', 'stuk', 420, 480, 21, 'materieel'),
  art('a_steiger', 'MT-STG-WK', 'Rolsteiger huur per week', 'week', 95, 130, 21, 'materieel'),
  art('a_breekhamer', 'MT-BRK-DG', 'Breekhamer huur per dag', 'dag', 45, 65, 21, 'materieel'),
]

function art(
  id: ID,
  code: string,
  naam: string,
  eenheid: string,
  kost: number,
  verkoop: number,
  btw: 21 | 9 = 21,
  groep: Artikel['groep'] = 'materiaal',
): Artikel {
  return { id, code, naam, eenheid, kostprijs: kost, verkoopprijs: verkoop, btwPercentage: btw, groep }
}
const artikel = (id: ID) => artikelen.find((a) => a.id === id)!

const uursoorten: UursoortDef[] = [
  { code: 'normaal', naam: 'Normaal', factor: 1 },
  { code: 'overwerk125', naam: 'Overwerk 125%', factor: 1.25 },
  { code: 'overwerk150', naam: 'Overwerk 150%', factor: 1.5 },
  { code: 'reistijd', naam: 'Reistijd', factor: 1 },
]

// ════════════════════════════════════════════════════════════════════
// Opdrachten + voorcalculatie
// ════════════════════════════════════════════════════════════════════

function regel(
  type: CalculatieRegel['type'],
  omschrijving: string,
  aantal: number,
  eenheid: string,
  kostprijs: number,
  verkoopprijs: number,
): CalculatieRegel {
  return {
    id: uid('cr'),
    type,
    omschrijving,
    aantal,
    eenheid,
    kostprijs,
    verkoopprijs,
    opslagPercentage: kostprijs ? Math.round(((verkoopprijs - kostprijs) / kostprijs) * 1000) / 10 : 0,
  }
}

const opdrachten: Opdracht[] = [
  {
    id: 'o_004',
    nummer: 'OPD-2026-004',
    klantId: 'k_rijnstreek',
    omschrijving: 'Renovatie entreehal kantoorgebouw De Brand',
    toelichting: 'Nieuwe wand- en plafondafwerking, vloer en verlichting in de centrale entree. Uitgevoerd als onderaannemer.',
    locatie: { straat: 'De Brand 30', postcode: '3823 LK', plaats: 'Amersfoort', lat: 52.1889, lng: 5.4232 },
    status: 'gefactureerd',
    startdatum: isoOffset(-56),
    einddatum: isoOffset(-33),
    contractvorm: 'aanneemsom',
    aanneemsom: 18900,
    voorcalculatie: [
      regel('arbeid', 'Sloop bestaande afwerking', 24, 'uur', 38, 62),
      regel('arbeid', 'Wand- en plafondafwerking', 72, 'uur', 37, 61),
      regel('arbeid', 'Vloer leggen en afwerken', 32, 'uur', 38, 62),
      regel('materiaal', 'Gipsplaat, stucgips, verf', 1, 'post', 2650, 3400),
      regel('materiaal', 'Vloertegels en lijm', 48, 'm²', 34, 46),
      regel('materieel', 'Container', 2, 'stuk', 420, 480),
    ],
    btwVerlegd: true,
    btwPercentage: 21,
    documenten: [
      { id: uid('doc'), naam: 'Opdrachtbevestiging RO-2026-118.pdf', type: 'contract', datum: isoOffset(-63) },
      { id: uid('doc'), naam: 'Tekening entree v3.pdf', type: 'tekening', datum: isoOffset(-60) },
    ],
    projectleiderId: 'm_pieter',
    aangemaaktOp: tijdstip(isoOffset(-63), '10:12'),
    voortgang: 100,
  },
  {
    id: 'o_007',
    nummer: 'OPD-2026-007',
    klantId: 'k_parkzicht',
    omschrijving: 'Schilder- en stucwerk trappenhuizen A en B',
    toelichting: 'Herstel stucwerk, sauswerk wanden en plafonds, lakwerk leuningen en kozijnen. Woningen ouder dan 2 jaar: 9% btw op arbeid en materiaal.',
    locatie: { straat: 'Parkzichtlaan 2', postcode: '3437 AB', plaats: 'Nieuwegein', lat: 52.0296, lng: 5.0851 },
    status: 'opgeleverd',
    startdatum: isoOffset(-27),
    einddatum: isoOffset(-4),
    contractvorm: 'regie',
    voorcalculatie: [
      regel('arbeid', 'Stucherstel wanden', 40, 'uur', 37, 61),
      regel('arbeid', 'Sauswerk wanden en plafonds', 96, 'uur', 35, 58),
      regel('arbeid', 'Lakwerk leuningen, kozijnen', 48, 'uur', 35, 58),
      regel('materiaal', 'Muurverf, lak, primer', 1, 'post', 1480, 1990),
      regel('materiaal', 'Stucgips en afplakmateriaal', 1, 'post', 320, 430),
      regel('materieel', 'Rolsteiger', 4, 'week', 95, 130),
    ],
    btwVerlegd: false,
    btwPercentage: 9,
    documenten: [{ id: uid('doc'), naam: 'Offerte 2026-031 (akkoord).pdf', type: 'offerte', datum: isoOffset(-40) }],
    projectleiderId: 'm_pieter',
    aangemaaktOp: tijdstip(isoOffset(-40), '14:30'),
    voortgang: 100,
  },
  {
    id: 'o_009',
    nummer: 'OPD-2026-009',
    klantId: 'k_groenwest',
    omschrijving: 'Badkamerrenovatie 12 woningen Molenwijk',
    toelichting: 'Complete badkamerrenovatie in bewoonde staat: sloop, leidingwerk, tegelwerk (onderaannemer Visser), sanitair en afwerking. Twee woningen per week.',
    locatie: { straat: 'Molenvlietbaan 101-124', postcode: '3448 DH', plaats: 'Woerden', lat: 52.0812, lng: 4.8934 },
    status: 'in_uitvoering',
    startdatum: isoOffset(-24),
    einddatum: isoOffset(18),
    contractvorm: 'aanneemsom',
    aanneemsom: 86400,
    voorcalculatie: [
      regel('arbeid', 'Sloopwerk en afvoer', 96, 'uur', 38, 62),
      regel('arbeid', 'Leidingwerk water en afvoer', 120, 'uur', 36, 60),
      regel('arbeid', 'Stuc- en afwerking', 84, 'uur', 37, 61),
      regel('arbeid', 'Montage sanitair en oplevering', 108, 'uur', 36, 60),
      regel('onderaanneming', 'Tegelwerk wand en vloer (Visser Tegelwerken)', 300, 'uur', 45, 65),
      regel('materiaal', 'Sanitairset per woning', 12, 'set', 1180, 1450),
      regel('materiaal', 'Wand- en vloertegels', 480, 'm²', 24, 32),
      regel('materiaal', 'Leidingmateriaal en kranen', 12, 'woning', 310, 395),
      regel('materieel', 'Containers en afvoerkosten', 6, 'stuk', 420, 480),
    ],
    btwVerlegd: false,
    btwPercentage: 21,
    documenten: [
      { id: uid('doc'), naam: 'Raamcontract GroenWest 2026.pdf', type: 'contract', datum: isoOffset(-70) },
      { id: uid('doc'), naam: 'Offerte 2026-027 badkamers Molenwijk.pdf', type: 'offerte', datum: isoOffset(-38) },
      { id: uid('doc'), naam: 'Tegelplan standaardbadkamer.pdf', type: 'tekening', datum: isoOffset(-30) },
    ],
    projectleiderId: 'm_pieter',
    aangemaaktOp: tijdstip(isoOffset(-38), '09:05'),
    voortgang: 70,
  },
  {
    id: 'o_011',
    nummer: 'OPD-2026-011',
    klantId: 'k_rijnstreek',
    omschrijving: 'Afbouw 24 appartementen fase 2 – De Kade',
    toelichting: 'Regieopdracht als onderaannemer van Rijnstreek Ontwikkeling: binnenwanden, plafonds, stucwerk en aftimmering. Wekelijkse regiefacturatie op basis van goedgekeurde uren, btw verlegd.',
    locatie: { straat: 'Kadeplein 12', postcode: '3541 CA', plaats: 'Utrecht (Leidsche Rijn)', lat: 52.1027, lng: 5.0512 },
    status: 'in_uitvoering',
    startdatum: isoOffset(-21),
    einddatum: isoOffset(35),
    contractvorm: 'regie',
    voorcalculatie: [
      regel('arbeid', 'Metalstud-wanden plaatsen', 240, 'uur', 38, 62),
      regel('arbeid', 'Plafonds en aftimmering', 200, 'uur', 38, 62),
      regel('arbeid', 'Stucwerk wanden', 160, 'uur', 37, 61),
      regel('onderaanneming', 'Montage binnendeuren en kozijnen (TK Bouw)', 120, 'uur', 40, 62),
      regel('materiaal', 'Gipsplaat, profielen, isolatie', 24, 'app.', 620, 810),
      regel('materiaal', 'Stucgips en primer', 24, 'app.', 140, 190),
      regel('materieel', 'Rolsteigers', 8, 'week', 95, 130),
    ],
    btwVerlegd: true,
    btwPercentage: 21,
    documenten: [
      { id: uid('doc'), naam: 'Regieovereenkomst De Kade fase 2.pdf', type: 'contract', datum: isoOffset(-28) },
      { id: uid('doc'), naam: 'Afbouwstaat app. 2.01-2.24.xlsx', type: 'overig', datum: isoOffset(-25) },
    ],
    projectleiderId: 'm_pieter',
    aangemaaktOp: tijdstip(isoOffset(-28), '11:40'),
    voortgang: 55,
  },
  {
    id: 'o_014',
    nummer: 'OPD-2026-014',
    klantId: 'k_debruin',
    omschrijving: 'Uitbouw achterzijde en keukenverbouwing',
    toelichting: 'Uitbouw 3,5 m met plat dak, doorbraak naar bestaande keuken, nieuwe vloer en afwerking. Keuken wordt door derden geleverd.',
    locatie: { straat: 'Lupineoord 27', postcode: '3991 VD', plaats: 'Houten', lat: 52.0279, lng: 5.1663 },
    status: 'gepland',
    startdatum: isoOffset(volgendeMaandagOffset()),
    einddatum: isoOffset(volgendeMaandagOffset() + 32),
    contractvorm: 'aanneemsom',
    aanneemsom: 42500,
    voorcalculatie: [
      regel('arbeid', 'Fundering en vloer', 64, 'uur', 38, 62),
      regel('arbeid', 'Ruwbouw wanden en dak', 120, 'uur', 38, 62),
      regel('arbeid', 'Doorbraak en stalen ligger', 24, 'uur', 42, 68),
      regel('arbeid', 'Afbouw en installatie', 96, 'uur', 36, 60),
      regel('onderaanneming', 'Dakbedekking EPDM', 1, 'post', 1850, 2400),
      regel('materiaal', 'Hout, OSB, isolatie, gips', 1, 'post', 6800, 8900),
      regel('materiaal', 'Stalen ligger HEA 180', 1, 'stuk', 890, 1150),
      regel('materiaal', 'Kozijnen en schuifpui', 1, 'post', 5400, 6900),
      regel('materieel', 'Containers en kraan', 1, 'post', 1350, 1600),
    ],
    btwVerlegd: false,
    btwPercentage: 21,
    documenten: [{ id: uid('doc'), naam: 'Offerte 2026-042 (getekend).pdf', type: 'offerte', datum: isoOffset(-9) }],
    projectleiderId: 'm_pieter',
    aangemaaktOp: tijdstip(isoOffset(-12), '16:20'),
    voortgang: 0,
  },
  {
    id: 'o_015',
    nummer: 'OPD-2026-015',
    klantId: 'k_groenwest',
    omschrijving: 'Vervangen dakbedekking 18 bergingen Harmelen',
    toelichting: 'Verwijderen bitumen, nieuwe isolatie en EPDM op 18 bergingen aan de Dorpsstraat. Offerte uitgebracht, wacht op akkoord.',
    locatie: { straat: 'Dorpsstraat 60-96', postcode: '3481 EL', plaats: 'Harmelen', lat: 52.0917, lng: 4.9615 },
    status: 'offerte',
    startdatum: isoOffset(volgendeMaandagOffset() + 21),
    einddatum: isoOffset(volgendeMaandagOffset() + 35),
    contractvorm: 'aanneemsom',
    aanneemsom: 12750,
    voorcalculatie: [
      regel('arbeid', 'Verwijderen bitumen en afvoer', 36, 'uur', 38, 62),
      regel('arbeid', 'Isolatie en EPDM aanbrengen', 72, 'uur', 38, 62),
      regel('materiaal', 'PIR-isolatie 100 mm', 210, 'm²', 19.5, 27),
      regel('materiaal', 'EPDM-dakbedekking', 230, 'm²', 14, 20),
      regel('materieel', 'Container', 2, 'stuk', 420, 480),
    ],
    btwVerlegd: false,
    btwPercentage: 21,
    documenten: [{ id: uid('doc'), naam: 'Offerte 2026-044 bergingen Harmelen.pdf', type: 'offerte', datum: isoOffset(-3) }],
    projectleiderId: 'm_pieter',
    aangemaaktOp: tijdstip(isoOffset(-5), '13:15'),
    voortgang: 0,
  },
]

function volgendeMaandagOffset(): number {
  const d = parseDatum(VANDAAG)!.getDay() || 7
  return 8 - d
}

// ════════════════════════════════════════════════════════════════════
// Werkbonnen, uren, materiaal, foto's
// ════════════════════════════════════════════════════════════════════

const werkbonnen: Werkbon[] = []
const uren: Urenregel[] = []
const materiaal: Materiaalregel[] = []
const fotos: Foto[] = []
const tijdlijn: TijdlijnItem[] = []

function tl(opdrachtId: ID, tijdstipIso: string, type: TijdlijnItem['type'], tekst: string, door?: string) {
  tijdlijn.push({ id: uid('tl'), opdrachtId, tijdstip: tijdstipIso, type, tekst, door })
}

const opdracht = (id: ID) => opdrachten.find((o) => o.id === id)!
const medewerker = (id: ID) => medewerkers.find((m) => m.id === id)!

function gpsBij(o: Opdracht, datumIso: string, hhmm: string, afwijkingM = 0) {
  // ~0.00001 graad ≈ 1,1 m
  const richting = rnd() * Math.PI * 2
  const dLat = (afwijkingM / 111_000) * Math.cos(richting) + (rnd() - 0.5) * 0.0004
  const dLng = (afwijkingM / (111_000 * Math.cos((o.locatie.lat * Math.PI) / 180))) * Math.sin(richting) + (rnd() - 0.5) * 0.0005
  return { lat: o.locatie.lat + dLat, lng: o.locatie.lng + dLng, nauwkeurigheid: Math.round(tussen(6, 28)), tijd: tijdstip(datumIso, hhmm) }
}

interface UrenInvoer {
  mw: ID
  start: string
  eind?: string
  pauze?: number
  soort?: Uursoort
  goedgekeurd?: boolean
  afstandM?: number
  toelichting?: string
}

interface WerkbonOpties {
  opdrachtId: ID
  datum: string
  medewerkers: ID[]
  omschrijving: string
  status: WerkbonStatus
  checklist: string[]
  geplandStart?: string
  geplandUren?: number
  notities?: string
  handtekening?: string
  uren?: UrenInvoer[]
  materiaal?: Array<{ artikelId: ID; aantal: number }>
  fotos?: Array<{ cat: FotoCategorie; tekst: string; tijd: string; scene?: string; mw?: ID }>
}

function maakWerkbon(o: WerkbonOpties): Werkbon {
  const opd = opdracht(o.opdrachtId)
  tellers.werkbon++
  const wb: Werkbon = {
    id: uid('wb'),
    nummer: `WB-${String(tellers.werkbon).padStart(4, '0')}`,
    opdrachtId: o.opdrachtId,
    toegewezenAan: o.medewerkers,
    datum: o.datum,
    omschrijving: o.omschrijving,
    status: o.status,
    checklist: o.checklist.map((tekst, i) => ({
      id: uid('cl'),
      tekst,
      gedaan: o.status === 'gereed' || o.status === 'goedgekeurd' ? true : o.status === 'in_uitvoering' ? i < Math.ceil(o.checklist.length / 2) : false,
    })),
    notities: o.notities ?? '',
    geplandStart: o.geplandStart ?? '07:30',
    geplandUren: o.geplandUren ?? 8,
  }
  if (o.handtekening) {
    wb.handtekeningKlant = handtekeningPlaceholder(o.handtekening)
    wb.handtekeningNaam = o.handtekening
    wb.handtekeningOp = tijdstip(o.datum, '16:05')
  }
  werkbonnen.push(wb)

  const urenIn: UrenInvoer[] = o.uren ?? o.medewerkers.map((m) => ({ mw: m, start: '07:30', eind: '16:00', pauze: 45 }))
  if (o.status !== 'open' && o.status !== 'onderweg') {
    for (const u of urenIn) {
      const reg: Urenregel = {
        id: uid('ur'),
        medewerkerId: u.mw,
        werkbonId: wb.id,
        opdrachtId: o.opdrachtId,
        datum: o.datum,
        start: u.start,
        eind: u.eind,
        pauzeMinuten: u.pauze ?? 45,
        uursoort: u.soort ?? 'normaal',
        checkIn: gpsBij(opd, o.datum, u.start, u.afstandM ?? 0),
        checkOut: u.eind ? gpsBij(opd, o.datum, u.eind) : undefined,
        goedgekeurd: u.goedgekeurd ?? o.status === 'goedgekeurd',
        toelichting: u.toelichting,
      }
      uren.push(reg)
    }
  }
  for (const m of o.materiaal ?? []) {
    const a = artikel(m.artikelId)
    materiaal.push({
      id: uid('mt'),
      werkbonId: wb.id,
      opdrachtId: o.opdrachtId,
      artikelId: a.id,
      artikel: a.naam,
      aantal: m.aantal,
      eenheid: a.eenheid,
      kostprijs: a.kostprijs,
      verkoopprijs: a.verkoopprijs,
      datum: o.datum,
    })
  }
  ;(o.fotos ?? []).forEach((f, i) => {
    fotos.push({
      id: uid('ft'),
      werkbonId: wb.id,
      opdrachtId: o.opdrachtId,
      dataUrl: fotoPlaceholder({ categorie: f.cat, tekst: f.tekst, tijd: `${f.tijd}`, scene: f.scene, seed: idTeller + i }),
      tijdstempel: tijdstip(o.datum, f.tijd),
      gps: { lat: opd.locatie.lat + (rnd() - 0.5) * 0.0003, lng: opd.locatie.lng + (rnd() - 0.5) * 0.0004 },
      categorie: f.cat,
      bijschrift: f.tekst,
      medewerkerId: f.mw ?? o.medewerkers[0],
    })
  })
  tl(o.opdrachtId, tijdstip(o.datum, o.geplandStart ?? '07:30'), 'werkbon', `Werkbon ${wb.nummer} – ${o.omschrijving} (${o.status.replace('_', ' ')})`, medewerker(o.medewerkers[0])?.naam)
  return wb
}

// ── OPD-004: afgerond, alles goedgekeurd (weken -8 t/m -5) ──
{
  const dagen = werkdagen(-56, -34)
  const taken = ['Sloop bestaande afwerking', 'Metalstud en gipsplaat', 'Stucwerk wanden', 'Plafond afwerken', 'Vloertegels leggen', 'Voegen en kitwerk', 'Sauswerk', 'Oplevering en nazorg']
  dagen.forEach((d, i) => {
    if (i % 2 === 1) return
    const taak = taken[Math.min(taken.length - 1, Math.floor(i / 2))]
    maakWerkbon({
      opdrachtId: 'o_004',
      datum: d,
      medewerkers: i < 6 ? ['m_kevin', 'm_fatima'] : ['m_fatima', 'm_ruud'],
      omschrijving: taak,
      status: 'goedgekeurd',
      checklist: ['Werkplek afgeschermd', taak, 'Opgeruimd en afval afgevoerd'],
      materiaal: i === 2 ? [{ artikelId: 'a_gips', aantal: 28 }, { artikelId: 'a_stuc', aantal: 14 }] : i === 8 ? [{ artikelId: 'a_tegel_vloer', aantal: 52 }, { artikelId: 'a_lijm', aantal: 9 }] : i === 0 ? [{ artikelId: 'a_container', aantal: 1 }] : undefined,
      fotos: i === 0 ? [{ cat: 'voor', tekst: 'Entree voor start werkzaamheden', tijd: '07:52', scene: 'wand' }] : i === dagen.length - 2 || i === 14 ? [{ cat: 'na', tekst: 'Entree opgeleverd', tijd: '15:40', scene: 'wand' }] : undefined,
      handtekening: i === 14 ? 'D. Schouten' : undefined,
    })
  })
}

// ── OPD-007: opgeleverd, nog te factureren (weken -4 t/m -1) ──
{
  const dagen = werkdagen(-27, -4)
  const taken = ['Afplakken en stucherstel trappenhuis A', 'Stucherstel en primer trappenhuis B', 'Sauswerk plafonds A', 'Sauswerk wanden A', 'Sauswerk plafonds en wanden B', 'Lakwerk leuningen A', 'Lakwerk kozijnen en leuningen B', 'Afwerking, nalopen en oplevering']
  dagen.forEach((d, i) => {
    if (i % 2 === 1) return
    const k = Math.floor(i / 2)
    const taak = taken[Math.min(taken.length - 1, k)]
    maakWerkbon({
      opdrachtId: 'o_007',
      datum: d,
      medewerkers: k < 2 ? ['m_fatima', 'm_ruud'] : ['m_ruud', 'm_sander'],
      omschrijving: taak,
      status: 'goedgekeurd',
      checklist: ['Bewoners geïnformeerd', 'Vloer en leuningen afgeplakt', taak, 'Trappenhuis schoon achtergelaten'],
      uren: k < 2
        ? [{ mw: 'm_fatima', start: '07:30', eind: '16:00' }, { mw: 'm_ruud', start: '07:30', eind: '16:00' }]
        : [{ mw: 'm_ruud', start: '07:30', eind: '16:00' }, { mw: 'm_sander', start: '08:00', eind: '15:30' }],
      materiaal: k === 0 ? [{ artikelId: 'a_stuc', aantal: 12 }, { artikelId: 'a_steiger', aantal: 2 }] : k === 2 ? [{ artikelId: 'a_muurverf', aantal: 9 }, { artikelId: 'a_primer', aantal: 3 }] : k === 5 ? [{ artikelId: 'a_lak', aantal: 6 }, { artikelId: 'a_schuur', aantal: 2 }, { artikelId: 'a_steiger', aantal: 2 }] : undefined,
      fotos: k === 0 ? [{ cat: 'voor', tekst: 'Trappenhuis A, bestaande situatie', tijd: '07:48', scene: 'wand' }, { cat: 'schade', tekst: 'Loszittend stucwerk 2e verdieping', tijd: '09:15', scene: 'wand' }] : k === 3 ? [{ cat: 'tijdens', tekst: 'Sauswerk wanden trappenhuis A', tijd: '11:20', scene: 'wand' }] : k === 7 ? [{ cat: 'na', tekst: 'Trappenhuis B opgeleverd', tijd: '15:10', scene: 'wand' }] : undefined,
      handtekening: k === 7 ? 'H. Bosman' : undefined,
      notities: k === 3 ? 'Bewoner 2e etage vraagt of plafond boven de lift ook meegenomen kan worden – als meerwerk gemeld.' : '',
    })
  })
}

// ── OPD-009: badkamers, lopend, overschrijding (weken -3 t/m vandaag) ──
// Drie ploegen werken parallel: team A (sloop/leiding/sanitair), Fatima (uitvlakken),
// Marco (tegelwerk, onderaannemer) en Tomasz (aftimmering). Het tegelwerk loopt uit.
{
  const dagen = werkdagen(-24, -1)
  const teamA = [
    { taak: 'Sloop badkamer en afvoer puin', mat: [{ artikelId: 'a_container', aantal: 1 }, { artikelId: 'a_breekhamer', aantal: 1 }], cats: ['voor', 'tijdens'] as FotoCategorie[], scene: 'tegels' },
    { taak: 'Leidingwerk water en afvoer', mat: [{ artikelId: 'a_leiding', aantal: 42 }, { artikelId: 'a_afvoer', aantal: 9 }], cats: ['tijdens'] as FotoCategorie[], scene: 'leidingen' },
    { taak: 'Montage sanitair en kitwerk', mat: [{ artikelId: 'a_sanitair', aantal: 2 }, { artikelId: 'a_kraan', aantal: 2 }, { artikelId: 'a_kit', aantal: 3 }], cats: ['na'] as FotoCategorie[], scene: 'tegels' },
  ]
  let woning = 101
  dagen.forEach((d, i) => {
    const isDezeWeek = i >= dagen.length - 2
    const status: WerkbonStatus = isDezeWeek ? 'gereed' : 'goedgekeurd'
    const stapA = teamA[i % 3]
    if (i % 3 === 0 && i > 0) woning += 2
    const wnr = `woning ${woning}/${woning + 1}`
    // Team A – Kevin + Sander
    const urenA: UrenInvoer[] = [
      { mw: 'm_kevin', start: '07:30', eind: '16:00', pauze: 45, goedgekeurd: !isDezeWeek },
      { mw: 'm_sander', start: '07:45', eind: '15:45', pauze: 45, goedgekeurd: !isDezeWeek },
    ]
    // één keer check-in ver buiten de locatie (afwijking), vorige week
    if (i === dagen.length - 5) urenA[1] = { ...urenA[1], afstandM: 1450, goedgekeurd: false }
    maakWerkbon({
      opdrachtId: 'o_009',
      datum: d,
      medewerkers: ['m_kevin', 'm_sander'],
      omschrijving: `${stapA.taak} – ${wnr}`,
      status,
      checklist: ['Bewoner aanwezig / toegang geregeld', 'Werkgebied afgeschermd', stapA.taak, 'Gereedschap en afval opgeruimd'],
      uren: urenA,
      materiaal: stapA.mat,
      fotos: stapA.cats.map((cat) => ({ cat, tekst: `${stapA.taak} – woning ${woning}`, tijd: cat === 'voor' ? '07:55' : cat === 'na' ? '15:35' : '11:20', scene: stapA.scene, mw: cat === 'na' ? 'm_sander' : 'm_kevin' })),
      handtekening: stapA.cats[0] === 'na' && !isDezeWeek ? `Bewoner nr. ${woning}` : undefined,
      notities: i === 1 ? 'Oude leidingen liggen anders dan op tekening; extra afvoer nodig (meerwerk gemeld).' : i === 0 ? 'Puin bevat mogelijk asbesthoudende kit onder oude tegels – gestopt en gemeld.' : '',
    })
    // Fatima – uitvlakken, om de dag
    if (i % 2 === 1) {
      maakWerkbon({
        opdrachtId: 'o_009',
        datum: d,
        medewerkers: ['m_fatima'],
        omschrijving: `Wanden uitvlakken en voorbereiden tegelwerk – ${wnr}`,
        status,
        checklist: ['Wanden controleren', 'Uitvlakken', 'Primer aanbrengen'],
        uren: [{ mw: 'm_fatima', start: '07:30', eind: '16:00', pauze: 45, goedgekeurd: !isDezeWeek }],
        materiaal: [{ artikelId: 'a_stuc', aantal: 6 }, { artikelId: 'a_primer', aantal: 1 }],
        fotos: i % 4 === 1 ? [{ cat: 'tijdens', tekst: `Wanden uitgevlakt woning ${woning}`, tijd: '14:10', scene: 'wand', mw: 'm_fatima' }] : undefined,
      })
    }
    // Marco – tegelwerk, elke dag, lange dagen (overschrijding onderaanneming)
    const lang = i % 5 === 3
    const tegelWoning = woning - 2 > 100 ? woning - 2 : woning
    maakWerkbon({
      opdrachtId: 'o_009',
      datum: d,
      medewerkers: ['m_marco'],
      omschrijving: `${i % 2 === 0 ? 'Tegelwerk wanden' : 'Tegelwerk vloer en voegen'} – woning ${tegelWoning}/${tegelWoning + 1}`,
      status,
      checklist: ['Ondergrond controleren', i % 2 === 0 ? 'Wandtegels zetten' : 'Vloertegels leggen en voegen', 'Schoonmaken'],
      geplandStart: '07:00',
      geplandUren: 9,
      uren: [{ mw: 'm_marco', start: '07:00', eind: lang ? '19:00' : '18:00', pauze: 30, goedgekeurd: !isDezeWeek, toelichting: lang ? 'Ondergrond slechter dan verwacht, extra uitvlakken en snijwerk' : undefined }],
      materiaal: [{ artikelId: 'a_tegel_wand', aantal: 16 }, { artikelId: 'a_tegel_vloer', aantal: 5 }, { artikelId: 'a_lijm', aantal: 2 }, { artikelId: 'a_voeg', aantal: 1 }],
      fotos: i % 3 === 0 ? [{ cat: 'tijdens', tekst: `Tegelwerk woning ${tegelWoning}`, tijd: '13:25', scene: 'tegels', mw: 'm_marco' }] : undefined,
    })
    // Tomasz – aftimmering, 10 van de 18 dagen
    if (i % 9 < 5) {
      maakWerkbon({
        opdrachtId: 'o_009',
        datum: d,
        medewerkers: ['m_tomasz'],
        omschrijving: `Aftimmering leidingkoker en plafond – ${wnr}`,
        status,
        checklist: ['Koker aftimmeren', 'Plafondplaat plaatsen', 'Kitwerk'],
        uren: [{ mw: 'm_tomasz', start: '07:15', eind: '15:45', pauze: 30, goedgekeurd: !isDezeWeek }],
        materiaal: [{ artikelId: 'a_gips', aantal: 3 }, { artikelId: 'a_hout_bl', aantal: 12 }],
      })
    }
  })
  // gisteren: één urenregel zónder check-out (afwijking)
  const gisteren = werkdagen(-4, -1).at(-1)!
  maakWerkbon({
    opdrachtId: 'o_009',
    datum: gisteren,
    medewerkers: ['m_jeroen'],
    omschrijving: 'Controle en opname woning 109/110 met bewoner',
    status: 'in_uitvoering',
    checklist: ['Opnameformulier invullen', 'Restpunten noteren', 'Bewoner informeren'],
    uren: [{ mw: 'm_jeroen', start: '13:15', eind: undefined, pauze: 0, goedgekeurd: false }],
    fotos: [{ cat: 'schade', tekst: 'Kras in vloertegel woning 109', tijd: '13:40', scene: 'tegels', mw: 'm_jeroen' }],
  })
  // vandaag: werkbonnen voor de veld-demo (Sander = standaard veldgebruiker)
  maakWerkbon({
    opdrachtId: 'o_009',
    datum: VANDAAG,
    medewerkers: ['m_sander', 'm_kevin'],
    omschrijving: 'Montage sanitair en kitwerk – woning 111/112',
    status: 'open',
    checklist: ['Bewoner aanwezig / toegang geregeld', 'Toilet en wastafel monteren', 'Douchegarnituur en thermostaatkraan', 'Kitwerk en afpersen', 'Opleverfoto’s maken'],
    geplandStart: '07:30',
    geplandUren: 8,
  })
  maakWerkbon({
    opdrachtId: 'o_009',
    datum: VANDAAG,
    medewerkers: ['m_marco'],
    omschrijving: 'Tegelwerk wanden – woning 113/114',
    status: 'in_uitvoering',
    checklist: ['Wanden controleren op vlakheid', 'Wandtegels zetten', 'Hoeken en profielen'],
    geplandStart: '07:00',
    geplandUren: 9,
    uren: [{ mw: 'm_marco', start: '07:05', eind: undefined, pauze: 0, goedgekeurd: false }],
    fotos: [{ cat: 'tijdens', tekst: 'Wandtegels woning 113', tijd: '09:30', scene: 'tegels', mw: 'm_marco' }],
  })
  // komende dagen: gepland
  const komende = werkdagen(1, 6)
  maakWerkbon({ opdrachtId: 'o_009', datum: komende[0], medewerkers: ['m_sander'], omschrijving: 'Leidingwerk water en afvoer – woning 115/116', status: 'open', checklist: ['Oude leidingen verwijderen', 'PEX-leidingen leggen', 'Afvoer aansluiten', 'Afpersen'], geplandStart: '07:30', geplandUren: 8 })
  maakWerkbon({ opdrachtId: 'o_009', datum: komende[0], medewerkers: ['m_marco'], omschrijving: 'Tegelwerk vloer en voegen – woning 113/114', status: 'open', checklist: ['Vloertegels leggen', 'Voegen', 'Schoonmaken'], geplandStart: '07:00', geplandUren: 9 })
  maakWerkbon({ opdrachtId: 'o_009', datum: komende[1], medewerkers: ['m_kevin', 'm_sander'], omschrijving: 'Sloop badkamer en afvoer puin – woning 117/118', status: 'open', checklist: ['Water afsluiten', 'Sanitair en tegels verwijderen', 'Puin afvoeren'], geplandStart: '07:30', geplandUren: 8 })
  maakWerkbon({ opdrachtId: 'o_009', datum: komende[2], medewerkers: ['m_fatima'], omschrijving: 'Wanden uitvlakken – woning 115/116', status: 'open', checklist: ['Wanden uitvlakken', 'Primer aanbrengen'], geplandStart: '07:30', geplandUren: 8 })
}

// ── OPD-011: afbouw appartementen, regie, positief resultaat (weken -3 t/m vandaag) ──
// Efficiënte ploeg: Kevin (elke dag, deels met Tomasz), Fatima + Jeroen stucwerk om de dag.
{
  const dagen = werkdagen(-21, -1)
  let app = 1
  dagen.forEach((d, i) => {
    if (i % 3 === 0 && i > 0) app += 2
    const isDezeWeek = i >= dagen.length - 2
    const isVorigeWeek = !isDezeWeek && i >= dagen.length - 7
    const status: WerkbonStatus = isDezeWeek ? 'gereed' : 'goedgekeurd'
    const appLabel = `app. 2.${String(app).padStart(2, '0')}–2.${String(app + 1).padStart(2, '0')}`
    const metTomasz = i % 5 < 2
    const taakA = i % 3 === 0 ? 'Metalstud-wanden plaatsen' : i % 3 === 1 ? 'Plafonds en aftimmering' : 'Binnendeuren en kozijnen stellen'
    const urenA: UrenInvoer[] = [{ mw: 'm_kevin', start: '07:00', eind: '15:00', pauze: 30, goedgekeurd: !isDezeWeek }]
    if (metTomasz) urenA.push({ mw: 'm_tomasz', start: '07:00', eind: '15:00', pauze: 30, goedgekeurd: !isDezeWeek })
    // één lange dag (>10 uur) vorige week als afwijking
    if (isVorigeWeek && i % 3 === 0) urenA[0] = { ...urenA[0], start: '06:45', eind: '18:20', pauze: 30, goedgekeurd: false, toelichting: 'Storten dekvloer volgende dag; wanden moesten staan' }
    maakWerkbon({
      opdrachtId: 'o_011',
      datum: d,
      medewerkers: metTomasz ? ['m_kevin', 'm_tomasz'] : ['m_kevin'],
      omschrijving: `${taakA} – ${appLabel}`,
      status,
      checklist: ['Bouwplaatsregels / PBM gecontroleerd', taakA, 'Afval in bouwcontainer', 'Uitvoerder Rijnstreek geïnformeerd'],
      geplandStart: '07:00',
      geplandUren: 8,
      uren: urenA,
      materiaal: i % 3 === 0 ? [{ artikelId: 'a_gips', aantal: 30 }, { artikelId: 'a_isolatie', aantal: 10 }, { artikelId: 'a_schroeven', aantal: 1 }] : i % 3 === 1 ? [{ artikelId: 'a_hout_bl', aantal: 30 }, { artikelId: 'a_gips', aantal: 12 }] : [{ artikelId: 'a_schroeven', aantal: 1 }],
      fotos: i % 3 === 0 ? [{ cat: i === 0 ? 'voor' : 'tijdens', tekst: `${taakA} ${appLabel}`, tijd: '10:15', scene: 'wand', mw: 'm_kevin' }] : undefined,
      notities: i === 6 ? 'Rijnstreek vraagt extra sparing voor ventilatiekanaal in app. 2.05 – gemeld als meerwerk.' : '',
    })
    if (i % 2 === 0) {
      maakWerkbon({
        opdrachtId: 'o_011',
        datum: d,
        medewerkers: ['m_fatima', 'm_jeroen'],
        omschrijving: `Stucwerk wanden – ${appLabel}`,
        status,
        checklist: ['Wanden voorstrijken', 'Stucwerk aanbrengen', 'Hoeken afwerken'],
        geplandStart: '07:00',
        geplandUren: 8,
        uren: [
          { mw: 'm_fatima', start: '07:00', eind: '15:00', pauze: 30, goedgekeurd: !isDezeWeek },
          { mw: 'm_jeroen', start: '07:00', eind: '15:00', pauze: 30, goedgekeurd: !isDezeWeek },
        ],
        materiaal: [{ artikelId: 'a_stuc', aantal: 12 }, { artikelId: 'a_primer', aantal: 1 }].concat(i % 6 === 0 ? [{ artikelId: 'a_steiger', aantal: 2 }] : []),
        fotos: i % 4 === 0 ? [{ cat: 'tijdens', tekst: `Stucwerk ${appLabel}`, tijd: '13:05', scene: 'wand', mw: 'm_fatima' }] : undefined,
      })
    }
  })
  maakWerkbon({
    opdrachtId: 'o_011',
    datum: VANDAAG,
    medewerkers: ['m_kevin', 'm_tomasz'],
    omschrijving: 'Metalstud-wanden plaatsen – app. 2.13–2.14',
    status: 'onderweg',
    checklist: ['Bouwplaatsregels / PBM gecontroleerd', 'Profielen uitzetten', 'Beplating eerste zijde', 'Isolatie en tweede zijde', 'Afval in bouwcontainer'],
    geplandStart: '07:00',
    geplandUren: 8,
  })
  maakWerkbon({
    opdrachtId: 'o_011',
    datum: VANDAAG,
    medewerkers: ['m_fatima', 'm_jeroen'],
    omschrijving: 'Stucwerk wanden – app. 2.09–2.10',
    status: 'in_uitvoering',
    checklist: ['Wanden voorstrijken', 'Stucwerk aanbrengen', 'Hoeken afwerken'],
    geplandStart: '07:00',
    geplandUren: 8,
    uren: [{ mw: 'm_fatima', start: '06:58', pauze: 0, goedgekeurd: false }, { mw: 'm_jeroen', start: '07:02', pauze: 0, goedgekeurd: false }],
  })
  const komende = werkdagen(1, 6)
  maakWerkbon({ opdrachtId: 'o_011', datum: komende[0], medewerkers: ['m_kevin'], omschrijving: 'Plafonds en aftimmering – app. 2.13–2.14', status: 'open', checklist: ['Plafondregels', 'Beplating', 'Aftimmering'], geplandStart: '07:00', geplandUren: 8 })
  maakWerkbon({ opdrachtId: 'o_011', datum: komende[1], medewerkers: ['m_fatima', 'm_jeroen'], omschrijving: 'Stucwerk wanden – app. 2.11–2.12', status: 'open', checklist: ['Wanden voorstrijken', 'Stucwerk aanbrengen'], geplandStart: '07:00', geplandUren: 8 })
  maakWerkbon({ opdrachtId: 'o_011', datum: komende[2], medewerkers: ['m_tomasz'], omschrijving: 'Binnendeuren en kozijnen – app. 2.05–2.08', status: 'open', checklist: ['Kozijnen stellen', 'Deuren afhangen', 'Beslag monteren'], geplandStart: '07:00', geplandUren: 8 })
}

// ── OPD-014: gepland volgende week ──
{
  const start = volgendeMaandagOffset()
  const dagen = werkdagen(start, start + 4)
  maakWerkbon({ opdrachtId: 'o_014', datum: dagen[0], medewerkers: ['m_jeroen', 'm_kevin'], omschrijving: 'Uitzetten, ontgraven en bekisting fundering', status: 'open', checklist: ['Klic-melding gecontroleerd', 'Uitzetten volgens tekening', 'Ontgraven', 'Bekisting plaatsen'], geplandStart: '07:30', geplandUren: 8 })
  maakWerkbon({ opdrachtId: 'o_014', datum: dagen[1], medewerkers: ['m_jeroen', 'm_kevin'], omschrijving: 'Wapening en storten fundering', status: 'open', checklist: ['Wapening aanbrengen', 'Betonmixer om 10:00', 'Afwerken'], geplandStart: '07:30', geplandUren: 8 })
  maakWerkbon({ opdrachtId: 'o_014', datum: dagen[3], medewerkers: ['m_kevin', 'm_tomasz'], omschrijving: 'Houtskeletbouw wanden opbouwen', status: 'open', checklist: ['Onderregels stellen', 'HSB-elementen plaatsen', 'Schoren'], geplandStart: '07:30', geplandUren: 8 })
}

// ════════════════════════════════════════════════════════════════════
// Meerwerk
// ════════════════════════════════════════════════════════════════════

const meerwerk: Meerwerk[] = []
function maakMeerwerk(m: Omit<Meerwerk, 'id' | 'nummer' | 'bedrag' | 'gefactureerd'> & { gefactureerd?: boolean }): Meerwerk {
  tellers.meerwerk++
  const item: Meerwerk = {
    ...m,
    id: uid('mw'),
    nummer: `MW-${String(tellers.meerwerk).padStart(3, '0')}`,
    bedrag: Math.round((m.geschatteUren * m.uurtarief + m.materiaalBedrag) * 100) / 100,
    gefactureerd: m.gefactureerd ?? false,
  }
  meerwerk.push(item)
  tl(m.opdrachtId, m.gemeldOp, 'meerwerk', `Meerwerk ${item.nummer} gemeld: ${m.omschrijving}`, medewerker(m.gemeldDoor).naam)
  if (m.akkoordOp) tl(m.opdrachtId, m.akkoordOp, 'meerwerk', `Meerwerk ${item.nummer} akkoord door ${m.akkoordDoor}`)
  return item
}

function meerwerkFoto(opdrachtId: ID, werkbonId: ID, tekst: string, datumIso: string, tijd: string, scene: string, mw: ID): ID {
  const o = opdracht(opdrachtId)
  const f: Foto = {
    id: uid('ft'),
    werkbonId,
    opdrachtId,
    dataUrl: fotoPlaceholder({ categorie: 'meerwerk', tekst, tijd, scene, seed: idTeller }),
    tijdstempel: tijdstip(datumIso, tijd),
    gps: { lat: o.locatie.lat, lng: o.locatie.lng },
    categorie: 'meerwerk',
    bijschrift: tekst,
    medewerkerId: mw,
  }
  fotos.push(f)
  return f.id
}

const wbVan = (opdrachtId: ID, idx: number) => werkbonnen.filter((w) => w.opdrachtId === opdrachtId)[idx]

{
  // OPD-009: alle vier statussen
  const wbs009 = werkbonnen.filter((w) => w.opdrachtId === 'o_009')
  const wbSloop = wbs009.find((w) => w.omschrijving.startsWith('Sloop'))!
  const wbLeiding = wbs009.find((w) => w.omschrijving.startsWith('Leidingwerk'))!
  const wbTegel = wbs009.find((w) => w.omschrijving.startsWith('Tegelwerk wanden'))!
  const wbSan = wbs009.find((w) => w.omschrijving.startsWith('Montage sanitair'))!
  maakMeerwerk({
    opdrachtId: 'o_009',
    werkbonId: wbLeiding.id,
    omschrijving: 'Extra afvoerleiding verleggen woning 105',
    reden: 'Bestaande afvoer ligt niet volgens tekening; standleiding moet via de leidingkoker worden omgelegd.',
    fotoIds: [meerwerkFoto('o_009', wbLeiding.id, 'Afvoer woning 105 afwijkend', wbLeiding.datum, '11:05', 'leidingen', 'm_sander')],
    geschatteUren: 6,
    uurtarief: 60,
    materiaalBedrag: 185,
    materiaalOmschrijving: 'PVC 40/75 mm, koppelstukken, beugels',
    status: 'gemeld',
    gemeldDoor: 'm_sander',
    gemeldOp: tijdstip(wbLeiding.datum, '11:12'),
  })
  maakMeerwerk({
    opdrachtId: 'o_009',
    werkbonId: wbSloop.id,
    omschrijving: 'Asbestverdachte kitranden laten saneren (woning 101–104)',
    reden: 'Onder de oude tegels is asbestverdachte kit aangetroffen. Werk gestaakt, gecertificeerde sanering nodig vóór verder sloopwerk.',
    fotoIds: [meerwerkFoto('o_009', wbSloop.id, 'Asbestverdachte kit onder tegels', wbSloop.datum, '09:40', 'tegels', 'm_kevin')],
    geschatteUren: 8,
    uurtarief: 60,
    materiaalBedrag: 2350,
    materiaalOmschrijving: 'Sanering door gecertificeerd bedrijf (offerte Asbestrix B.V.) + eindcontrole',
    status: 'ter_akkoord',
    gemeldDoor: 'm_kevin',
    gemeldOp: tijdstip(wbSloop.datum, '09:52'),
  })
  maakMeerwerk({
    opdrachtId: 'o_009',
    werkbonId: wbTegel.id,
    omschrijving: 'Wandtegels tot plafond i.p.v. 1,80 m (woning 101–112)',
    reden: 'Op verzoek van GroenWest: volledige betegeling tot plafond voor onderhoudsvriendelijkheid.',
    fotoIds: [meerwerkFoto('o_009', wbTegel.id, 'Tegelhoogte tot plafond', wbTegel.datum, '13:25', 'tegels', 'm_marco')],
    geschatteUren: 30,
    uurtarief: 65,
    materiaalBedrag: 1740,
    materiaalOmschrijving: '60 m² extra wandtegel incl. lijm en voeg',
    status: 'akkoord',
    gemeldDoor: 'm_marco',
    gemeldOp: tijdstip(wbTegel.datum, '13:30'),
    akkoordDoor: 'Marloes Verhoef (GroenWest)',
    akkoordOp: tijdstip(isoOffset(-13), '16:42'),
    akkoordHandtekening: handtekeningPlaceholder('Marloes Verhoef'),
  })
  maakMeerwerk({
    opdrachtId: 'o_009',
    werkbonId: wbSan.id,
    omschrijving: 'Spiegelkast met verlichting i.p.v. standaard spiegel',
    reden: 'Verzoek bewoner woning 103.',
    fotoIds: [],
    geschatteUren: 1.5,
    uurtarief: 60,
    materiaalBedrag: 289,
    materiaalOmschrijving: 'Spiegelkast 80 cm met LED',
    status: 'afgewezen',
    gemeldDoor: 'm_sander',
    gemeldOp: tijdstip(wbSan.datum, '14:10'),
    afgewezenReden: 'Valt buiten het renovatieprogramma; bewoner kan dit zelf regelen.',
  })
}
{
  // OPD-011: ter akkoord + akkoord (gefactureerd)
  const wb = werkbonnen.filter((w) => w.opdrachtId === 'o_011')[6]
  maakMeerwerk({
    opdrachtId: 'o_011',
    werkbonId: wb.id,
    omschrijving: 'Extra sparing ventilatiekanaal app. 2.05',
    reden: 'Installateur heeft kanaal verplaatst; sparing in metalstud-wand plus brandwerende afdichting nodig.',
    fotoIds: [meerwerkFoto('o_011', wb.id, 'Positie ventilatiekanaal app. 2.05', wb.datum, '10:48', 'wand', 'm_kevin')],
    geschatteUren: 3,
    uurtarief: 62,
    materiaalBedrag: 95,
    materiaalOmschrijving: 'Brandwerende manchet en kit',
    status: 'ter_akkoord',
    gemeldDoor: 'm_kevin',
    gemeldOp: tijdstip(wb.datum, '10:55'),
  })
  const wb2 = werkbonnen.filter((w) => w.opdrachtId === 'o_011')[1]
  maakMeerwerk({
    opdrachtId: 'o_011',
    werkbonId: wb2.id,
    omschrijving: 'Verlaagd plafond hal app. 2.01–2.04 t.b.v. leidingwerk',
    reden: 'Leidingen van de installateur lopen lager dan in het ontwerp; verlaagd plafond in de hal nodig.',
    fotoIds: [],
    geschatteUren: 12,
    uurtarief: 62,
    materiaalBedrag: 310,
    status: 'akkoord',
    gemeldDoor: 'm_kevin',
    gemeldOp: tijdstip(wb2.datum, '09:20'),
    akkoordDoor: 'Daan Schouten (Rijnstreek)',
    akkoordOp: tijdstip(isoOffset(-16), '12:05'),
    akkoordHandtekening: handtekeningPlaceholder('Daan Schouten'),
    gefactureerd: true,
  })
}
{
  // OPD-007: akkoord, nog te factureren
  const wb = wbVan('o_007', 3)
  maakMeerwerk({
    opdrachtId: 'o_007',
    werkbonId: wb.id,
    omschrijving: 'Plafond boven liftportaal 2e etage meesausen',
    reden: 'Niet in offerte opgenomen; bestuur wil dit gelijk meenemen.',
    fotoIds: [meerwerkFoto('o_007', wb.id, 'Plafond liftportaal 2e etage', wb.datum, '14:02', 'wand', 'm_ruud')],
    geschatteUren: 4,
    uurtarief: 58,
    materiaalBedrag: 60,
    status: 'akkoord',
    gemeldDoor: 'm_ruud',
    gemeldOp: tijdstip(wb.datum, '14:05'),
    akkoordDoor: 'Henk Bosman (VvE Parkzicht)',
    akkoordOp: tijdstip(isoOffset(-14), '19:30'),
    akkoordHandtekening: handtekeningPlaceholder('Henk Bosman'),
  })
}

// Akkoord meerwerk als regel in de voorcalculatie (zoals de app dat ook doet na akkoord)
for (const m of meerwerk.filter((x) => x.status === 'akkoord')) {
  const o = opdracht(m.opdrachtId)
  o.voorcalculatie.push({
    id: uid('cr'),
    type: 'arbeid',
    omschrijving: `Meerwerk ${m.nummer}: ${m.omschrijving}`,
    aantal: 1,
    eenheid: 'post',
    kostprijs: Math.round(m.bedrag * 0.72),
    verkoopprijs: m.bedrag,
    opslagPercentage: 38.9,
    uitMeerwerk: m.id,
  })
}

// ════════════════════════════════════════════════════════════════════
// Facturen
// ════════════════════════════════════════════════════════════════════

const facturen: Factuur[] = []
function maakFactuur(f: Omit<Factuur, 'id' | 'subtotaal' | 'btw' | 'totaal'>): Factuur {
  const subtotaal = f.regels.reduce((s, r) => s + r.bedrag, 0)
  const btw = f.btwVerlegd ? 0 : f.regels.reduce((s, r) => s + (r.bedrag * r.btwPercentage) / 100, 0)
  const fact: Factuur = { ...f, id: uid('fc'), subtotaal: r2(subtotaal), btw: r2(btw), totaal: r2(subtotaal + btw) }
  facturen.push(fact)
  tl(f.opdrachtId, tijdstip(f.datum, '10:00'), 'factuur', `Factuur ${f.nummer} (${f.type}) aangemaakt – ${f.status}`)
  if (f.erpStatus === 'gesynchroniseerd') tl(f.opdrachtId, tijdstip(f.datum, '10:03'), 'erp', `Factuur ${f.nummer} gesynchroniseerd naar Exact Online (${f.erpReferentie})`)
  return fact
}
const r2 = (n: number) => Math.round(n * 100) / 100
function fr(omschrijving: string, aantal: number, eenheid: string, prijs: number, btw: number, bron?: FactuurRegel['bron']): FactuurRegel {
  return { id: uid('fr'), omschrijving, aantal, eenheid, prijs, btwPercentage: btw, bedrag: r2(aantal * prijs), bron }
}

maakFactuur({
  nummer: 'F-2026-041',
  opdrachtId: 'o_004',
  klantId: 'k_rijnstreek',
  type: 'eindafrekening',
  datum: isoOffset(-31),
  vervaldatum: isoOffset(-1),
  regels: [fr('Renovatie entreehal De Brand – eindafrekening conform opdracht RO-2026-118', 1, 'post', 18900, 21, { type: 'termijn', ids: [] })],
  btwVerlegd: true,
  status: 'betaald',
  erpStatus: 'gesynchroniseerd',
  erpReferentie: 'EOL-VF-20260041',
  erpPakket: 'exact',
  verzondenOp: tijdstip(isoOffset(-31), '10:20'),
  betaaldOp: tijdstip(isoOffset(-6), '08:00'),
  omschrijving: 'Eindafrekening renovatie entreehal De Brand',
})
maakFactuur({
  nummer: 'F-2026-045',
  opdrachtId: 'o_009',
  klantId: 'k_groenwest',
  type: 'termijn',
  datum: isoOffset(-22),
  vervaldatum: isoOffset(8),
  regels: [fr('Badkamerrenovatie Molenwijk – 1e termijn 30% bij start werkzaamheden', 1, 'termijn', 25920, 21, { type: 'termijn', ids: [] })],
  btwVerlegd: false,
  status: 'betaald',
  erpStatus: 'gesynchroniseerd',
  erpReferentie: 'EOL-VF-20260045',
  erpPakket: 'exact',
  verzondenOp: tijdstip(isoOffset(-22), '11:00'),
  betaaldOp: tijdstip(isoOffset(-3), '08:00'),
  omschrijving: '1e termijn badkamerrenovatie Molenwijk',
})
{
  // regiefactuur OPD-011 weken -3 en -2 op basis van goedgekeurde uren + materiaal
  const wk = werkdagen(-21, -8)
  const urenIds = uren.filter((u) => u.opdrachtId === 'o_011' && wk.includes(u.datum) && u.eind).map((u) => u.id)
  const totaalUren = uren.filter((u) => urenIds.includes(u.id)).reduce((s, u) => s + urenTussen(u.start, u.eind, u.pauzeMinuten), 0)
  const matIds = materiaal.filter((m) => m.opdrachtId === 'o_011' && wk.includes(m.datum)).map((m) => m.id)
  const matBedrag = materiaal.filter((m) => matIds.includes(m.id)).reduce((s, m) => s + m.aantal * m.verkoopprijs, 0)
  const mwAkkoord = meerwerk.find((m) => m.opdrachtId === 'o_011' && m.status === 'akkoord')!
  maakFactuur({
    nummer: 'F-2026-052',
    opdrachtId: 'o_011',
    klantId: 'k_rijnstreek',
    type: 'regie',
    datum: isoOffset(-7),
    vervaldatum: isoOffset(23),
    regels: [
      fr(`Arbeid afbouw De Kade fase 2, week ${weekLabel(wk[0])} – ${weekLabel(wk.at(-1)!)}`, r2(totaalUren), 'uur', 62, 21, { type: 'uren', ids: urenIds }),
      fr('Materiaal volgens bonnen (gipsplaat, profielen, stucgips, bevestiging)', 1, 'post', r2(matBedrag), 21, { type: 'materiaal', ids: matIds }),
      fr(`Meerwerk ${mwAkkoord.nummer}: ${mwAkkoord.omschrijving}`, 1, 'post', mwAkkoord.bedrag, 21, { type: 'meerwerk', ids: [mwAkkoord.id] }),
    ],
    btwVerlegd: true,
    status: 'verzonden',
    erpStatus: 'gesynchroniseerd',
    erpReferentie: 'EOL-VF-20260052',
    erpPakket: 'exact',
    verzondenOp: tijdstip(isoOffset(-7), '09:30'),
    omschrijving: 'Regiefactuur De Kade fase 2 – periode 1',
  })
}
maakFactuur({
  nummer: 'F-2026-056',
  opdrachtId: 'o_009',
  klantId: 'k_groenwest',
  type: 'termijn',
  datum: isoOffset(-2),
  vervaldatum: isoOffset(28),
  regels: [fr('Badkamerrenovatie Molenwijk – 2e termijn 40% bij 70% voortgang', 1, 'termijn', 34560, 21, { type: 'termijn', ids: [] })],
  btwVerlegd: false,
  status: 'verzonden',
  erpStatus: 'fout',
  erpPakket: 'exact',
  erpMelding: 'Debiteurnummer 10234 onbekend in administratie "Van der Meulen Afbouw B.V." – controleer de relatiekaart in Exact Online.',
  verzondenOp: tijdstip(isoOffset(-2), '15:45'),
  omschrijving: '2e termijn badkamerrenovatie Molenwijk',
})

function weekLabel(iso: string): string {
  const d = parseDatum(iso)!
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return 'wk ' + Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// ════════════════════════════════════════════════════════════════════
// Koppelingen + synclog
// ════════════════════════════════════════════════════════════════════

const standaardInstellingen = (dagboek: string, omzet = '8000', verlegd = '8010', btw = '1500', deb = '1300') => ({
  grootboekOmzet: omzet,
  grootboekOmzetVerlegd: verlegd,
  grootboekBtw: btw,
  grootboekDebiteuren: deb,
  dagboek,
  kostenplaatsIsOpdracht: true,
  autoSyncBijVerzonden: true,
})

const koppelingen: Koppeling[] = [
  { pakket: 'exact', verbonden: true, verbondenOp: tijdstip(isoOffset(-45), '14:12'), administratie: 'Van der Meulen Afbouw B.V. (1234567)', instellingen: standaardInstellingen('70 – Verkoopboek'), laatsteSync: tijdstip(isoOffset(-2), '15:46') },
  { pakket: 'afas', verbonden: false, instellingen: standaardInstellingen('Verkoop') },
  { pakket: 'twinfield', verbonden: false, instellingen: standaardInstellingen('VRK') },
  { pakket: 'snelstart', verbonden: false, instellingen: standaardInstellingen('Verkoopboek') },
  { pakket: 'generiek', verbonden: true, verbondenOp: tijdstip(isoOffset(-45), '14:20'), administratie: 'UBL 2.1 / CSV-export', instellingen: standaardInstellingen('Verkoop') },
]

const syncLog: SyncLogRegel[] = [
  { id: uid('sl'), tijdstip: tijdstip(isoOffset(-45), '14:13'), pakket: 'exact', richting: 'van_erp', object: 'Klanten (debiteuren)', status: 'ok', melding: '4 debiteuren opgehaald, 4 gekoppeld op debiteurnummer', actie: 'syncKlanten' },
  { id: uid('sl'), tijdstip: tijdstip(isoOffset(-45), '14:14'), pakket: 'exact', richting: 'van_erp', object: 'Artikelen', status: 'ok', melding: '23 artikelen opgehaald, 23 bijgewerkt', actie: 'syncArtikelen' },
  { id: uid('sl'), tijdstip: tijdstip(isoOffset(-31), '10:21'), pakket: 'exact', richting: 'naar_erp', object: 'Factuur F-2026-041', objectId: facturen[0].id, status: 'ok', melding: 'Verkoopfactuur aangemaakt (EOL-VF-20260041), kostenplaats OPD-2026-004', actie: 'pushFactuur' },
  { id: uid('sl'), tijdstip: tijdstip(isoOffset(-22), '11:01'), pakket: 'exact', richting: 'naar_erp', object: 'Factuur F-2026-045', objectId: facturen[1].id, status: 'ok', melding: 'Verkoopfactuur aangemaakt (EOL-VF-20260045), kostenplaats OPD-2026-009', actie: 'pushFactuur' },
  { id: uid('sl'), tijdstip: tijdstip(isoOffset(-14), '17:00'), pakket: 'exact', richting: 'naar_erp', object: 'Uren week ' + weekLabel(isoOffset(-14)).slice(3), status: 'ok', melding: '186,5 goedgekeurde uren geboekt op kostenplaatsen', actie: 'pushUren' },
  { id: uid('sl'), tijdstip: tijdstip(isoOffset(-7), '09:31'), pakket: 'exact', richting: 'naar_erp', object: 'Factuur F-2026-052', objectId: facturen[2].id, status: 'ok', melding: 'Verkoopfactuur aangemaakt (EOL-VF-20260052), btw verlegd, kostenplaats OPD-2026-011', actie: 'pushFactuur' },
  { id: uid('sl'), tijdstip: tijdstip(isoOffset(-6), '08:00'), pakket: 'exact', richting: 'van_erp', object: 'Betaalstatus', status: 'ok', melding: 'F-2026-041 gematcht met bankafschrift (€ 18.900,00) – status betaald', actie: 'haalBetaalstatus' },
  { id: uid('sl'), tijdstip: tijdstip(isoOffset(-3), '08:00'), pakket: 'exact', richting: 'van_erp', object: 'Betaalstatus', status: 'ok', melding: 'F-2026-045 gematcht met bankafschrift (€ 31.363,20) – status betaald', actie: 'haalBetaalstatus' },
  { id: uid('sl'), tijdstip: tijdstip(isoOffset(-2), '15:46'), pakket: 'exact', richting: 'naar_erp', object: 'Factuur F-2026-056', objectId: facturen[3].id, status: 'fout', melding: 'Debiteurnummer 10234 onbekend in administratie – controleer de relatiekaart in Exact Online.', actie: 'pushFactuur' },
]

// Tijdlijn-basisitems per opdracht
for (const o of opdrachten) {
  tl(o.id, o.aangemaaktOp, 'opdracht', `Opdracht ${o.nummer} aangemaakt (${o.contractvorm === 'aanneemsom' ? 'aanneemsom' : 'regie'})`, 'Pieter van der Meulen')
  if (o.status !== 'offerte') tl(o.id, tijdstip(o.startdatum, '07:30'), 'opdracht', `Start uitvoering gepland op locatie ${o.locatie.plaats}`)
  if (o.status === 'opgeleverd' || o.status === 'gefactureerd') tl(o.id, tijdstip(o.einddatum, '16:30'), 'opdracht', 'Opgeleverd aan opdrachtgever')
}

export function maakSeed(): DemoState {
  return {
    versie: SEED_VERSIE,
    bedrijf: BEDRIJF,
    klanten,
    medewerkers,
    artikelen,
    uursoorten,
    opdrachten,
    werkbonnen,
    uren,
    materiaal,
    fotos,
    meerwerk,
    facturen,
    koppelingen,
    syncLog,
    tijdlijn: tijdlijn.sort((a, b) => a.tijdstip.localeCompare(b.tijdstip)),
    tellers: { ...tellers, opdracht: 15 },
  }
}

/** Standaard-medewerker voor de veldrol in de demo */
export const VELD_STANDAARD_MEDEWERKER = 'm_sander'
