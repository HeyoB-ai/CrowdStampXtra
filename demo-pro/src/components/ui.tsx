import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Medewerker } from '../types'

/* ── Logo (exact de wordmark van crowdstamp.nl) ── */
export function Logo({ size = 22, tekst = true, pro = true }: { size?: number; tekst?: boolean; pro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0">
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#0f0f0f" />
        <rect x="7.5" y="7.5" width="9" height="9" rx="2.2" fill="white" />
        <circle cx="12" cy="12" r="1.6" fill="#0f0f0f" />
      </svg>
      {tekst && (
        <span className="font-tight font-bold text-[18px] tracking-[-0.035em] text-ink leading-none">
          crowdstamp{pro && <span className="pill-accent ml-1.5 align-middle relative -top-px">pro</span>}
        </span>
      )}
    </span>
  )
}

/* ── Statusbadge ── */
export function Badge({ label, kleur, className = '' }: { label: string; kleur: string; className?: string }) {
  return <span className={`pill ${kleur} ${className}`}>{label}</span>
}

/* ── Avatar met initialen ── */
export function Avatar({ mw, size = 28 }: { mw: Medewerker | undefined; size?: number }) {
  if (!mw) return <span className="inline-block rounded-full bg-bg-2" style={{ width: size, height: size }} />
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
      style={{ width: size, height: size, background: mw.kleur, fontSize: size * 0.38 }}
      title={mw.naam}
    >
      {mw.initialen}
    </span>
  )
}

/* ── Paginakop ── */
export function PageHeader({ eyebrow, titel, sub, acties }: { eyebrow?: string; titel: ReactNode; sub?: ReactNode; acties?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-[26px] md:text-[30px] font-bold leading-[1.1]">{titel}</h1>
        {sub && <div className="text-[13.5px] text-ink-3 mt-1">{sub}</div>}
      </div>
      {acties && <div className="flex flex-wrap items-center gap-2">{acties}</div>}
    </div>
  )
}

/* ── KPI-kaart ── */
export function KpiCard({ label, waarde, sub, kleur, onClick, icon }: { label: string; waarde: ReactNode; sub?: ReactNode; kleur?: 'accent' | 'good' | 'warn' | 'bad'; onClick?: () => void; icon?: ReactNode }) {
  const kleuren = { accent: 'text-accent', good: 'text-good', warn: 'text-warn', bad: 'text-bad' }
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp onClick={onClick} className={`card p-4 text-left ${onClick ? 'hover:border-line-2 transition cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11.5px] font-medium text-ink-3">{label}</div>
        {icon && <span className="text-ink-4">{icon}</span>}
      </div>
      <div className={`font-tight text-[26px] font-semibold tabular mt-1 leading-none ${kleur ? kleuren[kleur] : 'text-ink'}`}>{waarde}</div>
      {sub && <div className="text-[12px] text-ink-3 mt-2">{sub}</div>}
    </Comp>
  )
}

/* ── Leeg-staat ── */
export function Leeg({ titel, tekst, actie }: { titel: string; tekst?: string; actie?: ReactNode }) {
  return (
    <div className="card p-10 text-center">
      <div className="font-tight font-semibold text-[16px]">{titel}</div>
      {tekst && <div className="text-[13px] text-ink-3 mt-1 max-w-md mx-auto">{tekst}</div>}
      {actie && <div className="mt-4 flex justify-center">{actie}</div>}
    </div>
  )
}

/* ── Modal ── */
export function Modal({ open, onClose, titel, children, breed = false, footer }: { open: boolean; onClose: () => void; titel?: ReactNode; children: ReactNode; breed?: boolean; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6 no-print" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className={`relative bg-paper w-full ${breed ? 'sm:max-w-4xl' : 'sm:max-w-lg'} max-h-[92dvh] flex flex-col rounded-t-[20px] sm:rounded-[20px] shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {titel !== undefined && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <div className="font-tight font-semibold text-[17px]">{titel}</div>
            <button className="w-8 h-8 rounded-full bg-bg-2 flex items-center justify-center text-ink-2 hover:bg-line cursor-pointer" onClick={onClose} aria-label="Sluiten">
              <X size={15} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line bg-bg flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

/* ── Toast ── */
interface ToastItem {
  id: number
  tekst: string
  soort: 'info' | 'good' | 'bad'
}
const ToastContext = createContext<(tekst: string, soort?: ToastItem['soort']) => void>(() => {})
export function useToast() {
  return useContext(ToastContext)
}
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const toon = useCallback((tekst: string, soort: ToastItem['soort'] = 'info') => {
    const id = Date.now() + Math.random()
    setItems((x) => [...x, { id, tekst, soort }])
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3200)
  }, [])
  return (
    <ToastContext.Provider value={toon}>
      {children}
      <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[300] flex flex-col items-center gap-2 pointer-events-none no-print">
        {items.map((t) => (
          <div key={t.id} className={`toast-enter px-4 py-2.5 rounded-full text-[13px] font-medium text-white shadow-lg ${t.soort === 'good' ? 'bg-good' : t.soort === 'bad' ? 'bg-bad' : 'bg-ink'}`}>
            {t.tekst}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/* ── Formulier-helpers ── */
export function Veld({ label, children, hint, className = '' }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink-4 mt-1">{hint}</span>}
    </label>
  )
}

export function Schakelaar({ aan, onChange, label }: { aan: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!aan)} className="inline-flex items-center gap-2 cursor-pointer select-none" aria-pressed={aan}>
      <span className={`relative inline-block w-9 h-5 rounded-full transition ${aan ? 'bg-accent' : 'bg-line-2'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition ${aan ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      {label && <span className="text-[13px] text-ink-2">{label}</span>}
    </button>
  )
}

/* ── Voortgangsbalk ── */
export function Voortgang({ pct, kleur = 'accent', dun = false }: { pct: number; kleur?: 'accent' | 'good' | 'warn' | 'bad' | 'ink'; dun?: boolean }) {
  const k = { accent: 'bg-accent', good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad', ink: 'bg-ink' }[kleur]
  return (
    <div className={`w-full rounded-full bg-bg-2 overflow-hidden ${dun ? 'h-1.5' : 'h-2'}`}>
      <div className={`h-full rounded-full ${k} transition-all`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

/* ── Tabs ── */
export function Tabs<T extends string>({ items, actief, onChange }: { items: { id: T; label: string; teller?: number }[]; actief: T; onChange: (id: T) => void }) {
  return (
    <div className="flex gap-0.5 border-b border-line overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      {items.map((t) => (
        <button key={t.id} className={`tab ${actief === t.id ? 'tab-active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
          {t.teller !== undefined && t.teller > 0 && <span className={`ml-1.5 text-[10.5px] font-bold px-1.5 py-px rounded-full ${actief === t.id ? 'bg-accent text-white' : 'bg-bg-2 text-ink-3'}`}>{t.teller}</span>}
        </button>
      ))}
    </div>
  )
}

/* ── Sleutel/waarde rij ── */
export function Rij({ k, v, mono = false }: { k: ReactNode; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-line last:border-b-0">
      <span className="text-[13px] text-ink-3 shrink-0">{k}</span>
      <span className={`text-[13.5px] font-semibold text-right ${mono ? 'tabular' : ''}`}>{v}</span>
    </div>
  )
}

export function Spinner({ donker = false }: { donker?: boolean }) {
  return <span className={`spinner ${donker ? 'spinner-dark' : ''}`} />
}
