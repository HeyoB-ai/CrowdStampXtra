import { Camera, ClipboardList, Clock, FileText, MessageSquare, PlugZap, PlusSquare, Calculator } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../data/StoreContext'
import { datumTijd } from '../../lib/format'
import type { ID, TijdlijnItem } from '../../types'
import { Leeg, useToast } from '../ui'

const ICOON: Record<TijdlijnItem['type'], { icon: typeof Clock; kleur: string }> = {
  opdracht: { icon: ClipboardList, kleur: 'bg-ink text-white' },
  werkbon: { icon: FileText, kleur: 'bg-blue-50 text-blue-700' },
  uren: { icon: Clock, kleur: 'bg-accent-soft text-accent' },
  foto: { icon: Camera, kleur: 'bg-bg-2 text-ink-2' },
  meerwerk: { icon: PlusSquare, kleur: 'bg-violet-50 text-violet-700' },
  calculatie: { icon: Calculator, kleur: 'bg-amber-50 text-warn' },
  factuur: { icon: FileText, kleur: 'bg-green-50 text-good' },
  erp: { icon: PlugZap, kleur: 'bg-cyan-50 text-cyan-700' },
  notitie: { icon: MessageSquare, kleur: 'bg-bg-2 text-ink-2' },
}

export function Tijdlijn({ opdrachtId }: { opdrachtId: ID }) {
  const store = useStore()
  const toast = useToast()
  const items = store.getTijdlijn(opdrachtId)
  const [notitie, setNotitie] = useState('')
  const voeg = () => {
    if (!notitie.trim()) return
    store.addTijdlijn({ opdrachtId, type: 'notitie', tekst: notitie.trim(), door: 'Pieter van der Meulen' })
    setNotitie('')
    toast('Notitie toegevoegd', 'good')
  }
  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <div>
        {items.length === 0 ? (
          <Leeg titel="Nog geen gebeurtenissen" />
        ) : (
          <div className="card p-4">
            <ol className="relative border-l border-line ml-3">
              {items.map((t) => {
                const I = ICOON[t.type]
                return (
                  <li key={t.id} className="ml-5 pb-4 last:pb-0 relative">
                    <span className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center ${I.kleur}`}>
                      <I.icon size={12} />
                    </span>
                    <div className="text-[13.5px] leading-snug">{t.tekst}</div>
                    <div className="text-[11.5px] text-ink-3 tabular mt-0.5">
                      {datumTijd(t.tijdstip)}
                      {t.door ? ` · ${t.door}` : ''}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>
      <div className="card p-4 self-start">
        <div className="label mb-1.5">Notitie toevoegen</div>
        <textarea className="input min-h-[80px]" value={notitie} onChange={(e) => setNotitie(e.target.value)} placeholder="Bijv. afspraak met opdrachtgever over planning…" />
        <button className="btn-ink btn-sm mt-2 w-full" onClick={voeg} disabled={!notitie.trim()}>
          Toevoegen aan tijdlijn
        </button>
      </div>
    </div>
  )
}
