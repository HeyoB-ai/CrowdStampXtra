import { useRol } from '../../data/RolContext'
import { useStore } from '../../data/StoreContext'
import { urenVanRegel } from '../../lib/calculatie'
import { urenLabel, vandaag, weekDagen, weekNummer, weekStart } from '../../lib/format'
import { Avatar, Rij } from '../../components/ui'

export default function Mij() {
  const store = useStore()
  const { veldMedewerkerId, setVeldMedewerker } = useRol()
  const mw = store.getMedewerker(veldMedewerkerId)
  const week = weekDagen(weekStart(vandaag()))
  const uren = store.getUren({ medewerkerId: veldMedewerkerId }).filter((u) => week.includes(u.datum))
  const tot = uren.reduce((s, u) => s + urenVanRegel(u), 0)
  const goed = uren.filter((u) => u.goedgekeurd).reduce((s, u) => s + urenVanRegel(u), 0)
  return (
    <div className="grid gap-4">
      <div className="card p-5 flex items-center gap-4">
        <Avatar mw={mw} size={52} />
        <div>
          <div className="font-tight font-bold text-[20px] leading-tight">{mw?.naam}</div>
          <div className="text-[12.5px] text-ink-3">
            {mw?.rol} · {mw?.bedrijf}
          </div>
        </div>
      </div>
      <div className="card px-4 py-1">
        <div className="label pt-3">Deze week (week {weekNummer(vandaag())})</div>
        <Rij k="Gewerkt" v={urenLabel(tot) + ' uur'} mono />
        <Rij k="Goedgekeurd" v={urenLabel(goed) + ' uur'} mono />
        <Rij k="Werkbonnen" v={store.getWerkbonnen({ medewerkerId: veldMedewerkerId }).filter((w) => week.includes(w.datum)).length} mono />
      </div>
      <div className="card px-4 py-1">
        <div className="label pt-3">Gegevens</div>
        <Rij k="Telefoon" v={mw?.telefoon} mono />
        <Rij k="E-mail" v={<span className="break-all">{mw?.email}</span>} />
      </div>
      <div className="card p-4">
        <div className="label mb-1.5">Demo: wissel van medewerker</div>
        <p className="text-[12.5px] text-ink-3 mb-2">In de echte app logt iedere monteur met een eigen account in. In de demo kies je hier wie je bent.</p>
        <select className="input" value={veldMedewerkerId} onChange={(e) => setVeldMedewerker(e.target.value)}>
          {store.getMedewerkers().map((m) => (
            <option key={m.id} value={m.id}>
              {m.naam} – {m.rol}
              {m.soort === 'onderaannemer' ? ' (onderaannemer)' : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
