import { Check, CheckSquare, MapPin, Plus, Square, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../data/StoreContext'
import { urenVanRegel, WERKBON_STATUS } from '../../lib/calculatie'
import { datum, datumKort, datumTijd, euro, getal, urenLabel, vandaag } from '../../lib/format'
import type { ID, Werkbon, WerkbonStatus } from '../../types'
import { FotoGrid } from '../FotoGrid'
import { Avatar, Badge, Leeg, Modal, Rij, useToast, Veld } from '../ui'

export function WerkbonnenTabel({ werkbonnen, toonOpdracht = false, onNieuw }: { werkbonnen: Werkbon[]; toonOpdracht?: boolean; onNieuw?: () => void }) {
  const store = useStore()
  const [open, setOpen] = useState<ID | null>(null)
  const lijst = [...werkbonnen].sort((a, b) => b.datum.localeCompare(a.datum) || a.nummer.localeCompare(b.nummer))

  if (lijst.length === 0)
    return (
      <Leeg
        titel="Geen werkbonnen"
        tekst="Maak een werkbon aan om werk in te plannen voor een medewerker."
        actie={
          onNieuw && (
            <button className="btn-ink btn-sm" onClick={onNieuw}>
              <Plus size={14} /> Werkbon aanmaken
            </button>
          )
        }
      />
    )

  return (
    <>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr>
                <th className="th">Nummer</th>
                <th className="th">Datum</th>
                {toonOpdracht && <th className="th">Opdracht</th>}
                <th className="th">Werkzaamheden</th>
                <th className="th">Medewerkers</th>
                <th className="th text-right">Uren</th>
                <th className="th">Checklist</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {lijst.map((w) => {
                const uren = store.getUren({ werkbonId: w.id }).reduce((s, u) => s + urenVanRegel(u), 0)
                const o = store.getOpdracht(w.opdrachtId)
                const gedaan = w.checklist.filter((c) => c.gedaan).length
                const st = WERKBON_STATUS[w.status]
                return (
                  <tr key={w.id} className={`hover:bg-accent/[0.03] cursor-pointer ${w.datum === vandaag() ? 'bg-accent/[0.02]' : ''}`} onClick={() => setOpen(w.id)}>
                    <td className="td font-semibold tabular whitespace-nowrap">{w.nummer}</td>
                    <td className="td tabular whitespace-nowrap text-ink-2">{datumKort(w.datum)}</td>
                    {toonOpdracht && (
                      <td className="td whitespace-nowrap">
                        <div className="text-[12px] font-semibold">{o?.nummer}</div>
                        <div className="text-[11.5px] text-ink-3 max-w-[180px] truncate">{o?.omschrijving}</div>
                      </td>
                    )}
                    <td className="td">
                      <div className="max-w-[320px] truncate font-medium">{w.omschrijving}</div>
                      {w.handtekeningKlant && <div className="text-[11px] text-good font-semibold">✓ Getekend door klant</div>}
                    </td>
                    <td className="td">
                      <div className="flex -space-x-1.5">
                        {w.toegewezenAan.map((id) => (
                          <Avatar key={id} mw={store.getMedewerker(id)} size={26} />
                        ))}
                      </div>
                    </td>
                    <td className="td text-right tabular text-ink-2">{uren ? urenLabel(uren) : '—'}</td>
                    <td className="td text-[12px] text-ink-3 tabular whitespace-nowrap">
                      {gedaan}/{w.checklist.length}
                    </td>
                    <td className="td">
                      <Badge label={st.label} kleur={st.kleur} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {open && <WerkbonModal id={open} onClose={() => setOpen(null)} />}
    </>
  )
}

/** Detailweergave van een werkbon voor de projectleider, incl. goedkeuren */
export function WerkbonModal({ id, onClose }: { id: ID; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const nav = useNavigate()
  const [verwijder, setVerwijder] = useState(false)
  const w = store.getWerkbon(id)
  if (!w) return null
  const o = store.getOpdracht(w.opdrachtId)
  const uren = store.getUren({ werkbonId: id })
  const materiaal = store.getMateriaal({ werkbonId: id })
  const fotos = store.getFotos({ werkbonId: id })
  const meerwerk = store.getMeerwerk({ werkbonId: id })
  const st = WERKBON_STATUS[w.status]

  const keurGoed = () => {
    store.setWerkbonStatus(id, 'goedgekeurd', 'Projectleider')
    store.keurUrenGoed(uren.map((u) => u.id))
    toast(`Werkbon ${w.nummer} goedgekeurd, ${uren.length} urenregel(s) goedgekeurd`, 'good')
  }

  return (
    <Modal
      open
      onClose={onClose}
      breed
      titel={
        <span className="inline-flex items-center gap-2">
          {w.nummer} <Badge label={st.label} kleur={st.kleur} />
        </span>
      }
      footer={
        <>
          {!verwijder ? (
            <button className="btn-ghost btn-sm text-bad mr-auto" onClick={() => setVerwijder(true)}>
              <Trash2 size={14} /> Verwijderen
            </button>
          ) : (
            <span className="mr-auto inline-flex items-center gap-2 text-[13px]">
              Zeker?{' '}
              <button
                className="btn-primary btn-sm"
                onClick={() => {
                  store.deleteWerkbon(id)
                  onClose()
                  toast('Werkbon verwijderd')
                }}
              >
                Ja, verwijder
              </button>
              <button className="btn-outline btn-sm" onClick={() => setVerwijder(false)}>
                Nee
              </button>
            </span>
          )}
          <button className="btn-outline btn-sm" onClick={() => nav(`/veld/werkbon/${id}`)}>
            Open als monteur
          </button>
          {w.status === 'gereed' && (
            <button className="btn-ink btn-sm" onClick={keurGoed}>
              <Check size={14} /> Werkbon goedkeuren
            </button>
          )}
          {w.status !== 'gereed' && w.status !== 'goedgekeurd' && (
            <select className="input w-auto text-[13px]" value={w.status} onChange={(e) => store.setWerkbonStatus(id, e.target.value as WerkbonStatus, 'Projectleider')}>
              <option value="open">Open</option>
              <option value="onderweg">Onderweg</option>
              <option value="in_uitvoering">In uitvoering</option>
              <option value="gereed">Gereed</option>
            </select>
          )}
        </>
      }
    >
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <div className="text-[15px] font-semibold">{w.omschrijving}</div>
          <div className="text-[12.5px] text-ink-3 mt-0.5">
            {o?.nummer} · {o?.omschrijving}
          </div>
          <div className="card mt-3 px-4">
            <Rij k="Datum" v={datum(w.datum)} />
            <Rij k="Gepland" v={`${w.geplandStart} · ${w.geplandUren} uur`} />
            <Rij
              k="Locatie"
              v={
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} className="text-ink-4" /> {o?.locatie.straat}, {o?.locatie.plaats}
                </span>
              }
            />
            <Rij
              k="Medewerkers"
              v={
                <span className="flex flex-wrap justify-end gap-1">
                  {w.toegewezenAan.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1 text-[12px]">
                      <Avatar mw={store.getMedewerker(id)} size={18} /> {store.getMedewerker(id)?.naam}
                    </span>
                  ))}
                </span>
              }
            />
          </div>

          <div className="label mt-4 mb-1.5">Checklist</div>
          <div className="card px-4 py-1">
            {w.checklist.map((c) => (
              <div key={c.id} className="flex items-center gap-2 py-2 border-b border-line last:border-b-0 text-[13.5px]">
                {c.gedaan ? <CheckSquare size={16} className="text-good shrink-0" /> : <Square size={16} className="text-ink-4 shrink-0" />}
                <span className={c.gedaan ? 'text-ink-2' : ''}>{c.tekst}</span>
              </div>
            ))}
          </div>

          {w.notities && (
            <>
              <div className="label mt-4 mb-1.5">Notities</div>
              <div className="card p-3 text-[13.5px] text-ink-2 whitespace-pre-wrap">{w.notities}</div>
            </>
          )}

          {w.handtekeningKlant && (
            <>
              <div className="label mt-4 mb-1.5">Handtekening klant</div>
              <div className="card p-3">
                <img src={w.handtekeningKlant} alt="Handtekening" className="h-20 mx-auto" />
                <div className="text-[12px] text-ink-3 text-center mt-1">
                  {w.handtekeningNaam} · {datumTijd(w.handtekeningOp)}
                </div>
              </div>
            </>
          )}
        </div>
        <div>
          <div className="label mb-1.5">Uren</div>
          {uren.length === 0 ? (
            <div className="card p-3 text-[13px] text-ink-3">Nog geen uren geregistreerd.</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <tbody>
                  {uren.map((u) => (
                    <tr key={u.id}>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <Avatar mw={store.getMedewerker(u.medewerkerId)} size={22} />
                          <span className="text-[13px]">{store.getMedewerker(u.medewerkerId)?.naam}</span>
                        </div>
                      </td>
                      <td className="td tabular text-[12.5px] text-ink-2 whitespace-nowrap">
                        {u.start} – {u.eind ?? '…'} {u.pauzeMinuten ? `(${u.pauzeMinuten} min pauze)` : ''}
                      </td>
                      <td className="td text-right tabular font-semibold">{u.eind ? urenLabel(urenVanRegel(u)) : <span className="text-accent text-[12px]">ingecheckt</span>}</td>
                      <td className="td text-right">{u.goedgekeurd ? <Badge label="Goedgekeurd" kleur="bg-green-50 text-good" /> : <Badge label="Open" kleur="bg-bg-2 text-ink-3" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="label mt-4 mb-1.5">Materiaal</div>
          {materiaal.length === 0 ? (
            <div className="card p-3 text-[13px] text-ink-3">Geen materiaal geboekt.</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <tbody>
                  {materiaal.map((m) => (
                    <tr key={m.id}>
                      <td className="td text-[13px]">{m.artikel}</td>
                      <td className="td tabular text-[12.5px] text-ink-2 whitespace-nowrap text-right">
                        {getal(m.aantal, 0)} {m.eenheid}
                      </td>
                      <td className="td tabular text-right font-semibold whitespace-nowrap">{euro(m.aantal * m.verkoopprijs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meerwerk.length > 0 && (
            <>
              <div className="label mt-4 mb-1.5">Meerwerk vanuit deze bon</div>
              {meerwerk.map((m) => (
                <div key={m.id} className="card p-3 text-[13px] flex items-center justify-between gap-2 mb-1.5">
                  <span>
                    <span className="font-semibold">{m.nummer}</span> {m.omschrijving}
                  </span>
                  <span className="tabular font-semibold">{euro(m.bedrag)}</span>
                </div>
              ))}
            </>
          )}

          <div className="label mt-4 mb-1.5">Foto's ({fotos.length})</div>
          <FotoGrid fotos={fotos} compact filter={false} />
        </div>
      </div>
    </Modal>
  )
}

/** Werkbon aanmaken vanuit een opdracht */
export function NieuweWerkbonModal({ opdrachtId, open, onClose, datumVooraf, medewerkerVooraf }: { opdrachtId?: ID; open: boolean; onClose: () => void; datumVooraf?: string; medewerkerVooraf?: ID }) {
  const store = useStore()
  const toast = useToast()
  const opdrachten = store.getOpdrachten().filter((o) => o.status !== 'gefactureerd')
  const [opd, setOpd] = useState(opdrachtId ?? opdrachten.find((o) => o.status === 'in_uitvoering')?.id ?? '')
  const [dat, setDat] = useState(datumVooraf ?? vandaag())
  const [oms, setOms] = useState('')
  const [start, setStart] = useState('07:30')
  const [uren, setUren] = useState(8)
  const [mws, setMws] = useState<ID[]>(medewerkerVooraf ? [medewerkerVooraf] : [])
  const [checklist, setChecklist] = useState('Werkplek afgeschermd\nWerkzaamheden uitgevoerd\nOpgeruimd en afval afgevoerd')

  const opslaan = () => {
    if (!opd || !oms.trim() || mws.length === 0) {
      toast('Vul opdracht, omschrijving en minimaal één medewerker in', 'bad')
      return
    }
    const wb = store.createWerkbon({
      opdrachtId: opd,
      toegewezenAan: mws,
      datum: dat,
      omschrijving: oms.trim(),
      status: 'open',
      checklist: checklist
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((tekst, i) => ({ id: `cl_${Date.now()}_${i}`, tekst, gedaan: false })),
      notities: '',
      geplandStart: start,
      geplandUren: uren,
    })
    toast(`Werkbon ${wb.nummer} aangemaakt`, 'good')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      titel="Nieuwe werkbon"
      footer={
        <>
          <button className="btn-outline btn-sm" onClick={onClose}>
            Annuleren
          </button>
          <button className="btn-ink btn-sm" onClick={opslaan}>
            <Plus size={14} /> Werkbon aanmaken
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <Veld label="Opdracht">
          <select className="input" value={opd} onChange={(e) => setOpd(e.target.value)} disabled={!!opdrachtId}>
            <option value="">Kies opdracht…</option>
            {opdrachten.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nummer} – {o.omschrijving}
              </option>
            ))}
          </select>
        </Veld>
        <Veld label="Werkzaamheden">
          <input className="input" value={oms} onChange={(e) => setOms(e.target.value)} placeholder="Bijv. Tegelwerk wanden – woning 115/116" autoFocus />
        </Veld>
        <div className="grid grid-cols-3 gap-3">
          <Veld label="Datum">
            <input type="date" className="input" value={dat} onChange={(e) => setDat(e.target.value)} />
          </Veld>
          <Veld label="Starttijd">
            <input type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
          </Veld>
          <Veld label="Geplande uren">
            <input type="number" className="input" value={uren} min={1} max={12} step={0.5} onChange={(e) => setUren(Number(e.target.value))} />
          </Veld>
        </div>
        <div>
          <span className="label">Medewerkers</span>
          <div className="flex flex-wrap gap-1.5">
            {store.getMedewerkers().map((m) => {
              const aan = mws.includes(m.id)
              return (
                <button key={m.id} type="button" onClick={() => setMws(aan ? mws.filter((x) => x !== m.id) : [...mws, m.id])} className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border text-[12.5px] font-medium cursor-pointer ${aan ? 'bg-ink text-white border-ink' : 'bg-paper border-line text-ink-2'}`}>
                  <Avatar mw={m} size={20} /> {m.naam.split(' ')[0]}
                  {m.soort === 'onderaannemer' && <span className="text-[9px] uppercase opacity-60">OA</span>}
                </button>
              )
            })}
          </div>
        </div>
        <Veld label="Checklist (één punt per regel)">
          <textarea className="input min-h-[90px]" value={checklist} onChange={(e) => setChecklist(e.target.value)} />
        </Veld>
      </div>
    </Modal>
  )
}
