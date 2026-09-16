import { useRol } from '../../data/RolContext'
import { useStore } from '../../data/StoreContext'
import { datumLang, kapitaliseer, vandaag } from '../../lib/format'
import { WerkbonKaart } from './MijnDag'

/** Alle werkbonnen van de ingelogde monteur, gegroepeerd per dag (recentste eerst) */
export default function VeldWerkbonnen() {
  const store = useStore()
  const { veldMedewerkerId } = useRol()
  const bonnen = store.getWerkbonnen({ medewerkerId: veldMedewerkerId }).sort((a, b) => b.datum.localeCompare(a.datum) || a.geplandStart.localeCompare(b.geplandStart))
  const perDag = bonnen.reduce<Record<string, typeof bonnen>>((acc, w) => {
    ;(acc[w.datum] ??= []).push(w)
    return acc
  }, {})
  const dagen = Object.keys(perDag).sort((a, b) => b.localeCompare(a))
  const vd = vandaag()
  return (
    <div className="grid gap-4">
      <div className="px-1">
        <div className="font-tight font-bold text-[22px]">Mijn werkbonnen</div>
        <div className="text-[12.5px] text-ink-3">{bonnen.length} werkbonnen · alleen jouw eigen bonnen</div>
      </div>
      {dagen.map((d) => (
        <div key={d}>
          <div className={`text-[12px] font-semibold px-1 pb-1.5 ${d === vd ? 'text-accent' : d > vd ? 'text-ink-3' : 'text-ink-2'}`}>
            {d === vd ? 'Vandaag · ' : ''}
            {kapitaliseer(datumLang(d))}
          </div>
          <div className="grid gap-2">
            {perDag[d].map((w) => (
              <WerkbonKaart key={w.id} wb={w} compact />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
