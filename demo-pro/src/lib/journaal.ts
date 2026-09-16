import type { Factuur, Klant, KoppelingInstellingen, Opdracht } from '../types'
import { totalen } from './factuur'
import { getal } from './format'

/**
 * CSV-journaalpostexport (verkoopboek). Eén regel per boeking:
 * debiteuren (debet) / omzet per btw-tarief (credit) / af te dragen btw (credit).
 * Kostenplaats = opdrachtnummer (instelbaar per koppeling). Puntkomma-gescheiden,
 * komma als decimaalteken – opent direct goed in Nederlandse Excel en is
 * importeerbaar in de meeste pakketten via een importdefinitie.
 */
export function maakJournaalCsv(facturen: { f: Factuur; o: Opdracht; k: Klant }[], inst: KoppelingInstellingen): string {
  const kop = ['Dagboek', 'Boekstuk', 'Datum', 'Vervaldatum', 'Grootboek', 'Omschrijving', 'Debiteurnummer', 'Debiteur', 'Kostenplaats', 'Btw-code', 'Debet', 'Credit']
  const rijen: (string | number)[][] = []
  for (const { f, o, k } of facturen) {
    const t = totalen(f.regels, f.btwVerlegd)
    const dat = nl(f.datum)
    const verv = nl(f.vervaldatum)
    const kp = inst.kostenplaatsIsOpdracht ? o.nummer : ''
    // Debiteuren debet
    rijen.push([inst.dagboek, f.nummer, dat, verv, inst.grootboekDebiteuren, `${f.nummer} ${k.naam}`, k.debiteurnummer, k.naam, kp, '', bedrag(t.totaal), ''])
    // Omzet credit per btw-tarief
    for (const [pct, g] of t.perBtw) {
      const gb = f.btwVerlegd ? inst.grootboekOmzetVerlegd : inst.grootboekOmzet
      const code = f.btwVerlegd ? 'VERLEGD' : pct === 9 ? 'VH9' : pct === 0 ? 'VH0' : 'VH21'
      rijen.push([inst.dagboek, f.nummer, dat, verv, gb, `${f.omschrijving}${f.btwVerlegd ? ' (btw verlegd)' : ` (${pct}%)`}`, k.debiteurnummer, k.naam, kp, code, '', bedrag(g.grondslag)])
      if (!f.btwVerlegd && g.btw > 0) rijen.push([inst.dagboek, f.nummer, dat, verv, inst.grootboekBtw, `Btw ${pct}% ${f.nummer}`, k.debiteurnummer, k.naam, kp, code, '', bedrag(g.btw)])
    }
  }
  const csv = [kop, ...rijen].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')
  return '﻿' + csv
}

function nl(iso: string) {
  return iso.split('-').reverse().join('-')
}
function bedrag(n: number) {
  return getal(n, 2)
}
