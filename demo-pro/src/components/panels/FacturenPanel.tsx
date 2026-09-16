import { FileText, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../data/StoreContext'
import { ERP_STATUS, FACTUUR_STATUS, FACTUUR_TYPE, berekenNacalculatie } from '../../lib/calculatie'
import { maakFactuur, maakFactuurVoorstel, totalen } from '../../lib/factuur'
import { dagenTerug, datum, euro, getal, vandaag } from '../../lib/format'
import type { Factuur, FactuurType, ID } from '../../types'
import { Badge, Leeg, Modal, useToast, Veld } from '../ui'

export function FacturenTabel({ facturen, toonOpdracht = false }: { facturen: Factuur[]; toonOpdracht?: boolean }) {
  const store = useStore()
  const nav = useNavigate()
  const lijst = [...facturen].sort((a, b) => b.nummer.localeCompare(a.nummer))
  if (lijst.length === 0) return <Leeg titel="Nog geen facturen" tekst="Genereer een factuur vanuit de opdracht: termijn, regie, meerwerk of eindafrekening." />
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr>
              <th className="th">Nummer</th>
              <th className="th">Datum</th>
              {toonOpdracht && <th className="th">Opdracht / klant</th>}
              <th className="th">Type</th>
              <th className="th">Omschrijving</th>
              <th className="th text-right">Excl. btw</th>
              <th className="th text-right">Btw</th>
              <th className="th text-right">Totaal</th>
              <th className="th">Status</th>
              <th className="th">ERP</th>
            </tr>
          </thead>
          <tbody>
            {lijst.map((f) => {
              const o = store.getOpdracht(f.opdrachtId)
              const k = store.getKlant(f.klantId)
              const st = FACTUUR_STATUS[f.status]
              const erp = ERP_STATUS[f.erpStatus]
              const teLaat = f.status === 'verzonden' && f.vervaldatum < vandaag()
              return (
                <tr key={f.id} className="hover:bg-accent/[0.03] cursor-pointer" onClick={() => nav(`/beheer/facturatie/${f.id}`)}>
                  <td className="td font-semibold tabular whitespace-nowrap">{f.nummer}</td>
                  <td className="td tabular text-ink-2 whitespace-nowrap">
                    {datum(f.datum)}
                    {teLaat && <div className="text-[10.5px] text-bad font-semibold">vervallen {datum(f.vervaldatum)}</div>}
                  </td>
                  {toonOpdracht && (
                    <td className="td whitespace-nowrap">
                      <div className="text-[12.5px] font-semibold">{o?.nummer}</div>
                      <div className="text-[11.5px] text-ink-3">{k?.naam}</div>
                    </td>
                  )}
                  <td className="td text-[12.5px] whitespace-nowrap">{FACTUUR_TYPE[f.type]}</td>
                  <td className="td">
                    <div className="max-w-[280px] truncate">{f.omschrijving}</div>
                    {f.btwVerlegd && <span className="text-[10px] font-bold text-ink-3 uppercase">btw verlegd</span>}
                  </td>
                  <td className="td text-right tabular">{euro(f.subtotaal)}</td>
                  <td className="td text-right tabular text-ink-2">{euro(f.btw)}</td>
                  <td className="td text-right tabular font-semibold">{euro(f.totaal)}</td>
                  <td className="td">
                    <Badge label={st.label} kleur={st.kleur} />
                  </td>
                  <td className="td">
                    <Badge label={erp.label} kleur={erp.kleur} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Factuur genereren vanuit een opdracht */
export function NieuweFactuurModal({ open, onClose, opdrachtId }: { open: boolean; onClose: () => void; opdrachtId?: ID }) {
  const store = useStore()
  const toast = useToast()
  const nav = useNavigate()
  const opdrachten = store.getOpdrachten().filter((o) => o.status !== 'offerte')
  const [opd, setOpd] = useState(opdrachtId ?? '')
  const o = store.getOpdracht(opd)
  const [type, setType] = useState<FactuurType>(o?.contractvorm === 'regie' ? 'regie' : 'termijn')
  const [pct, setPct] = useState<number | undefined>(undefined)
  const [van, setVan] = useState(dagenTerug(28))
  const [tot, setTot] = useState(vandaag())

  const kiesOpdracht = (id: string) => {
    setOpd(id)
    const x = store.getOpdracht(id)
    setType(x?.contractvorm === 'regie' ? 'regie' : 'termijn')
    setPct(undefined)
  }

  const voorstel = useMemo(() => (o ? maakFactuurVoorstel(store, o.id, type, { termijnPct: pct, van, tot }) : null), [store, o, type, pct, van, tot])
  const nc = o ? berekenNacalculatie(store, o.id) : undefined
  const eerderPct = o?.aanneemsom
    ? Math.round((store.getFacturen({ opdrachtId: o.id }).flatMap((f) => f.regels).filter((r) => r.bron?.type === 'termijn').reduce((s, r) => s + r.bedrag, 0) / o.aanneemsom) * 100)
    : 0
  const t = voorstel && o ? totalen(voorstel.regels, o.btwVerlegd) : null

  const genereer = () => {
    if (!o || !voorstel || voorstel.regels.length === 0) return
    const f = maakFactuur(store, o.id, voorstel)
    toast(`Factuur ${f.nummer} aangemaakt als concept`, 'good')
    onClose()
    nav(`/beheer/facturatie/${f.id}`)
  }

  const typen: { code: FactuurType; label: string; uitleg: string; kan: boolean }[] = o
    ? [
        { code: 'termijn', label: 'Termijnfactuur', uitleg: 'Percentage van de aanneemsom op basis van voortgang', kan: o.contractvorm === 'aanneemsom' },
        { code: 'eindafrekening', label: 'Eindafrekening', uitleg: 'Restant van de aanneemsom + akkoord meerwerk', kan: o.contractvorm === 'aanneemsom' },
        { code: 'regie', label: 'Regiefactuur', uitleg: 'Goedgekeurde uren × verkooptarief + materiaal', kan: o.contractvorm === 'regie' },
        { code: 'meerwerk', label: 'Meerwerkfactuur', uitleg: 'Alleen akkoord gegeven meerwerk', kan: true },
      ]
    : []

  return (
    <Modal
      open={open}
      onClose={onClose}
      breed
      titel="Factuur genereren"
      footer={
        <>
          <button className="btn-outline btn-sm" onClick={onClose}>
            Annuleren
          </button>
          <button className="btn-ink btn-sm" disabled={!voorstel || voorstel.regels.length === 0 || (t?.subtotaal ?? 0) <= 0} onClick={genereer} data-tour="factuur-genereer">
            <FileText size={14} /> Conceptfactuur aanmaken
          </button>
        </>
      }
    >
      <div className="grid md:grid-cols-[300px_1fr] gap-5">
        <div className="grid gap-3 content-start">
          <Veld label="Opdracht">
            <select className="input" value={opd} onChange={(e) => kiesOpdracht(e.target.value)} disabled={!!opdrachtId}>
              <option value="">Kies opdracht…</option>
              {opdrachten.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nummer} – {x.omschrijving}
                </option>
              ))}
            </select>
          </Veld>
          {o && (
            <>
              <div>
                <span className="label">Factuurtype</span>
                <div className="grid gap-1.5">
                  {typen
                    .filter((x) => x.kan)
                    .map((x) => (
                      <button key={x.code} onClick={() => setType(x.code)} className={`text-left rounded-[10px] border px-3 py-2 cursor-pointer transition ${type === x.code ? 'border-ink bg-ink text-white' : 'border-line bg-paper hover:border-line-2'}`}>
                        <div className="text-[13px] font-semibold">{x.label}</div>
                        <div className={`text-[11.5px] ${type === x.code ? 'text-white/70' : 'text-ink-3'}`}>{x.uitleg}</div>
                      </button>
                    ))}
                </div>
              </div>
              {type === 'termijn' && (
                <Veld label="Termijnpercentage" hint={`Voortgang ${o.voortgang}% · aanneemsom ${euro(o.aanneemsom ?? 0)}`}>
                  <div className="flex items-center gap-2">
                    <input type="number" className="input" min={1} max={100} value={pct ?? Math.max(0, o.voortgang - eerderPct)} onChange={(e) => setPct(Number(e.target.value))} />
                    <span className="text-[13px] text-ink-3">%</span>
                  </div>
                </Veld>
              )}
              {type === 'regie' && (
                <div className="grid grid-cols-2 gap-2">
                  <Veld label="Van">
                    <input type="date" className="input" value={van} onChange={(e) => setVan(e.target.value)} />
                  </Veld>
                  <Veld label="Tot en met">
                    <input type="date" className="input" value={tot} onChange={(e) => setTot(e.target.value)} />
                  </Veld>
                </div>
              )}
              <div className="text-[12px] text-ink-3 card p-3">
                <div>
                  <span className="font-semibold text-ink">{store.getKlant(o.klantId)?.naam}</span> · debiteur {store.getKlant(o.klantId)?.debiteurnummer}
                </div>
                <div className="mt-1">
                  {o.btwVerlegd ? 'Btw verlegd (art. 12 lid 5 Wet OB / onderaanneming)' : `Btw ${o.btwPercentage}%`} · te factureren volgens calculatie: <span className="font-semibold text-ink tabular">{euro(nc?.teFactureren ?? 0)}</span>
                </div>
              </div>
            </>
          )}
        </div>
        <div>
          {!o ? (
            <div className="card p-8 text-center text-[13px] text-ink-3">Kies eerst een opdracht.</div>
          ) : voorstel && voorstel.regels.length === 0 ? (
            <div className="card p-8 text-center text-[13px] text-ink-3">{voorstel.toelichting}</div>
          ) : (
            voorstel &&
            t && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-line">
                  <div className="font-semibold text-[14px]">{voorstel.omschrijving}</div>
                  <div className="text-[12px] text-ink-3 mt-0.5">{voorstel.toelichting}</div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">Omschrijving</th>
                      <th className="th text-right">Aantal</th>
                      <th className="th text-right">Prijs</th>
                      <th className="th text-right">Bedrag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voorstel.regels.map((r) => (
                      <tr key={r.id}>
                        <td className="td text-[13px]">
                          {r.omschrijving}
                          {r.bron?.type === 'meerwerk' && <span className="ml-1.5 pill bg-violet-50 text-violet-700">meerwerk</span>}
                        </td>
                        <td className="td text-right tabular text-[12.5px] whitespace-nowrap">
                          {getal(r.aantal, r.aantal % 1 ? 2 : 0)} {r.eenheid}
                        </td>
                        <td className="td text-right tabular text-[12.5px]">{euro(r.prijs)}</td>
                        <td className="td text-right tabular font-semibold">{euro(r.bedrag)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-line text-[13px] grid gap-1 justify-end text-right">
                  <div className="flex justify-between gap-8">
                    <span className="text-ink-3">Subtotaal</span>
                    <span className="tabular">{euro(t.subtotaal)}</span>
                  </div>
                  {o.btwVerlegd ? (
                    <div className="flex justify-between gap-8">
                      <span className="text-ink-3">Btw verlegd</span>
                      <span className="tabular">{euro(0)}</span>
                    </div>
                  ) : (
                    [...t.perBtw.entries()].map(([p, g]) => (
                      <div key={p} className="flex justify-between gap-8">
                        <span className="text-ink-3">Btw {p}% over {euro(g.grondslag)}</span>
                        <span className="tabular">{euro(g.btw)}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between gap-8 font-bold text-[15px]">
                    <span>Totaal</span>
                    <span className="tabular">{euro(t.totaal)}</span>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </Modal>
  )
}

export function NieuweFactuurKnop({ opdrachtId, label = 'Factuur genereren' }: { opdrachtId?: ID; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn-ink btn-sm" onClick={() => setOpen(true)} data-tour="factuur-nieuw">
        <Plus size={14} /> {label}
      </button>
      {open && <NieuweFactuurModal open onClose={() => setOpen(false)} opdrachtId={opdrachtId} />}
    </>
  )
}
