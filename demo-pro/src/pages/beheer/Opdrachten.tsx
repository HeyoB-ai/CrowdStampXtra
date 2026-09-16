import { MapPin, Plus, Search, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Leeg, PageHeader, Voortgang } from '../../components/ui'
import { useStore } from '../../data/StoreContext'
import { berekenNacalculatie, OPDRACHT_STATUS } from '../../lib/calculatie'
import { datum, euroKort } from '../../lib/format'
import type { OpdrachtStatus } from '../../types'

const STATUSSEN: (OpdrachtStatus | 'alle')[] = ['alle', 'offerte', 'gepland', 'in_uitvoering', 'opgeleverd', 'gefactureerd']

export default function Opdrachten() {
  const store = useStore()
  const nav = useNavigate()
  const [zoek, setZoek] = useState('')
  const [status, setStatus] = useState<OpdrachtStatus | 'alle'>('alle')
  const [klant, setKlant] = useState('alle')
  const [vorm, setVorm] = useState('alle')

  const opdrachten = store.getOpdrachten()
  const klanten = store.getKlanten()

  const lijst = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    return opdrachten
      .filter((o) => status === 'alle' || o.status === status)
      .filter((o) => klant === 'alle' || o.klantId === klant)
      .filter((o) => vorm === 'alle' || o.contractvorm === vorm)
      .filter((o) => {
        if (!q) return true
        const k = store.getKlant(o.klantId)
        return [o.nummer, o.omschrijving, o.locatie.plaats, o.locatie.straat, k?.naam].join(' ').toLowerCase().includes(q)
      })
      .sort((a, b) => b.nummer.localeCompare(a.nummer))
  }, [opdrachten, zoek, status, klant, vorm, store])

  return (
    <div>
      <PageHeader
        eyebrow="Opdrachten"
        titel="Opdrachten"
        sub={`${opdrachten.length} opdrachten · ${opdrachten.filter((o) => o.status === 'in_uitvoering').length} in uitvoering`}
        acties={
          <>
            <Link to="/beheer/opdrachten/import" className="btn-outline btn-sm" data-tour="opdracht-import">
              <Upload size={14} /> Importeren
            </Link>
            <Link to="/beheer/opdrachten/nieuw" className="btn-ink btn-sm" data-tour="opdracht-nieuw">
              <Plus size={14} /> Nieuwe opdracht
            </Link>
          </>
        }
      />

      <div className="card p-3 flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          <input className="input pl-8" placeholder="Zoek op nummer, omschrijving, klant of plaats…" value={zoek} onChange={(e) => setZoek(e.target.value)} />
        </div>
        <select className="input w-auto" value={klant} onChange={(e) => setKlant(e.target.value)}>
          <option value="alle">Alle klanten</option>
          {klanten.map((k) => (
            <option key={k.id} value={k.id}>
              {k.naam}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={vorm} onChange={(e) => setVorm(e.target.value)}>
          <option value="alle">Aanneemsom en regie</option>
          <option value="aanneemsom">Aanneemsom</option>
          <option value="regie">Regie</option>
        </select>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-4">
        {STATUSSEN.map((s) => {
          const n = s === 'alle' ? opdrachten.length : opdrachten.filter((o) => o.status === s).length
          return (
            <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border cursor-pointer transition ${status === s ? 'bg-ink text-white border-ink' : 'bg-paper border-line text-ink-2 hover:border-line-2'}`}>
              {s === 'alle' ? 'Alle' : OPDRACHT_STATUS[s].label} <span className={`tabular ${status === s ? 'text-white/70' : 'text-ink-4'}`}>{n}</span>
            </button>
          )
        })}
      </div>

      {lijst.length === 0 ? (
        <Leeg titel="Geen opdrachten gevonden" tekst="Pas de filters aan of maak een nieuwe opdracht." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr>
                  <th className="th">Nummer</th>
                  <th className="th">Omschrijving</th>
                  <th className="th">Klant</th>
                  <th className="th">Locatie</th>
                  <th className="th">Vorm</th>
                  <th className="th">Periode</th>
                  <th className="th">Status</th>
                  <th className="th w-[160px]">Voortgang</th>
                  <th className="th text-right">Waarde</th>
                  <th className="th text-right">Resultaat</th>
                </tr>
              </thead>
              <tbody>
                {lijst.map((o) => {
                  const k = store.getKlant(o.klantId)
                  const nc = berekenNacalculatie(store, o.id)!
                  const res = o.status === 'offerte' || o.status === 'gepland' ? nc.begrootResultaat : nc.prognoseResultaat
                  return (
                    <tr key={o.id} className="hover:bg-accent/[0.03] cursor-pointer" onClick={() => nav(`/beheer/opdrachten/${o.id}`)}>
                      <td className="td font-semibold tabular whitespace-nowrap">{o.nummer}</td>
                      <td className="td">
                        <div className="font-medium max-w-[300px] truncate">{o.omschrijving}</div>
                      </td>
                      <td className="td text-ink-2 whitespace-nowrap">{k?.naam}</td>
                      <td className="td text-ink-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} className="text-ink-4" /> {o.locatie.plaats}
                        </span>
                      </td>
                      <td className="td">
                        <span className="text-[12px] font-semibold text-ink-2">{o.contractvorm === 'aanneemsom' ? 'Aanneemsom' : 'Regie'}</span>
                        {o.btwVerlegd && <span className="ml-1.5 text-[10px] font-bold text-ink-3 uppercase">btw verlegd</span>}
                      </td>
                      <td className="td text-ink-2 tabular whitespace-nowrap text-[12.5px]">
                        {datum(o.startdatum)} – {datum(o.einddatum)}
                      </td>
                      <td className="td">
                        <Badge label={OPDRACHT_STATUS[o.status].label} kleur={OPDRACHT_STATUS[o.status].kleur} />
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <Voortgang pct={o.voortgang} kleur={nc.kleur === 'bad' ? 'bad' : nc.kleur === 'warn' ? 'warn' : 'ink'} dun />
                          <span className="text-[12px] tabular text-ink-3 w-9 text-right">{o.voortgang}%</span>
                        </div>
                      </td>
                      <td className="td text-right tabular font-semibold whitespace-nowrap">{euroKort(nc.contractwaarde)}</td>
                      <td className={`td text-right tabular font-semibold whitespace-nowrap ${res < 0 ? 'text-bad' : nc.kleur === 'warn' ? 'text-warn' : 'text-good'}`}>{euroKort(res)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
