import { ArrowLeft, Check, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Badge, PageHeader, useToast } from '../../components/ui'
import { nieuwId } from '../../data/store'
import { useStore } from '../../data/StoreContext'
import { KOSTENSOORTEN } from '../../lib/calculatie'
import { dagenVooruit, datum, euro, parseNlDatum, parseNlGetal } from '../../lib/format'
import { coordsVoorPlaats } from '../../lib/geo'
import type { CalculatieRegel, Contractvorm, Kostensoort } from '../../types'

type Doel =
  | 'referentie'
  | 'omschrijving'
  | 'klant'
  | 'straat'
  | 'postcode'
  | 'plaats'
  | 'startdatum'
  | 'einddatum'
  | 'contractvorm'
  | 'aanneemsom'
  | 'btw'
  | 'regel_soort'
  | 'regel_omschrijving'
  | 'regel_aantal'
  | 'regel_eenheid'
  | 'regel_kostprijs'
  | 'regel_verkoopprijs'
  | ''

const DOELEN: { code: Doel; label: string; groep: 'opdracht' | 'regel'; verplicht?: boolean; hints: string[] }[] = [
  { code: 'referentie', label: 'Referentie (groepeert regels)', groep: 'opdracht', hints: ['referentie', 'ref', 'projectnr', 'nummer', 'code'] },
  { code: 'omschrijving', label: 'Omschrijving', groep: 'opdracht', verplicht: true, hints: ['omschrijving', 'project', 'naam', 'titel'] },
  { code: 'klant', label: 'Klant', groep: 'opdracht', hints: ['klant', 'opdrachtgever', 'debiteur'] },
  { code: 'straat', label: 'Straat + nr', groep: 'opdracht', hints: ['straat', 'adres'] },
  { code: 'postcode', label: 'Postcode', groep: 'opdracht', hints: ['postcode'] },
  { code: 'plaats', label: 'Plaats', groep: 'opdracht', verplicht: true, hints: ['plaats', 'stad', 'woonplaats', 'locatie'] },
  { code: 'startdatum', label: 'Startdatum', groep: 'opdracht', hints: ['start'] },
  { code: 'einddatum', label: 'Einddatum', groep: 'opdracht', hints: ['eind', 'oplever'] },
  { code: 'contractvorm', label: 'Contractvorm', groep: 'opdracht', hints: ['contract', 'vorm', 'type'] },
  { code: 'aanneemsom', label: 'Aanneemsom', groep: 'opdracht', hints: ['aanneemsom', 'bedrag', 'som', 'prijs'] },
  { code: 'btw', label: 'Btw (21 / 9 / verlegd)', groep: 'opdracht', hints: ['btw'] },
  { code: 'regel_soort', label: 'Kostensoort', groep: 'regel', hints: ['soort', 'kostensoort', 'regel soort'] },
  { code: 'regel_omschrijving', label: 'Regel omschrijving', groep: 'regel', hints: ['regel omschrijving', 'regelomschrijving', 'post', 'activiteit'] },
  { code: 'regel_aantal', label: 'Aantal', groep: 'regel', hints: ['aantal', 'hoeveelheid', 'qty'] },
  { code: 'regel_eenheid', label: 'Eenheid', groep: 'regel', hints: ['eenheid', 'unit'] },
  { code: 'regel_kostprijs', label: 'Kostprijs per eenheid', groep: 'regel', hints: ['kostprijs', 'inkoop', 'kost'] },
  { code: 'regel_verkoopprijs', label: 'Verkoopprijs per eenheid', groep: 'regel', hints: ['verkoopprijs', 'verkoop', 'tarief'] },
]

/** Puntkomma (NL Excel) of komma als scheidingsteken */
function detecteerScheider(tekst: string): string {
  const eerste = tekst.split(/\r?\n/)[0] ?? ''
  return (eerste.match(/;/g)?.length ?? 0) >= (eerste.match(/,/g)?.length ?? 0) ? ';' : ','
}

