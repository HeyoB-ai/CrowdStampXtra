import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { UrenTabel } from '../../components/panels/UrenPanel'
import { Avatar, KpiCard, PageHeader, Tabs } from '../../components/ui'
import { useStore } from '../../data/StoreContext'
import { afwijkingen, kostVanUren, urenVanRegel, verkoopVanUren } from '../../lib/calculatie'
import { datum, euro, isoDatum, parseDatum, urenLabel, vandaag, weekDagen, weekNummer, weekStart } from '../../lib/format'

type Tab = 'alle' | 'afwijkingen' | 'per_medewerker' | 'per_opdracht'

export default function Uren() {
  const store = useStore()
  const [maandag, setMaandag] = useState(weekStart(vandaag()))
  const [tab, setTab] = useState<Tab>('alle')
  const [mwFilter, setMwFilter] = useState('alle')
  const [opdFilter, setOpdFilter] = useState('alle')
  const [alleWeken, setAlleWeken] = useState(false)
  const dagen = weekDagen(maandag)
  const vd = vandaag()

  const uren = useMemo(
    () =>
      store
        .getUren()
        .filter((u) => alleWeken || dagen.includes(u.datum))
        .filter((u) => mwFilter === 'alle' || u.medewerkerId === mwFilter)
        .filter((u) => opdFilter === 'alle' || u.opdrachtId === opdFilter),
    [store, dagen, mwFilter, opdFilter, alleWeken],
  )
  const metAfw = uren.filter((u) => afwijkingen(u, store.getOpdracht(u.opdrachtId), vd).length > 0)
  const totaal = uren.reduce((s, u) => s + urenVanRegel(u), 0)
  const teKeuren = uren.filter((u) => !u.goedgekeurd && u.eind)
  const kost = uren.reduce((s, u) => s + kostVanUren(u, store.getMedewerker(u.medewerkerId)), 0)
  const verkoop = uren.reduce((s, u) => s + verkoopVanUren(u, store.getMedewerker(u.medewerkerId)), 0)

  const verschuif = (n: number) => {
    const d = parseDatum(maandag)!
    d.setDate(d.getDate() + n * 7)
    setMaandag(weekStart(isoDatum(d)))
  }

  const perMedewerker = store
    .getMedewerkers()
    .map((mw) => {
      const u = uren.filter((x) => x.medewerkerId === mw.id)
      return { mw, uren: u.reduce((s, x) => s + urenVanRegel(x), 0), regels: u.length, open: u.filter((x) => !x.goedgekeurd).length, afw: u.filter((x) => afwijkingen(x, store.getOpdracht(x.opdrachtId), vd).length > 0).length, kost: u.reduce((s, x) => s + kostVanUren(x, mw), 0), verkoop: u.reduce((s, x) => s + verkoopVanUren(x, mw), 0), perDag: dagen.map((d) => u.filter((x) => x.datum === d).reduce((s, x) => s + urenVanRegel(x), 0)) }
    })
    .filter((r) => r.regels > 0)

  const perOpdracht = store
    .getOpdrachten()
    .map((o) => {
      const u = uren.filter((x) => x.opdrachtId === o.id)
      return { o, uren: u.reduce((s, x) => s + urenVanRegel(x), 0), regels: u.length, open: u.filter((x) => !x.goedgekeurd).length, kost: u.reduce((s, x) => s + kostVanUren(x, store.getMedewerker(x.medewerkerId)), 0), verkoop: u.reduce((s, x) => s + verkoopVanUren(x, store.getMedewerker(x.medewerkerId)), 0) }
    })
    .filter((r) => r.regels > 0)

  return (
    <div>
      <PageHeader eyebrow="Uren" titel="Urenregistratie" sub="Controleer, markeer afwijkingen en keur goed. Goedgekeurde uren zijn de basis voor de nacalculatie en regiefacturen." />

      <div className="card p-3 flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 rounded-[8px] border border-line bg-paper hover:bg-bg-2 flex items-center justify-center cursor-pointer disabled:opacity-40" onClick={() => verschuif(-1)} disabled={alleWeken} aria-label="Vorige week">
            <ChevronLeft size={15} />
          </button>
          <button className="btn-outline btn-sm" onClick={() => setMaandag(weekStart(vandaag()))} disabled={alleWeken}>
            Deze week
          </button>
          <button className="w-8 h-8 rounded-[8px] border border-line bg-paper hover:bg-bg-2 flex items-center justify-center cursor-pointer disabled:opacity-40" onClick={() => verschuif(1)} disabled={alleWeken} aria-label="Volgende week">
            <ChevronRight size={15} />
          </button>
          <span className={`text-[13px] font-semibold ml-2 tabular ${alleWeken ? 'text-ink-4' : ''}`}>
            Week {weekNummer(maandag)} · {datum(maandag)} – {datum(dagen[6])}
          </span>
        </div>
        <label className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2 cursor-pointer ml-2">
          <input type="checkbox" checked={alleWeken} onChange={(e) => setAlleWeken(e.target.checked)} className="accent-accent" /> Alle weken
        </label>
        <select className="input w-auto ml-auto" value={mwFilter} onChange={(e) => setMwFilter(e.target.value)}>
          <option value="alle">Alle medewerkers</option>
          {store.getMedewerkers().map((m) => (
            <option key={m.id} value={m.id}>
              {m.naam}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={opdFilter} onChange={(e) => setOpdFilter(e.target.value)}>
          <option value="alle">Alle opdrachten</option>
          {store.getOpdrachten().map((o) => (
            <option key={o.id} value={o.id}>
              {o.nummer} – {o.omschrijving}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <KpiCard label="Uren in selectie" waarde={urenLabel(totaal)} sub={`${uren.length} regels`} />
        <KpiCard label="Nog goed te keuren" waarde={teKeuren.length} sub={`${urenLabel(teKeuren.reduce((s, u) => s + urenVanRegel(u), 0))} uur`} kleur={teKeuren.length ? 'accent' : undefined} onClick={() => setTab('alle')} />
        <KpiCard label="Afwijkingen" waarde={metAfw.length} sub="geen check-out · >10 u · buiten 250 m" kleur={metAfw.length ? 'warn' : 'good'} onClick={() => setTab('afwijkingen')} icon={<AlertTriangle size={14} />} />
        <KpiCard label="Kostprijs" waarde={euro(kost)} sub="uren × kostprijs medewerker" />
        <KpiCard label="Verkoopwaarde" waarde={euro(verkoop)} sub="uren × verkooptarief" />
      </div>

      <div className="mb-4">
        <Tabs
          items={[
            { id: 'alle', label: 'Alle uren', teller: uren.length },
            { id: 'afwijkingen', label: 'Afwijkingen', teller: metAfw.length },
            { id: 'per_medewerker', label: 'Per medewerker' },
            { id: 'per_opdracht', label: 'Per opdracht' },
          ]}
          actief={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'alle' && <UrenTabel uren={uren} />}
      {tab === 'afwijkingen' && (
        <div data-tour="uren-afwijkingen">
          <UrenTabel uren={uren} alleenAfwijkingen />
        </div>
      )}
      {tab === 'per_medewerker' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr>
                  <th className="th">Medewerker</th>
                  {!alleWeken && dagen.map((d) => <th key={d} className="th text-right">{d.split('-')[2]}</th>)}
                  <th className="th text-right">Totaal</th>
                  <th className="th text-right">Open</th>
                  <th className="th text-right">Afw.</th>
                  <th className="th text-right">Kostprijs</th>
                  <th className="th text-right">Verkoop</th>
                </tr>
              </thead>
              <tbody>
                {perMedewerker.map((r) => (
                  <tr key={r.mw.id} className="hover:bg-accent/[0.03] cursor-pointer" onClick={() => { setMwFilter(r.mw.id); setTab('alle') }}>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <Avatar mw={r.mw} size={26} />
                        <div>
                          <div className="text-[13px] font-medium leading-tight">{r.mw.naam}</div>
                          <div className="text-[11px] text-ink-3">{r.mw.soort === 'onderaannemer' ? r.mw.bedrijf : r.mw.rol}</div>
                        </div>
                      </div>
                    </td>
                    {!alleWeken && r.perDag.map((u, i) => <td key={i} className={`td text-right tabular text-[12.5px] ${u > 10 ? 'text-warn font-semibold' : u ? '' : 'text-ink-4'}`}>{u ? urenLabel(u) : '—'}</td>)}
                    <td className="td text-right tabular font-semibold">{urenLabel(r.uren)}</td>
                    <td className="td text-right tabular">{r.open || <span className="text-ink-4">0</span>}</td>
                    <td className={`td text-right tabular ${r.afw ? 'text-warn font-semibold' : 'text-ink-4'}`}>{r.afw}</td>
                    <td className="td text-right tabular text-ink-2">{euro(r.kost)}</td>
                    <td className="td text-right tabular">{euro(r.verkoop)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'per_opdracht' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Opdracht</th>
                <th className="th text-right">Regels</th>
                <th className="th text-right">Uren</th>
                <th className="th text-right">Open</th>
                <th className="th text-right">Kostprijs</th>
                <th className="th text-right">Verkoop</th>
              </tr>
            </thead>
            <tbody>
              {perOpdracht.map((r) => (
                <tr key={r.o.id} className="hover:bg-accent/[0.03] cursor-pointer" onClick={() => { setOpdFilter(r.o.id); setTab('alle') }}>
                  <td className="td">
                    <div className="text-[12.5px] font-semibold">{r.o.nummer}</div>
                    <div className="text-[12px] text-ink-3">{r.o.omschrijving}</div>
                  </td>
                  <td className="td text-right tabular">{r.regels}</td>
                  <td className="td text-right tabular font-semibold">{urenLabel(r.uren)}</td>
                  <td className="td text-right tabular">{r.open || <span className="text-ink-4">0</span>}</td>
                  <td className="td text-right tabular text-ink-2">{euro(r.kost)}</td>
                  <td className="td text-right tabular">{euro(r.verkoop)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
