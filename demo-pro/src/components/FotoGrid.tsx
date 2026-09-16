import { MapPin, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../data/StoreContext'
import { FOTO_CATEGORIE } from '../lib/calculatie'
import { datumTijd } from '../lib/format'
import type { Foto, FotoCategorie } from '../types'
import { Leeg } from './ui'

const CAT_KLEUR: Record<FotoCategorie, string> = {
  voor: 'bg-ink-3 text-white',
  tijdens: 'bg-accent text-white',
  na: 'bg-good text-white',
  schade: 'bg-bad text-white',
  meerwerk: 'bg-violet-600 text-white',
}

export function FotoGrid({ fotos, verwijderbaar = false, compact = false, filter = true }: { fotos: Foto[]; verwijderbaar?: boolean; compact?: boolean; filter?: boolean }) {
  const store = useStore()
  const [cat, setCat] = useState<FotoCategorie | 'alle'>('alle')
  const [open, setOpen] = useState<Foto | null>(null)
  const lijst = fotos.filter((f) => cat === 'alle' || f.categorie === cat).sort((a, b) => b.tijdstempel.localeCompare(a.tijdstempel))
  const cats = (Object.keys(FOTO_CATEGORIE) as FotoCategorie[]).filter((c) => fotos.some((f) => f.categorie === c))

  if (fotos.length === 0) return compact ? null : <Leeg titel="Nog geen foto's" tekst="Foto's worden vanuit de werkbon op locatie toegevoegd." />

  return (
    <div>
      {filter && cats.length > 1 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          <button onClick={() => setCat('alle')} className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border cursor-pointer ${cat === 'alle' ? 'bg-ink text-white border-ink' : 'bg-paper border-line text-ink-2'}`}>
            Alle <span className="opacity-60 tabular">{fotos.length}</span>
          </button>
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border cursor-pointer ${cat === c ? 'bg-ink text-white border-ink' : 'bg-paper border-line text-ink-2'}`}>
              {FOTO_CATEGORIE[c]} <span className="opacity-60 tabular">{fotos.filter((f) => f.categorie === c).length}</span>
            </button>
          ))}
        </div>
      )}
      <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}`}>
        {lijst.map((f) => (
          <div key={f.id} className="relative group rounded-[12px] overflow-hidden border border-line bg-bg-2 aspect-[4/3] cursor-pointer" onClick={() => setOpen(f)}>
            {f.dataUrl ? <img src={f.dataUrl} alt={f.bijschrift} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-[11px] text-ink-4 p-2 text-center">Foto niet opgeslagen (opslag vol)</div>}
            <span className={`absolute top-1.5 left-1.5 pill ${CAT_KLEUR[f.categorie]}`}>{FOTO_CATEGORIE[f.categorie]}</span>
            {verwijderbaar && (
              <button
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  store.deleteFoto(f.id)
                }}
                aria-label="Foto verwijderen"
              >
                <Trash2 size={12} />
              </button>
            )}
            {!compact && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-5">
                <div className="text-white text-[11.5px] font-medium truncate">{f.bijschrift || '—'}</div>
                <div className="text-white/70 text-[10.5px] tabular">{datumTijd(f.tijdstempel)}</div>
              </div>
            )}
          </div>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-[250] bg-black/85 flex flex-col items-center justify-center p-4 no-print" onClick={() => setOpen(null)}>
          <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center cursor-pointer" aria-label="Sluiten">
            <X size={18} />
          </button>
          <img src={open.dataUrl} alt={open.bijschrift} className="max-h-[75dvh] max-w-full rounded-[12px]" onClick={(e) => e.stopPropagation()} />
          <div className="text-white mt-3 text-center max-w-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className={`pill ${CAT_KLEUR[open.categorie]}`}>{FOTO_CATEGORIE[open.categorie]}</span>
              <span className="text-[13px] font-semibold">{open.bijschrift}</span>
            </div>
            <div className="text-[12px] text-white/70 flex items-center justify-center gap-3 tabular">
              <span>{datumTijd(open.tijdstempel)}</span>
              {open.gps && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} /> {open.gps.lat.toFixed(5)}, {open.gps.lng.toFixed(5)}
                </span>
              )}
              {open.medewerkerId && <span>{store.getMedewerker(open.medewerkerId)?.naam}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
