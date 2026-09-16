import { Check, ChevronRight } from 'lucide-react'
import { useStore } from '../data/StoreContext'
import { berekenNacalculatie, OPDRACHT_STATUS, urenVanRegel } from '../lib/calculatie'
import { euroKort, getal } from '../lib/format'
import type { ID } from '../types'

type Stand = 'leeg' | 'bezig' | 'aandacht' | 'klaar'

interface Stap {
  id: string
  label: string
  stand: Stand
  detail: string
  tab: string
}

const STAND_KLEUR: Record<Stand, string> = {
  leeg: 'bg-bg-2 text-ink-4 border-line',
  bezig: 'bg-accent-soft text-accent border-accent/30',
  aandacht: 'bg-amber-50 text-warn border-warn/30',
  klaar: 'bg-green-50 text-good border-good/30',
}

/**
 * Procesbalk Opdracht → Werkbon → Uren → Meerwerk → Calculatie → Facturatie.
 * Laat per stap de status van deze opdracht zien.
 */
export function ProcesBalk({ opdrachtId, actieveTab, onKies }: { opdrachtId: ID; actieveTab?: string; onKies?: (tab: string) => void }) {
  const store = useStore()
  const o = store.getOpdracht(opdrachtId)
  if (!o) return null
  const werkbonnen = store.getWerkbonnen({ opdrachtId })
  const uren = store.getUren({ opdrachtId })
  const meerwerk = store.getMeerwerk({ opdrachtId })
  const facturen = store.getFacturen({ opdrachtId })
  const nc = berekenNacalculatie(store, opdrachtId)!

  const openWb = werkbonnen.filter((w) => w.status !== 'goedgekeurd').length
  const gereedWb = werkbonnen.filter((w) => w.status === 'gereed').length
  const totUren = uren.reduce((s, u) => s + urenVanRegel(u), 0)
  const nietGoed = uren.filter((u) => !u.goedgekeurd).length
  const terAkkoord = meerwerk.filter((m) => m.status === 'ter_akkoord' || m.status === 'gemeld').length
  const akkoord = meerwerk.filter((m) => m.status === 'akkoord').length

  const stappen: Stap[] = [
    {
      id: 'opdracht',
      label: 'Opdracht',
      stand: o.status === 'offerte' ? 'bezig' : 'klaar',
      detail: OPDRACHT_STATUS[o.status].label,
      tab: 'overzicht',
    },
    {
      id: 'werkbon',
      label: 'Werkbon',
      stand: werkbonnen.length === 0 ? 'leeg' : gereedWb > 0 ? 'aandacht' : openWb > 0 ? 'bezig' : 'klaar',
      detail: werkbonnen.length === 0 ? 'Geen werkbonnen' : gereedWb > 0 ? `${gereedWb} gereed, wacht op goedkeuring` : openWb > 0 ? `${openWb} van ${werkbonnen.length} open` : `${werkbonnen.length} afgerond`,
      tab: 'werkbonnen',
    },
    {
      id: 'uren',
      label: 'Uren',
      stand: uren.length === 0 ? 'leeg' : nietGoed > 0 ? 'aandacht' : 'klaar',
      detail: uren.length === 0 ? 'Nog geen uren' : nietGoed > 0 ? `${getal(totUren, 1)} u · ${nietGoed} niet goedgekeurd` : `${getal(totUren, 1)} u goedgekeurd`,
      tab: 'uren',
    },
    {
      id: 'meerwerk',
      label: 'Meerwerk',
      stand: meerwerk.length === 0 ? 'leeg' : terAkkoord > 0 ? 'aandacht' : 'klaar',
      detail: meerwerk.length === 0 ? 'Geen meerwerk' : terAkkoord > 0 ? `${terAkkoord} wacht op akkoord` : `${akkoord} akkoord (${euroKort(nc.meerwerkAkkoord)})`,
      tab: 'meerwerk',
    },
    {
      id: 'calculatie',
      label: 'Calculatie',
      stand: o.voorcalculatie.length === 0 ? 'leeg' : uren.length === 0 ? 'bezig' : nc.kleur === 'bad' ? 'aandacht' : nc.kleur === 'warn' ? 'aandacht' : 'klaar',
      detail: o.voorcalculatie.length === 0 ? 'Geen voorcalculatie' : uren.length === 0 ? `Begroot ${euroKort(nc.begrootKost)}` : `Budget ${Math.round(nc.budgetVerbruiktPct)}% verbruikt bij ${o.voortgang}%`,
      tab: 'calculatie',
    },
    {
      id: 'facturatie',
      label: 'Facturatie',
      stand: facturen.length === 0 && nc.teFactureren <= 0 ? 'leeg' : nc.teFactureren > 1 ? 'aandacht' : facturen.some((f) => f.status !== 'betaald') ? 'bezig' : 'klaar',
      detail: facturen.length === 0 && nc.teFactureren <= 0 ? 'Niets te factureren' : nc.teFactureren > 1 ? `${euroKort(nc.teFactureren)} te factureren` : facturen.some((f) => f.status !== 'betaald') ? `${facturen.length} factuur/facturen, wacht op betaling` : `${euroKort(nc.gefactureerd)} betaald`,
      tab: 'facturatie',
    },
  ]

  return (
    <div className="card p-2 overflow-x-auto" data-tour="procesbalk">
      <div className="flex items-stretch min-w-[860px]">
        {stappen.map((s, i) => {
          const actief = actieveTab === s.tab
          return (
            <div key={s.id} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => onKies?.(s.tab)}
                className={`flex-1 min-w-0 text-left rounded-[12px] border px-3 py-2 transition cursor-pointer ${STAND_KLEUR[s.stand]} ${actief ? 'ring-2 ring-ink/70' : 'hover:brightness-[0.98]'}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${s.stand === 'klaar' ? 'bg-good text-white' : s.stand === 'leeg' ? 'bg-line-2 text-white' : 'bg-current/20'}`}>
                    {s.stand === 'klaar' ? <Check size={10} strokeWidth={3} /> : <span className={s.stand === 'leeg' ? 'text-white' : ''}>{i + 1}</span>}
                  </span>
                  <span className="text-[12px] font-bold uppercase tracking-[0.04em]">{s.label}</span>
                </div>
                <div className="text-[11.5px] mt-0.5 truncate text-ink-2">{s.detail}</div>
              </button>
              {i < stappen.length - 1 && <ChevronRight size={14} className="text-ink-4 mx-0.5 shrink-0" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
