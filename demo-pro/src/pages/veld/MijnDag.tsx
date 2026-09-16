import { ChevronRight, MapPin, Navigation } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui'
import { useRol } from '../../data/RolContext'
import { useStore } from '../../data/StoreContext'
import { urenVanRegel, WERKBON_STATUS } from '../../lib/calculatie'
import { dagenVooruit, datumLang, kapitaliseer, pad, urenLabel, vandaag } from '../../lib/format'
import { navigatieUrl } from '../../lib/geo'
import type { Werkbon } from '../../types'

export default function MijnDag() {
  const store = useStore()
  const { veldMedewerkerId } = useRol()
  const mw = store.getMedewerker(veldMedewerkerId)
  const vd = vandaag()
  const vandaagBonnen = store.getWerkbonnen({ medewerkerId: veldMedewerkerId, datum: vd }).sort((a, b) => a.geplandStart.localeCompare(b.geplandStart))
  const morgen = [1, 2, 3].map((n) => dagenVooruit(n)).flatMap((d) => store.getWerkbonnen({ medewerkerId: veldMedewerkerId, datum: d }))
  const mijnUrenVandaag = store.getUren({ medewerkerId: veldMedewerkerId }).filter((u) => u.datum === vd)
  const actief = mijnUrenVandaag.find((u) => !u.eind)
  const gewerkt = mijnUrenVandaag.reduce((s, u) => s + urenVanRegel(u), 0)

  const [nu, setNu] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNu(new Date()), 15000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="grid gap-4">
      {/* Hero met tijd, zoals app.html */}
      <div className="card p-5">
        <div className="text-[12px] text-ink-3">{kapitaliseer(datumLang(vd))}</div>
        <div className="font-tight font-semibold text-[52px] leading-none tracking-[-0.045em] tabular mt-1">
          {pad(nu.getHours())}:{pad(nu.getMinutes())}
        </div>
        <div className="flex items-center gap-2 mt-3 text-[12px] font-semibold text-ink-3">
          <span className={`w-2 h-2 rounded-full ${actief ? 'bg-accent shadow-[0_0_0_3px_rgba(232,65,10,0.18)]' : gewerkt ? 'bg-good' : 'bg-ink-4'}`} />
          {actief ? `Ingecheckt sinds ${actief.start}` : gewerkt ? `${urenLabel(gewerkt)} gewerkt vandaag` : 'Niet ingecheckt'}
          <span className="ml-auto">Hoi {mw?.naam.split(' ')[0]} 👋</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-[13px] font-semibold">Vandaag</span>
          <span className="text-[12px] font-semibold text-ink-3">{vandaagBonnen.length} werkbon{vandaagBonnen.length === 1 ? '' : 'nen'}</span>
        </div>
        {vandaagBonnen.length === 0 ? (
          <div className="card p-8 text-center text-[13.5px] text-ink-3">Geen werkbonnen voor vandaag. Fijne dag!</div>
        ) : (
          <div className="grid gap-2.5">
            {vandaagBonnen.map((w) => (
              <WerkbonKaart key={w.id} wb={w} />
            ))}
          </div>
        )}
      </div>

      {morgen.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-[13px] font-semibold">Komende dagen</span>
          </div>
          <div className="grid gap-2">
            {morgen.slice(0, 4).map((w) => (
              <WerkbonKaart key={w.id} wb={w} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function WerkbonKaart({ wb, compact = false }: { wb: Werkbon; compact?: boolean }) {
  const store = useStore()
  const nav = useNavigate()
  const o = store.getOpdracht(wb.opdrachtId)
  const st = WERKBON_STATUS[wb.status]
  const gedaan = wb.checklist.filter((c) => c.gedaan).length
  return (
    <div role="link" tabIndex={0} onClick={() => nav(`/veld/werkbon/${wb.id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/veld/werkbon/${wb.id}`)} className={`card ${compact ? 'p-3' : 'p-4'} block active:scale-[0.99] transition cursor-pointer`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold tabular text-ink-3">
          {compact ? `${wb.datum.split('-').reverse().slice(0, 2).join('-')} · ` : ''}
          {wb.geplandStart} · {wb.nummer}
        </span>
        <Badge label={st.label} kleur={st.kleur} />
      </div>
      <div className={`font-semibold ${compact ? 'text-[14px]' : 'text-[16px]'} mt-1 leading-snug`}>{wb.omschrijving}</div>
      <div className="text-[12.5px] text-ink-3 mt-0.5">{o?.omschrijving}</div>
      {!compact && o && (
        <>
          <div className="flex items-center gap-1.5 text-[12.5px] text-ink-2 mt-3">
            <MapPin size={13} className="text-ink-4 shrink-0" />
            <span className="truncate">
              {o.locatie.straat}, {o.locatie.plaats}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <a href={navigatieUrl(o.locatie)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="btn-outline btn-sm">
              <Navigation size={13} /> Navigeer
            </a>
            <span className="text-[12px] text-ink-3 tabular">
              {gedaan}/{wb.checklist.length} taken · {wb.geplandUren} u gepland
            </span>
            <ChevronRight size={16} className="ml-auto text-ink-4" />
          </div>
        </>
      )}
    </div>
  )
}
