import { Check, Copy, ExternalLink, Send, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../data/StoreContext'
import { MEERWERK_STATUS } from '../../lib/calculatie'
import { datumTijd, euro, getal } from '../../lib/format'
import type { ID, Meerwerk } from '../../types'
import { Avatar, Badge, Leeg, Modal, Rij, useToast, Veld } from '../ui'

export function MeerwerkLijst({ items, toonOpdracht = false }: { items: Meerwerk[]; toonOpdracht?: boolean }) {
  const [open, setOpen] = useState<ID | null>(null)
  const store = useStore()
  const lijst = [...items].sort((a, b) => b.gemeldOp.localeCompare(a.gemeldOp))
  if (lijst.length === 0) return <Leeg titel="Geen meerwerk" tekst="Meerwerk wordt vanaf de werkbon op locatie gemeld, met foto en omschrijving." />
  return (
    <>
      <div className="grid gap-2" data-tour="meerwerk-lijst">
        {lijst.map((m) => {
          const st = MEERWERK_STATUS[m.status]
          const o = store.getOpdracht(m.opdrachtId)
          const foto = store.getFotos().find((f) => m.fotoIds.includes(f.id))
          return (
            <button key={m.id} className="card p-3 text-left flex gap-3 hover:border-line-2 transition cursor-pointer" onClick={() => setOpen(m.id)}>
              <div className="w-20 h-16 rounded-[10px] bg-bg-2 overflow-hidden shrink-0 border border-line">
                {foto ? <img src={foto.dataUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-ink-4">geen foto</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-bold tabular">{m.nummer}</span>
                  <Badge label={st.label} kleur={st.kleur} />
                  {m.gefactureerd && <Badge label="Gefactureerd" kleur="bg-ink text-white" />}
                  {toonOpdracht && <span className="text-[11.5px] text-ink-3">{o?.nummer}</span>}
                </div>
                <div className="font-semibold text-[14px] mt-0.5 truncate">{m.omschrijving}</div>
                <div className="text-[12px] text-ink-3 truncate">{m.reden}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-tight font-semibold tabular text-[16px]">{euro(m.bedrag)}</div>
                <div className="text-[11px] text-ink-3 tabular">
                  {getal(m.geschatteUren, 1)} u + {euro(m.materiaalBedrag)}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {open && <MeerwerkModal id={open} onClose={() => setOpen(null)} />}
    </>
  )
}

export function MeerwerkModal({ id, onClose }: { id: ID; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const m = store.getMeerwerkItem(id)
  const [afwijzen, setAfwijzen] = useState(false)
  const [reden, setReden] = useState('')
  const [bewerk, setBewerk] = useState(false)
  const [b, setB] = useState<Meerwerk | null>(null)
  if (!m) return null
  const o = store.getOpdracht(m.opdrachtId)
  const st = MEERWERK_STATUS[m.status]
  const fotos = store.getFotos().filter((f) => m.fotoIds.includes(f.id))
  const link = `${window.location.origin}/akkoord/${m.id}`
  const kopieer = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast('Link gekopieerd', 'good')
    } catch {
      toast(link)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      breed
      titel={
        <span className="inline-flex items-center gap-2">
          Meerwerk {m.nummer} <Badge label={st.label} kleur={st.kleur} />
        </span>
      }
      footer={
        <>
          {m.status === 'gemeld' && !bewerk && (
            <button className="btn-ghost btn-sm mr-auto" onClick={() => { setB({ ...m }); setBewerk(true) }}>
              Bewerken
            </button>
          )}
          {bewerk && b && (
            <>
              <button className="btn-outline btn-sm mr-auto" onClick={() => setBewerk(false)}>
                Annuleren
              </button>
              <button className="btn-ink btn-sm" onClick={() => { store.updateMeerwerk(m.id, b); setBewerk(false); toast('Meerwerk bijgewerkt', 'good') }}>
                Opslaan
              </button>
            </>
          )}
          {!bewerk && (m.status === 'gemeld' || m.status === 'ter_akkoord') && !afwijzen && (
            <button className="btn-outline btn-sm text-bad" onClick={() => setAfwijzen(true)}>
              <X size={14} /> Afwijzen
            </button>
          )}
          {!bewerk && m.status === 'gemeld' && (
            <button className="btn-ink btn-sm" onClick={() => { store.stuurMeerwerkTerAkkoord(m.id); toast('Meerwerk ter akkoord gezet – deel de akkoord-link met de klant', 'good') }} data-tour="meerwerk-ter-akkoord">
              <Send size={14} /> Ter akkoord naar klant
            </button>
          )}
          {!bewerk && m.status === 'ter_akkoord' && (
            <Link to={`/akkoord/${m.id}`} className="btn-primary btn-sm">
              <ExternalLink size={14} /> Open klantakkoord-pagina
            </Link>
          )}
        </>
      }
    >
      {afwijzen && (
        <div className="card p-3 mb-4 border-bad/30 bg-red-50/40">
          <Veld label="Reden van afwijzing">
            <input className="input" value={reden} onChange={(e) => setReden(e.target.value)} placeholder="Bijv. valt buiten het renovatieprogramma" autoFocus />
          </Veld>
          <div className="flex justify-end gap-2 mt-2">
            <button className="btn-outline btn-sm" onClick={() => setAfwijzen(false)}>
              Annuleren
            </button>
            <button className="btn-primary btn-sm" disabled={!reden.trim()} onClick={() => { store.wijsMeerwerkAf(m.id, reden.trim()); setAfwijzen(false); toast('Meerwerk afgewezen') }}>
              Afwijzen bevestigen
            </button>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          {bewerk && b ? (
            <div className="grid gap-3">
              <Veld label="Omschrijving"><input className="input" value={b.omschrijving} onChange={(e) => setB({ ...b, omschrijving: e.target.value })} /></Veld>
              <Veld label="Reden"><textarea className="input min-h-[70px]" value={b.reden} onChange={(e) => setB({ ...b, reden: e.target.value })} /></Veld>
              <div className="grid grid-cols-3 gap-3">
                <Veld label="Geschatte uren"><input type="number" step={0.5} className="input" value={b.geschatteUren} onChange={(e) => setB({ ...b, geschatteUren: Number(e.target.value) })} /></Veld>
                <Veld label="Uurtarief"><input type="number" className="input" value={b.uurtarief} onChange={(e) => setB({ ...b, uurtarief: Number(e.target.value) })} /></Veld>
                <Veld label="Materiaal €"><input type="number" className="input" value={b.materiaalBedrag} onChange={(e) => setB({ ...b, materiaalBedrag: Number(e.target.value) })} /></Veld>
              </div>
              <Veld label="Materiaal omschrijving"><input className="input" value={b.materiaalOmschrijving ?? ''} onChange={(e) => setB({ ...b, materiaalOmschrijving: e.target.value })} /></Veld>
              <div className="text-[13px] text-ink-3">Totaal: <span className="font-semibold text-ink tabular">{euro(b.geschatteUren * b.uurtarief + b.materiaalBedrag)}</span> excl. btw</div>
            </div>
          ) : (
            <>
              <div className="text-[16px] font-semibold">{m.omschrijving}</div>
              <div className="text-[12.5px] text-ink-3 mt-0.5">
                {o?.nummer} · {o?.omschrijving}
              </div>
              <p className="text-[13.5px] text-ink-2 mt-3 leading-relaxed">{m.reden}</p>
              <div className="card mt-3 px-4">
                <Rij k="Arbeid" v={`${getal(m.geschatteUren, 1)} uur × ${euro(m.uurtarief)} = ${euro(m.geschatteUren * m.uurtarief)}`} mono />
                <Rij k={`Materiaal${m.materiaalOmschrijving ? ` (${m.materiaalOmschrijving})` : ''}`} v={euro(m.materiaalBedrag)} mono />
                <Rij k="Totaal excl. btw" v={<span className="text-[15px]">{euro(m.bedrag)}</span>} mono />
                <Rij
                  k="Gemeld door"
                  v={
                    <span className="inline-flex items-center gap-1.5">
                      <Avatar mw={store.getMedewerker(m.gemeldDoor)} size={18} /> {store.getMedewerker(m.gemeldDoor)?.naam} · {datumTijd(m.gemeldOp)}
                    </span>
                  }
                />
                {m.werkbonId && <Rij k="Werkbon" v={store.getWerkbon(m.werkbonId)?.nummer ?? '—'} />}
              </div>
            </>
          )}

          {m.status === 'ter_akkoord' && (
            <div className="card p-3 mt-3 bg-amber-50/50 border-warn/30">
              <div className="text-[12px] font-bold text-warn uppercase tracking-wide mb-1">Deelbare akkoord-link</div>
              <div className="flex items-center gap-2">
                <code className="text-[11.5px] bg-paper border border-line rounded-[8px] px-2 py-1.5 flex-1 truncate">{link}</code>
                <button className="btn-outline btn-sm" onClick={kopieer}>
                  <Copy size={13} /> Kopieer
                </button>
              </div>
              <div className="text-[11.5px] text-ink-3 mt-1.5">In de demo opent deze link de klantpagina in dezelfde browser; in productie is dit een beveiligde link per e-mail/SMS.</div>
            </div>
          )}
          {m.status === 'akkoord' && (
            <div className="card p-3 mt-3 bg-green-50/50 border-good/30">
              <div className="text-[12px] font-bold text-good uppercase tracking-wide mb-1 inline-flex items-center gap-1">
                <Check size={12} /> Akkoord
              </div>
              <div className="text-[13px]">
                {m.akkoordDoor} · {datumTijd(m.akkoordOp)}
              </div>
              {m.akkoordHandtekening && <img src={m.akkoordHandtekening} alt="Handtekening" className="h-16 mt-2 bg-paper rounded-[8px] border border-line" />}
              <div className="text-[11.5px] text-ink-3 mt-1.5">Toegevoegd als regel in de calculatie{m.gefactureerd ? ' en gefactureerd.' : ' – klaar voor facturatie.'}</div>
            </div>
          )}
          {m.status === 'afgewezen' && (
            <div className="card p-3 mt-3 bg-red-50/50 border-bad/30 text-[13px]">
              <span className="font-semibold text-bad">Afgewezen:</span> {m.afgewezenReden}
            </div>
          )}
        </div>
        <div>
          <div className="label mb-1.5">Foto's ({fotos.length})</div>
          {fotos.length === 0 ? (
            <div className="card p-3 text-[13px] text-ink-3">Geen foto's bij dit meerwerk.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {fotos.map((f) => (
                <img key={f.id} src={f.dataUrl} alt={f.bijschrift} className="rounded-[10px] border border-line w-full aspect-[4/3] object-cover" />
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