function autoMap(headers: string[]): Record<number, Doel> {
  const map: Record<number, Doel> = {}
  const gebruikt = new Set<Doel>()
  headers.forEach((h, i) => {
    const k = h.toLowerCase().trim()
    // exacte hints eerst (langste eerst) zodat "regel omschrijving" wint van "omschrijving"
    const kandidaten = DOELEN.filter((d) => !gebruikt.has(d.code)).flatMap((d) => d.hints.map((hint) => ({ d, hint }))).sort((a, b) => b.hint.length - a.hint.length)
    const hit = kandidaten.find(({ hint }) => k === hint || k.includes(hint))
    if (hit) {
      map[i] = hit.d.code
      gebruikt.add(hit.d.code)
    } else map[i] = ''
  })
  return map
}

interface Preview {
  referentie: string
  omschrijving: string
  klantNaam: string
  klantId?: string
  straat: string
  postcode: string
  plaats: string
  startdatum: string
  einddatum: string
  contractvorm: Contractvorm
  aanneemsom?: number
  btw: string
  regels: CalculatieRegel[]
  fouten: string[]
}

export default function OpdrachtImport() {
  const store = useStore()
  const toast = useToast()
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [bestand, setBestand] = useState<string>('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rijen, setRijen] = useState<(string | number)[][]>([])
  const [map, setMap] = useState<Record<number, Doel>>({})
  const [klaar, setKlaar] = useState<string[]>([])

  const lees = async (file: File) => {
    const isCsv = /\.csv$/i.test(file.name)
    // CSV: ruw inlezen (raw), anders maakt SheetJS van "38,00" 3800 en van 05-10-2026 een Amerikaanse datum.
    const wb = isCsv ? XLSX.read(await file.text(), { type: 'string', raw: true, FS: detecteerScheider(await file.text()) }) : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '', raw: isCsv ? true : false })
    const [kop, ...rest] = data.filter((r) => r.some((c) => String(c).trim() !== ''))
    if (!kop) {
      toast('Bestand is leeg', 'bad')
      return
    }
    const h = kop.map(String)
    setBestand(file.name)
    setHeaders(h)
    setRijen(rest)
    setMap(autoMap(h))
    setKlaar([])
  }

  const laadVoorbeeld = async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}voorbeeld-opdrachten.csv`)
    const blob = await res.blob()
    await lees(new File([blob], 'voorbeeld-opdrachten.csv'))
  }

  const kolom = (doel: Doel) => Number(Object.entries(map).find(([, d]) => d === doel)?.[0] ?? -1)

  const preview = useMemo<Preview[]>(() => {
    if (!rijen.length) return []
    const idx = (d: Doel) => kolom(d)
    const cel = (r: (string | number)[], d: Doel) => {
      const i = idx(d)
      return i >= 0 ? String(r[i] ?? '').trim() : ''
    }
    const groepen = new Map<string, Preview>()
    let laatsteKey = ''
    rijen.forEach((r, n) => {
      const ref = cel(r, 'referentie')
      const oms = cel(r, 'omschrijving')
      const key = ref || oms || laatsteKey || `rij_${n}`
      let p = groepen.get(key)
      if (!p) {
        if (!oms && !ref) return // losse regel zonder opdracht
        const klantNaam = cel(r, 'klant')
        const klant = store.getKlanten().find((k) => k.naam.toLowerCase() === klantNaam.toLowerCase() || (klantNaam && k.naam.toLowerCase().includes(klantNaam.toLowerCase())))
        const vormRaw = cel(r, 'contractvorm').toLowerCase()
        const btwRaw = cel(r, 'btw').toLowerCase()
        p = {
          referentie: ref,
          omschrijving: oms,
          klantNaam,
          klantId: klant?.id,
          straat: cel(r, 'straat'),
          postcode: cel(r, 'postcode'),
          plaats: cel(r, 'plaats'),
          startdatum: parseNlDatum(r[idx('startdatum')] as string) || dagenVooruit(14),
          einddatum: parseNlDatum(r[idx('einddatum')] as string) || dagenVooruit(42),
          contractvorm: vormRaw.includes('regie') ? 'regie' : 'aanneemsom',
          aanneemsom: parseNlGetal(cel(r, 'aanneemsom')) || undefined,
          btw: btwRaw.includes('verlegd') ? 'verlegd' : btwRaw.startsWith('9') ? '9' : '21',
          regels: [],
          fouten: [],
        }
        if (!p.omschrijving) p.fouten.push('Omschrijving ontbreekt')
        if (!p.plaats) p.fouten.push('Plaats ontbreekt')
        if (klantNaam && !klant) p.fouten.push(`Klant "${klantNaam}" onbekend – wordt aangemaakt`)
        if (!klantNaam) p.fouten.push('Geen klant – eerste klant wordt gebruikt')
        groepen.set(key, p)
      }
      laatsteKey = key
      const regelOms = cel(r, 'regel_omschrijving')
      if (regelOms) {
        const soortRaw = cel(r, 'regel_soort').toLowerCase()
        const soort = (KOSTENSOORTEN.find((k) => soortRaw.includes(k.code))?.code ?? (soortRaw.includes('onderaan') ? 'onderaanneming' : 'arbeid')) as Kostensoort
        const kost = parseNlGetal(cel(r, 'regel_kostprijs'))
        const verkoop = parseNlGetal(cel(r, 'regel_verkoopprijs')) || Math.round(kost * 1.3 * 100) / 100
        p.regels.push({
          id: nieuwId('cr'),
          type: soort,
          omschrijving: regelOms,
          aantal: parseNlGetal(cel(r, 'regel_aantal')) || 1,
          eenheid: cel(r, 'regel_eenheid') || 'stuk',
          kostprijs: kost,
          verkoopprijs: verkoop,
          opslagPercentage: kost ? Math.round(((verkoop - kost) / kost) * 1000) / 10 : 0,
        })
      }
    })
    return [...groepen.values()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rijen, map, store])

  const geldig = preview.filter((p) => p.omschrijving && p.plaats)

  const importeer = () => {
    const nummers: string[] = []
    for (const p of geldig) {
      let klantId = p.klantId
      if (!klantId) {
        if (p.klantNaam) {
          const k = { id: nieuwId('k'), naam: p.klantNaam, kvk: '', adres: { straat: '', postcode: '', plaats: p.plaats }, contactpersoon: '', email: '', debiteurnummer: String(11000 + Math.floor(Math.random() * 900)), soort: 'overig' as const }
          store.saveKlant(k)
          klantId = k.id
        } else klantId = store.getKlanten()[0].id
      }
      const totVerkoop = p.regels.reduce((s, r) => s + r.aantal * r.verkoopprijs, 0)
      const o = store.createOpdracht({
        klantId,
        omschrijving: p.omschrijving,
        toelichting: p.referentie ? `Geïmporteerd uit ${bestand} (referentie ${p.referentie})` : `Geïmporteerd uit ${bestand}`,
        locatie: { straat: p.straat, postcode: p.postcode, plaats: p.plaats, ...coordsVoorPlaats(p.plaats) },
        status: 'gepland',
        startdatum: p.startdatum,
        einddatum: p.einddatum,
        contractvorm: p.contractvorm,
        aanneemsom: p.contractvorm === 'aanneemsom' ? (p.aanneemsom ?? totVerkoop) : undefined,
        voorcalculatie: p.regels,
        btwVerlegd: p.btw === 'verlegd',
        btwPercentage: p.btw === '9' ? 9 : 21,
        documenten: [{ id: nieuwId('doc'), naam: bestand, type: 'overig', datum: new Date().toISOString() }],
        projectleiderId: 'm_pieter',
        voortgang: 0,
      })
      nummers.push(o.nummer)
    }
    setKlaar(nummers)
    toast(`${nummers.length} opdracht(en) geïmporteerd`, 'good')
  }

  return (
    <div className="max-w-6xl" data-tour="import">
      <Link to="/beheer/opdrachten" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-3 hover:text-ink mb-3">
        <ArrowLeft size={13} /> Opdrachten
      </Link>
      <PageHeader
        eyebrow="Opdracht inladen"
        titel="Importeren uit Excel of CSV"
        sub="Eén rij per calculatieregel; rijen met dezelfde referentie vormen samen één opdracht met voorcalculatie."
        acties={
          <a href={`${import.meta.env.BASE_URL}voorbeeld-opdrachten.csv`} download className="btn-outline btn-sm">
            <Download size={13} /> Voorbeeld-CSV
          </a>
        }
      />

      {klaar.length > 0 && (
        <div className="card p-4 mb-4 bg-green-50/60 border-good/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[13.5px]">
            <Check size={14} className="inline text-good mr-1" /> Geïmporteerd: <span className="font-semibold">{klaar.join(', ')}</span>
          </div>
          <button className="btn-ink btn-sm" onClick={() => nav('/beheer/opdrachten')}>
            Naar opdrachten
          </button>
        </div>
      )}

      {/* Stap 1: bestand */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-full bg-ink text-white text-[11px] font-bold inline-flex items-center justify-center">1</span>
          <div className="font-tight font-semibold text-[15px]">Bestand kiezen</div>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && lees(e.target.files[0])} />
        <div className="flex flex-wrap gap-2 items-center">
          <button className="btn-outline" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Upload CSV of Excel
          </button>
          <button className="btn-ghost" onClick={laadVoorbeeld}>
            <FileSpreadsheet size={15} /> Gebruik het voorbeeldbestand
          </button>
          {bestand && (
            <span className="text-[13px] text-ink-3 ml-2">
              <span className="font-semibold text-ink">{bestand}</span> · {rijen.length} rijen · {headers.length} kolommen
            </span>
          )}
        </div>
      </div>

      {headers.length > 0 && (
        <>
          {/* Stap 2: kolomtoewijzing */}
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-ink text-white text-[11px] font-bold inline-flex items-center justify-center">2</span>
              <div className="font-tight font-semibold text-[15px]">Kolommen toewijzen</div>
              <span className="text-[12px] text-ink-3">Automatisch herkend; pas aan waar nodig.</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-2 border border-line rounded-[10px] px-3 py-2 bg-bg/40">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold truncate">{h || `Kolom ${i + 1}`}</div>
                    <div className="text-[11px] text-ink-4 truncate">bv. {String(rijen.find((r) => String(r[i]).trim())?.[i] ?? '—')}</div>
                  </div>
                  <select className="input !w-[170px] !py-1 text-[12px]" value={map[i] ?? ''} onChange={(e) => setMap({ ...map, [i]: e.target.value as Doel })}>
                    <option value="">— overslaan —</option>
                    <optgroup label="Opdracht">
                      {DOELEN.filter((d) => d.groep === 'opdracht').map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.label}
                          {d.verplicht ? ' *' : ''}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Voorcalculatieregel">
                      {DOELEN.filter((d) => d.groep === 'regel').map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              ))}
            </div>
            {(kolom('omschrijving') < 0 || kolom('plaats') < 0) && <div className="text-[12.5px] text-bad mt-3">Wijs minimaal de kolommen Omschrijving en Plaats toe.</div>}
          </div>

          {/* Stap 3: preview */}
          <div className="card overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-line flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-ink text-white text-[11px] font-bold inline-flex items-center justify-center">3</span>
                <div className="font-tight font-semibold text-[15px]">Voorbeeld ({preview.length} opdrachten)</div>
              </div>
              <button className="btn-ink btn-sm" disabled={geldig.length === 0 || klaar.length > 0} onClick={importeer}>
                <Check size={14} /> {geldig.length} opdracht(en) importeren
              </button>
            </div>
            {preview.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-ink-3">Nog geen opdrachten herkend – controleer de kolomtoewijzing.</div>
            ) : (
              <div className="divide-y divide-line">
                {preview.map((p, i) => {
                  const totKost = p.regels.reduce((s, r) => s + r.aantal * r.kostprijs, 0)
                  const totVerkoop = p.regels.reduce((s, r) => s + r.aantal * r.verkoopprijs, 0)
                  const ok = p.omschrijving && p.plaats
                  return (
                    <div key={i} className="p-4 grid lg:grid-cols-[1fr_1.2fr] gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.referentie && <span className="text-[12px] font-bold tabular text-ink-3">{p.referentie}</span>}
                          <Badge label={p.contractvorm === 'aanneemsom' ? 'Aanneemsom' : 'Regie'} kleur="bg-bg-2 text-ink-2" />
                          <Badge label={p.btw === 'verlegd' ? 'btw verlegd' : `btw ${p.btw}%`} kleur="bg-bg-2 text-ink-2" />
                          {ok ? <Badge label="Klaar voor import" kleur="bg-green-50 text-good" /> : <Badge label="Onvolledig" kleur="bg-red-50 text-bad" />}
                        </div>
                        <div className="font-semibold text-[15px] mt-1">{p.omschrijving || <span className="text-bad">(geen omschrijving)</span>}</div>
                        <div className="text-[12.5px] text-ink-3 mt-0.5">
                          {p.klantNaam || '—'} · {[p.straat, p.postcode, p.plaats].filter(Boolean).join(', ') || <span className="text-bad">geen locatie</span>}
                        </div>
                        <div className="text-[12.5px] text-ink-3 tabular">
                          {datum(p.startdatum)} – {datum(p.einddatum)}
                          {p.aanneemsom ? ` · aanneemsom ${euro(p.aanneemsom)}` : ''}
                        </div>
                        {p.fouten.length > 0 && (
                          <ul className="mt-2 text-[12px] text-warn list-disc ml-4">
                            {p.fouten.map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        {p.regels.length === 0 ? (
                          <div className="text-[12.5px] text-ink-4">Geen voorcalculatieregels in het bestand.</div>
                        ) : (
                          <table className="w-full text-[12.5px]">
                            <tbody>
                              {p.regels.map((r) => (
                                <tr key={r.id} className="border-b border-line last:border-b-0">
                                  <td className="py-1 pr-2 text-ink-3 whitespace-nowrap">{KOSTENSOORTEN.find((k) => k.code === r.type)?.naam.split(' ')[0]}</td>
                                  <td className="py-1 pr-2">{r.omschrijving}</td>
                                  <td className="py-1 pr-2 text-right tabular whitespace-nowrap">
                                    {r.aantal} {r.eenheid}
                                  </td>
                                  <td className="py-1 pr-2 text-right tabular text-ink-3">{euro(r.kostprijs)}</td>
                                  <td className="py-1 text-right tabular font-semibold">{euro(r.aantal * r.verkoopprijs)}</td>
                                </tr>
                              ))}
                              <tr>
                                <td colSpan={3} className="pt-1.5 font-semibold">
                                  Totaal
                                </td>
                                <td className="pt-1.5 text-right tabular text-ink-3">{euro(totKost)}</td>
                                <td className="pt-1.5 text-right tabular font-bold">{euro(totVerkoop)}</td>
                              </tr>
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {headers.length === 0 && (
        <div className="card p-5 text-[13px] text-ink-2">
          <div className="font-semibold mb-1">Verwachte kolommen</div>
          <p className="text-ink-3 leading-relaxed">
            Opdracht: <span className="font-medium text-ink">Referentie, Omschrijving*, Klant, Straat, Postcode, Plaats*, Startdatum, Einddatum, Contractvorm (aanneemsom/regie), Aanneemsom, Btw (21/9/verlegd)</span>. Voorcalculatie per rij:{' '}
            <span className="font-medium text-ink">Regel soort (arbeid/materiaal/materieel/onderaanneming), Regel omschrijving, Aantal, Eenheid, Kostprijs, Verkoopprijs</span>. Kolomnamen mogen afwijken – je wijst ze in stap 2 toe. Datums als dd-mm-jjjj, bedragen met komma.
          </p>
        </div>
      )}
    </div>
  )
}
