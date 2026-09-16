import { AlertTriangle, Check, CheckSquare, Download, MapPin, Pencil, Square } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStore } from '../../data/StoreContext'
import { afwijkingen, kostVanUren, UURSOORT_LABEL, urenVanRegel, verkoopVanUren } from '../../lib/calculatie'
import { datumKort, euro, getal, urenLabel, vandaag } from '../../lib/format'
import { afstandLabel, afstandMeters } from '../../lib/geo'
import { downloadBestand } from '../../lib/image'
import type { ID, Urenregel, Uursoort } from '../../types'
import { Avatar, Badge, Leeg, Modal, useToast, Veld } from '../ui'

export function UrenTabel({ uren, toonOpdracht = true, toonMedewerker = true, alleenAfwijkingen = false }: { uren: Urenregel[]; toonOpdracht?: boolean; toonMedewerker?: boolean; alleenAfwijkingen?: boolean }) {
  const store = useStore()
  const toast = useToast()
  const [sel, setSel] = useState<Set<ID>>(new Set())
  const [bewerk, setBewerk] = useState<Urenregel | null>(null)
  const vd = vandaag()

  const rijen = useMemo(
    () =>
      uren
        .map((u) => ({ u, afw: afwijkingen(u, store.getOpdracht(u.opdrachtId), vd) }))
        .filter((r) => !alleenAfwijkingen || r.afw.length > 0)
        .sort((a, b) => b.u.datum.localeCompare(a.u.datum) || a.u.start.localeCompare(b.u.start)),
    [uren, alleenAfwijkingen, store, vd],
  )

  const openIds = rijen.filter((r) => !r.u.goedgekeurd && r.u.eind).map((r) => r.u.id)
  const alleGeselecteerd = openIds.length > 0 && openIds.every((id) => sel.has(id))
  const toggleAlle = () => setSel(alleGeselecteerd ? new Set() : new Set(openIds))
  const toggle = (id: ID) => {
    const n = new Set(sel)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    setSel(n)
  }
  const keurGoed = (ids: ID[]) => {
    store.keurUrenGoed(ids)
    setSel(new Set())
    toast(`${ids.length} urenregel(s) goedgekeurd`, 'good')
  }
  const exporteer = () => {
    const kop = ['Datum', 'Medewerker', 'Bedrijf', 'Opdracht', 'Werkbon', 'Start', 'Eind', 'Pauze (min)', 'Uren', 'Uursoort', 'Kostprijs', 'Verkoop', 'Goedgekeurd', 'Afwijkingen']
    const regels = rijen.map(({ u, afw }) => {
      const mw = store.getMedewerker(u.medewerkerId)
      const o = store.getOpdracht(u.opdrachtId)
      const wb = store.getWerkbon(u.werkbonId)
      return [u.datum.split('-').reverse().join('-'), mw?.naam, mw?.bedrijf, o?.nummer, wb?.nummer, u.start, u.eind ?? '', u.pauzeMinuten, getal(urenVanRegel(u)), UURSOORT_LABEL[u.uursoort], getal(kostVanUren(u, mw)), getal(verkoopVanUren(u, mw)), u.goedgekeurd ? 'ja' : 'nee', afw.map((a) => a.tekst).join('; ')]
    })
    const csv = [kop, ...regels].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')
    downloadBestand(`uren-export-${vd}.csv`, '﻿' + csv, 'text/csv;charset=utf-8')
    toast('CSV-export gedownload', 'good')
  }

  const totaal = rijen.reduce((s, r) => s + urenVanRegel(r.u), 0)

  if (rijen.length === 0) return <Leeg titel={alleenAfwijkingen ? 'Geen afwijkingen' : 'Geen uren'} tekst={alleenAfwijkingen ? 'Alle urenregels in deze selectie zijn compleet en binnen de normen.' : 'Er zijn in deze selectie geen urenregels.'} />

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="text-[12.5px] text-ink-3">
          {rijen.length} regels · <span className="font-semibold text-ink tabular">{urenLabel(totaal)}</span> uur
          {openIds.length > 0 && <> · {openIds.length} nog goed te keuren</>}
        </div>
        <div className="flex gap-1.5">
          <button className="btn-outline btn-sm" onClick={exporteer}>
            <Download size={13} /> CSV
          </button>
          {sel.size > 0 ? (
            <button className="btn-ink btn-sm" onClick={() => keurGoed([...sel])} data-tour="uren-bulk">
              <Check size={13} /> {sel.size} geselecteerde goedkeuren
            </button>
          ) : (
            openIds.length > 0 && (
              <button className="btn-ink btn-sm" onClick={() => keurGoed(openIds)} data-tour="uren-bulk">
                <Check size={13} /> Alle {openIds.length} goedkeuren
              </button>
            )
          )}
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr>
                <th className="th w-8">
                  <button onClick={toggleAlle} className="cursor-pointer text-ink-3 align-middle" aria-label="Alles selecteren">
                    {alleGeselecteerd ? <CheckSquare size={15} /> : <Square size={15} />}
                  </button>
                </th>
                <th className="th">Datum</th>
                {toonMedewerker && <th className="th">Medewerker</th>}
                {toonOpdracht && <th className="th">Opdracht / werkbon</th>}
                <th className="th">Tijden</th>
                <th className="th text-right">Uren</th>
                <th className="th">Uursoort</th>
                <th className="th">GPS</th>
                <th className="th">Afwijking</th>
                <th className="th">Status</th>
                <th className="th w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rijen.map(({ u, afw }) => {
                const mw = store.getMedewerker(u.medewerkerId)
                const o = store.getOpdracht(u.opdrachtId)
                const wb = store.getWerkbon(u.werkbonId)
                const afst = u.checkIn && o ? afstandMeters(u.checkIn, o.locatie) : null
                const kanSel = !u.goedgekeurd && !!u.eind
                return (
                  <tr key={u.id} className={`${afw.length ? 'bg-amber-50/40' : ''} ${sel.has(u.id) ? 'bg-accent/[0.04]' : ''}`}>
                    <td className="td">
                      {kanSel && (
                        <button onClick={() => toggle(u.id)} className="cursor-pointer text-ink-3 align-middle" aria-label="Selecteren">
                          {sel.has(u.id) ? <CheckSquare size={15} className="text-accent" /> : <Square size={15} />}
                        </button>
                      )}
                    </td>
                    <td className="td tabular whitespace-nowrap text-ink-2">{datumKort(u.datum)}</td>
                    {toonMedewerker && (
                      <td className="td whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar mw={mw} size={24} />
                          <div>
                            <div className="text-[13px] font-medium leading-tight">{mw?.naam}</div>
                            {mw?.soort === 'onderaannemer' && <div className="text-[10.5px] text-ink-3">{mw.bedrijf}</div>}
                          </div>
                        </div>
                      </td>
                    )}
                    {toonOpdracht && (
                      <td className="td whitespace-nowrap">
                        <div className="text-[12.5px] font-semibold">{o?.nummer}</div>
                        <div className="text-[11.5px] text-ink-3">{wb?.nummer} · {wb?.omschrijving.slice(0, 34)}{(wb?.omschrijving.length ?? 0) > 34 ? '…' : ''}</div>
                      </td>
                    )}
                    <td className="td tabular whitespace-nowrap text-[12.5px]">
                      {u.start} – {u.eind ?? <span className="text-accent font-semibold">…</span>}
                      {u.pauzeMinuten > 0 && <span className="text-ink-4"> · {u.pauzeMinuten}m</span>}
                    </td>
                    <td className="td text-right tabular font-semibold">{u.eind ? urenLabel(urenVanRegel(u)) : '—'}</td>
                    <td className="td text-[12px] text-ink-2 whitespace-nowrap">{UURSOORT_LABEL[u.uursoort]}</td>
                    <td className="td text-[12px] whitespace-nowrap">
                      {afst !== null ? (
                        <span className={`inline-flex items-center gap-1 ${afst > 250 ? 'text-bad font-semibold' : 'text-ink-3'}`}>
                          <MapPin size={11} /> {afstandLabel(afst)} · ±{u.checkIn!.nauwkeurigheid} m
                        </span>
                      ) : (
                        <span className="text-ink-4">—</span>
                      )}
                    </td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1">
                        {afw.map((a) => (
                          <span key={a.type} className="pill bg-amber-50 text-warn inline-flex items-center gap-1">
                            <AlertTriangle size={10} /> {a.tekst}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="td">{u.goedgekeurd ? <Badge label="Goedgekeurd" kleur="bg-green-50 text-good" /> : u.eind ? <Badge label="Te keuren" kleur="bg-bg-2 text-ink-2" /> : <Badge label="Ingecheckt" kleur="bg-accent-soft text-accent" />}</td>
                    <td className="td">
                      <button className="w-7 h-7 rounded-[8px] hover:bg-bg-2 flex items-center justify-center cursor-pointer text-ink-3" onClick={() => setBewerk(u)} aria-label="Bewerken">
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {bewerk && <UrenregelModal regel={bewerk} onClose={() => setBewerk(null)} />}
    </>
  )
}

export function UrenregelModal({ regel, onClose }: { regel: Urenregel; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const [u, setU] = useState<Urenregel>({ ...regel })
  const mw = store.getMedewerker(u.medewerkerId)
  const opslaan = () => {
    store.saveUrenregel(u)
    toast('Urenregel opgeslagen', 'good')
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      titel={`Urenregel – ${mw?.naam ?? ''}`}
      footer={
        <>
          <button
            className="btn-ghost btn-sm text-bad mr-auto"
            onClick={() => {
              store.deleteUrenregel(u.id)
              onClose()
              toast('Urenregel verwijderd')
            }}
          >
            Verwijderen
          </button>
          <button className="btn-outline btn-sm" onClick={onClose}>
            Annuleren
          </button>
          <button className="btn-ink btn-sm" onClick={opslaan}>
            Opslaan
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Veld label="Datum">
          <input type="date" className="input" value={u.datum} onChange={(e) => setU({ ...u, datum: e.target.value })} />
        </Veld>
        <Veld label="Uursoort">
          <select className="input" value={u.uursoort} onChange={(e) => setU({ ...u, uursoort: e.target.value as Uursoort })}>
            {(Object.keys(UURSOORT_LABEL) as Uursoort[]).map((k) => (
              <option key={k} value={k}>
                {UURSOORT_LABEL[k]}
              </option>
            ))}
          </select>
        </Veld>
        <Veld label="Start">
          <input type="time" className="input" value={u.start} onChange={(e) => setU({ ...u, start: e.target.value })} />
        </Veld>
        <Veld label="Eind">
          <input type="time" className="input" value={u.eind ?? ''} onChange={(e) => setU({ ...u, eind: e.target.value || undefined })} />
        </Veld>
        <Veld label="Pauze (minuten)">
          <input type="number" className="input" value={u.pauzeMinuten} min={0} step={5} onChange={(e) => setU({ ...u, pauzeMinuten: Number(e.target.value) })} />
        </Veld>
        <Veld label="Goedgekeurd">
          <select className="input" value={u.goedgekeurd ? 'ja' : 'nee'} onChange={(e) => setU({ ...u, goedgekeurd: e.target.value === 'ja' })}>
            <option value="nee">Nee</option>
            <option value="ja">Ja</option>
          </select>
        </Veld>
        <Veld label="Toelichting" className="col-span-2">
          <input className="input" value={u.toelichting ?? ''} onChange={(e) => setU({ ...u, toelichting: e.target.value })} placeholder="Bijv. reden voor lange dag" />
        </Veld>
      </div>
      <div className="text-[12.5px] text-ink-3 mt-3 tabular">
        {u.eind ? `${urenLabel(urenVanRegel(u))} uur · kostprijs ${euro(kostVanUren(u, mw))} · verkoop ${euro(verkoopVanUren(u, mw))}` : 'Nog niet uitgecheckt'}
      </div>
    </Modal>
  )
}
