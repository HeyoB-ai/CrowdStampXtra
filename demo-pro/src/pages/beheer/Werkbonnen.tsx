import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ChevronLeft, ChevronRight, GripVertical, LayoutGrid, List, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NieuweWerkbonModal, WerkbonModal, WerkbonnenTabel } from '../../components/panels/WerkbonnenPanel'
import { Avatar, Badge, PageHeader } from '../../components/ui'
import { useStore } from '../../data/StoreContext'
import { WERKBON_STATUS } from '../../lib/calculatie'
import { datum, datumKort, isoDatum, parseDatum, vandaag, weekDagen, weekNummer, weekStart } from '../../lib/format'
import type { ID, Werkbon, WerkbonStatus } from '../../types'

const STATUS_RAND: Record<WerkbonStatus, string> = {
  open: 'border-l-ink-4',
  onderweg: 'border-l-blue-500',
  in_uitvoering: 'border-l-accent',
  gereed: 'border-l-warn',
  goedgekeurd: 'border-l-good',
}

export default function Werkbonnen() {
  const store = useStore()
  const [weergave, setWeergave] = useState<'planbord' | 'lijst'>('planbord')
  const [maandag, setMaandag] = useState(weekStart(vandaag()))
  const [nieuw, setNieuw] = useState<{ open: boolean; datum?: string; mw?: ID }>({ open: false })
  const [openWb, setOpenWb] = useState<ID | null>(null)
  const [filterOpd, setFilterOpd] = useState('alle')
  const [filterStatus, setFilterStatus] = useState<WerkbonStatus | 'alle'>('alle')
  const [weekend, setWeekend] = useState(false)

  const werkbonnen = store.getWerkbonnen()
  const medewerkers = store.getMedewerkers()
  const dagen = weekDagen(maandag).filter((d) => weekend || ![0, 6].includes(parseDatum(d)!.getDay()))
  const weekBonnen = werkbonnen.filter((w) => dagen.includes(w.datum)).filter((w) => filterOpd === 'alle' || w.opdrachtId === filterOpd)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const onDragEnd = (e: DragEndEvent) => {
    const wbId = String(e.active.id)
    const over = e.over?.id ? String(e.over.id) : null
    if (!over) return
    const [mwId, dag] = over.split('|')
    const bronMw = String(e.active.data.current?.mw ?? '')
    const wb = store.getWerkbon(wbId)
    if (!wb) return
    let toegewezen = wb.toegewezenAan
    if (mwId !== 'geen' && mwId !== bronMw) {
      toegewezen = toegewezen.includes(mwId) ? toegewezen.filter((m) => m !== bronMw) : toegewezen.map((m) => (m === bronMw ? mwId : m))
      if (!toegewezen.includes(mwId)) toegewezen = [...toegewezen, mwId]
    }
    if (dag === wb.datum && toegewezen === wb.toegewezenAan) return
    store.updateWerkbon(wbId, { datum: dag, toegewezenAan: toegewezen })
    if (mwId !== bronMw || dag !== wb.datum) store.addTijdlijn({ opdrachtId: wb.opdrachtId, type: 'werkbon', tekst: `Werkbon ${wb.nummer} verplaatst naar ${datum(dag)}${mwId !== bronMw && mwId !== 'geen' ? ` · ${store.getMedewerker(mwId)?.naam}` : ''}`, door: 'Planbord' })
  }

  const verschuif = (n: number) => {
    const d = parseDatum(maandag)!
    d.setDate(d.getDate() + n * 7)
    setMaandag(weekStart(isoDatum(d)))
  }

  const lijst = useMemo(() => werkbonnen.filter((w) => filterOpd === 'alle' || w.opdrachtId === filterOpd).filter((w) => filterStatus === 'alle' || w.status === filterStatus), [werkbonnen, filterOpd, filterStatus])

  return (
    <div>
      <PageHeader
        eyebrow="Werkbonnen"
        titel="Werkbonbeheer"
        sub={`${werkbonnen.filter((w) => w.status === 'gereed').length} werkbonnen wachten op goedkeuring · ${werkbonnen.filter((w) => w.datum === vandaag()).length} vandaag`}
        acties={
          <>
            <div className="inline-flex rounded-[10px] border border-line bg-bg-2 p-0.5 text-[12.5px] font-semibold">
              <button onClick={() => setWeergave('planbord')} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] cursor-pointer ${weergave === 'planbord' ? 'bg-paper shadow-sm' : 'text-ink-3'}`}>
                <LayoutGrid size={13} /> Planbord
              </button>
              <button onClick={() => setWeergave('lijst')} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] cursor-pointer ${weergave === 'lijst' ? 'bg-paper shadow-sm' : 'text-ink-3'}`}>
                <List size={13} /> Lijst
              </button>
            </div>
            <button className="btn-ink btn-sm" onClick={() => setNieuw({ open: true })}>
              <Plus size={14} /> Werkbon
            </button>
          </>
        }
      />

      <div className="card p-3 flex flex-wrap items-center gap-2 mb-4">
        <select className="input w-auto" value={filterOpd} onChange={(e) => setFilterOpd(e.target.value)}>
          <option value="alle">Alle opdrachten</option>
          {store
            .getOpdrachten()
            .filter((o) => o.status !== 'gefactureerd' && o.status !== 'offerte')
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.nummer} – {o.omschrijving}
              </option>
            ))}
        </select>
        {weergave === 'lijst' && (
          <select className="input w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as WerkbonStatus | 'alle')}>
            <option value="alle">Alle statussen</option>
            {Object.entries(WERKBON_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        )}
        {weergave === 'planbord' && (
          <>
            <div className="ml-auto flex items-center gap-1">
              <button className="w-8 h-8 rounded-[8px] border border-line bg-paper hover:bg-bg-2 flex items-center justify-center cursor-pointer" onClick={() => verschuif(-1)} aria-label="Vorige week">
                <ChevronLeft size={15} />
              </button>
              <button className="btn-outline btn-sm" onClick={() => setMaandag(weekStart(vandaag()))}>
                Vandaag
              </button>
              <button className="w-8 h-8 rounded-[8px] border border-line bg-paper hover:bg-bg-2 flex items-center justify-center cursor-pointer" onClick={() => verschuif(1)} aria-label="Volgende week">
                <ChevronRight size={15} />
              </button>
              <span className="text-[13px] font-semibold ml-2 tabular">
                Week {weekNummer(maandag)} · {datum(maandag)} – {datum(dagen.at(-1)!)}
              </span>
            </div>
            <label className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2 cursor-pointer">
              <input type="checkbox" checked={weekend} onChange={(e) => setWeekend(e.target.checked)} className="accent-accent" /> Weekend
            </label>
          </>
        )}
      </div>

      {weergave === 'lijst' ? (
        <WerkbonnenTabel werkbonnen={lijst} toonOpdracht onNieuw={() => setNieuw({ open: true })} />
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="card overflow-hidden" data-tour="planbord">
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid border-b border-line bg-bg/60" style={{ gridTemplateColumns: `200px repeat(${dagen.length}, minmax(0, 1fr))` }}>
                  <div className="th border-b-0">Medewerker</div>
                  {dagen.map((d) => (
                    <div key={d} className={`th border-b-0 text-center ${d === vandaag() ? 'text-accent' : ''}`}>
                      {datumKort(d)}
                    </div>
                  ))}
                </div>
                {medewerkers.map((mw) => (
                  <div key={mw.id} className="grid border-b border-line last:border-b-0" style={{ gridTemplateColumns: `200px repeat(${dagen.length}, minmax(0, 1fr))` }}>
                    <div className="px-3 py-2 flex items-center gap-2 border-r border-line">
                      <Avatar mw={mw} size={28} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold truncate">{mw.naam}</div>
                        <div className="text-[11px] text-ink-3 truncate">
                          {mw.rol}
                          {mw.soort === 'onderaannemer' ? ' · onderaannemer' : ''}
                        </div>
                      </div>
                    </div>
                    {dagen.map((d) => (
                      <Cel key={d} id={`${mw.id}|${d}`} vandaag={d === vandaag()} onNieuw={() => setNieuw({ open: true, datum: d, mw: mw.id })}>
                        {weekBonnen
                          .filter((w) => w.datum === d && w.toegewezenAan.includes(mw.id))
                          .map((w) => (
                            <Chip key={w.id} wb={w} mw={mw.id} onOpen={() => setOpenWb(w.id)} />
                          ))}
                      </Cel>
                    ))}
                  </div>
                ))}
                {/* Niet toegewezen */}
                <div className="grid border-t-2 border-line bg-bg/30" style={{ gridTemplateColumns: `200px repeat(${dagen.length}, minmax(0, 1fr))` }}>
                  <div className="px-3 py-2 text-[12.5px] font-semibold text-ink-3 border-r border-line">Niet toegewezen</div>
                  {dagen.map((d) => (
                    <Cel key={d} id={`geen|${d}`} vandaag={d === vandaag()} onNieuw={() => setNieuw({ open: true, datum: d })}>
                      {weekBonnen
                        .filter((w) => w.datum === d && w.toegewezenAan.length === 0)
                        .map((w) => (
                          <Chip key={w.id} wb={w} mw="" onOpen={() => setOpenWb(w.id)} />
                        ))}
                    </Cel>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-4 py-2.5 border-t border-line flex flex-wrap gap-3 text-[11.5px] text-ink-3">
              <span>Sleep een werkbon naar een andere dag of medewerker om te herplannen.</span>
              {Object.entries(WERKBON_STATUS).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${STATUS_RAND[k as WerkbonStatus].replace('border-l-', 'bg-')}`} /> {v.label}
                </span>
              ))}
            </div>
          </div>
        </DndContext>
      )}

      <NieuweWerkbonModal open={nieuw.open} onClose={() => setNieuw({ open: false })} datumVooraf={nieuw.datum} medewerkerVooraf={nieuw.mw} key={`${nieuw.datum}-${nieuw.mw}-${nieuw.open}`} />
      {openWb && <WerkbonModal id={openWb} onClose={() => setOpenWb(null)} />}
    </div>
  )
}

function Cel({ id, children, vandaag: isVandaag, onNieuw }: { id: string; children: React.ReactNode; vandaag: boolean; onNieuw: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`group min-h-[64px] p-1 border-r border-line last:border-r-0 flex flex-col gap-1 transition ${isOver ? 'bg-accent/[0.08]' : isVandaag ? 'bg-accent/[0.025]' : ''}`}>
      {children}
      <button onClick={onNieuw} className="opacity-0 group-hover:opacity-100 transition text-[11px] text-ink-4 hover:text-ink py-0.5 rounded cursor-pointer inline-flex items-center justify-center gap-0.5 mt-auto">
        <Plus size={11} /> bon
      </button>
    </div>
  )
}

function Chip({ wb, mw, onOpen }: { wb: Werkbon; mw: ID; onOpen: () => void }) {
  const store = useStore()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: wb.id, data: { mw } })
  const o = store.getOpdracht(wb.opdrachtId)
  const st = WERKBON_STATUS[wb.status]
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`bg-paper border border-line border-l-[3px] ${STATUS_RAND[wb.status]} rounded-[8px] px-1.5 py-1 text-[11.5px] leading-tight shadow-sm ${isDragging ? 'opacity-70 shadow-lg z-50 relative' : ''}`}
    >
      <div className="flex items-start gap-1">
        <button {...listeners} {...attributes} className="text-ink-4 hover:text-ink-2 cursor-grab active:cursor-grabbing touch-none shrink-0 mt-px" aria-label="Verslepen">
          <GripVertical size={12} />
        </button>
        <button onClick={onOpen} className="text-left min-w-0 flex-1 cursor-pointer">
          <div className="font-semibold text-[10.5px] text-ink-3 tabular">
            {o?.nummer.slice(-3)} · {wb.geplandStart}
          </div>
          <div className="truncate font-medium">{wb.omschrijving}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <Badge label={st.label} kleur={st.kleur} className="!text-[9px] !px-1" />
            {wb.toegewezenAan.length > 1 && <span className="text-[10px] text-ink-4">+{wb.toegewezenAan.length - 1}</span>}
          </div>
        </button>
      </div>
    </div>
  )
}
