import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useRol } from '../data/RolContext'
import { store } from '../data/store'
import { vandaag } from '../lib/format'

/**
 * Lichte, eigen rondleiding: geen library. Elke stap heeft een route, een optionele
 * selector (data-tour="…") en uitleg. De stap navigeert, wacht tot het element er is,
 * legt er een 'spotlight' over en toont een tooltip.
 */
export interface TourStap {
  route: string | (() => string)
  selector?: string
  titel: string
  tekst: string
  rol?: 'beheer' | 'veld'
}

function veldWerkbonVandaag(): string {
  const wb = store.getWerkbonnen({ datum: vandaag(), medewerkerId: 'm_sander' }).find((w) => w.opdrachtId === 'o_009') ?? store.getWerkbonnen({ medewerkerId: 'm_sander' })[0]
  return wb ? `/veld/werkbon/${wb.id}` : '/veld'
}

export const TOUR_STAPPEN: TourStap[] = [
  {
    route: '/beheer',
    selector: '[data-tour="kpis"]',
    titel: '1 · Dashboard',
    tekst: 'We volgen één opdracht – de badkamerrenovatie van 12 woningen in Woerden – van opdracht tot factuur in het boekhoudpakket. Het dashboard toont lopende opdrachten, open werkbonnen, uren, meerwerk ter akkoord en wat je nog kunt factureren.',
  },
  {
    route: '/beheer/opdrachten/o_009',
    selector: '[data-tour="procesbalk"]',
    titel: '2 · Opdracht en procesbalk',
    tekst: 'Opdrachten voer je in of importeer je uit CSV, inclusief voorcalculatie. De procesbalk Opdracht → Werkbon → Uren → Meerwerk → Calculatie → Factuur laat per stap zien waar het werk staat.',
  },
  {
    route: veldWerkbonVandaag,
    selector: '[data-tour="veld-checkin"]',
    titel: '3 · Monteur op locatie',
    tekst: 'Het scherm van de monteur: GPS-check-in, werkzaamheden afvinken, uren, materiaal, foto’s, meerwerk melden en de klant laten tekenen. Dezelfde eenvoud als de huidige CrowdStamp-app.',
    rol: 'veld',
  },
  {
    route: '/beheer/meerwerk',
    selector: '[data-tour="meerwerk-lijst"]',
    titel: '4 · Uren en meerwerk',
    tekst: 'Uren worden per week gecontroleerd en goedgekeurd (afwijkingen gemarkeerd). Meerwerk gaat via een deelbare akkoord-pagina naar de klant en komt na akkoord automatisch in de calculatie en de facturatie.',
    rol: 'beheer',
  },
  {
    route: '/beheer/calculatie/o_009',
    selector: '[data-tour="nacalculatie"]',
    titel: '5 · Voor- en nacalculatie',
    tekst: 'Begroot versus werkelijk per kostensoort, marge, voortgang en prognose. Hier zie je dat het tegelwerk (onderaanneming) fors uitloopt – vóór het te laat is.',
  },
  {
    route: '/beheer/integraties',
    selector: '[data-tour="integraties"]',
    titel: '6 · Factuur en boekhouding',
    tekst: 'Termijn-, regie- of meerwerkfactuur genereren met A4-voorbeeld en PDF. Facturen gaan naar Exact, AFAS, Twinfield of SnelStart; betaalstatus komt terug. Of exporteer UBL 2.1 en een CSV-journaalpost. De keten is rond.',
  },
]

interface TourCtx {
  actief: boolean
  stap: number
  start: () => void
  stop: () => void
}
const Ctx = createContext<TourCtx>({ actief: false, stap: 0, start: () => {}, stop: () => {} })
export const useTour = () => useContext(Ctx)

export function TourProvider({ children }: { children: ReactNode }) {
  const [actief, setActief] = useState(false)
  const [stap, setStap] = useState(0)
  const start = useCallback(() => {
    setStap(0)
    setActief(true)
  }, [])
  const stop = useCallback(() => setActief(false), [])
  const value = useMemo(() => ({ actief, stap, start, stop }), [actief, stap, start, stop])
  return (
    <Ctx.Provider value={value}>
      {children}
      {actief && <TourOverlay stap={stap} setStap={setStap} stop={stop} />}
    </Ctx.Provider>
  )
}

function TourOverlay({ stap, setStap, stop }: { stap: number; setStap: (n: number) => void; stop: () => void }) {
  const nav = useNavigate()
  const loc = useLocation()
  const { setRol } = useRol()
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [zoeken, setZoeken] = useState(true)
  const s = TOUR_STAPPEN[stap]
  const route = typeof s.route === 'function' ? s.route() : s.route
  const timer = useRef<number | undefined>(undefined)

  // navigeer naar de route van deze stap
  useEffect(() => {
    if (s.rol) setRol(s.rol)
    if (loc.pathname !== route) nav(route)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stap])

  // wacht tot het element bestaat, dan meten
  useLayoutEffect(() => {
    setZoeken(true)
    setRect(null)
    let pogingen = 0
    const meet = () => {
      if (!s.selector) {
        setZoeken(false)
        return
      }
      const el = document.querySelector(s.selector) as HTMLElement | null
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' })
        setRect(el.getBoundingClientRect())
        window.setTimeout(() => setRect(el.getBoundingClientRect()), 120)
        setZoeken(false)
      } else if (pogingen++ < 25) {
        timer.current = window.setTimeout(meet, 120)
      } else {
        setZoeken(false)
      }
    }
    timer.current = window.setTimeout(meet, 150)
    return () => window.clearTimeout(timer.current)
  }, [stap, s.selector, loc.pathname])

  // opnieuw meten bij resize/scroll
  useEffect(() => {
    if (!s.selector) return
    const h = () => {
      const el = document.querySelector(s.selector!) as HTMLElement | null
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', h)
    window.addEventListener('scroll', h, true)
    return () => {
      window.removeEventListener('resize', h)
      window.removeEventListener('scroll', h, true)
    }
  }, [s.selector])

  const laatste = stap === TOUR_STAPPEN.length - 1
  const pad = 8
  const spot = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null

  // tooltip-positie: onder het element als er ruimte is, anders erboven; zonder element gecentreerd
  const tipStyle: React.CSSProperties = (() => {
    if (!spot) return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
    const vw = window.innerWidth
    const vh = window.innerHeight
    const breedte = Math.min(380, vw - 24)
    const onder = spot.top + spot.height + 12
    const ruimteOnder = vh - onder
    const top = ruimteOnder > 220 ? onder : Math.max(12, spot.top - 12 - 200)
    const left = Math.min(Math.max(12, spot.left), vw - breedte - 12)
    return { top, left, width: breedte }
  })()

  return (
    <div className="fixed inset-0 z-[400] no-print" aria-live="polite">
      {/* donker masker met gat: vier vlakken rondom het element */}
      {spot ? (
        <>
          <div className="absolute left-0 right-0 top-0 bg-ink/55" style={{ height: Math.max(0, spot.top) }} />
          <div className="absolute left-0 right-0 bottom-0 bg-ink/55" style={{ top: spot.top + spot.height }} />
          <div className="absolute left-0 bg-ink/55" style={{ top: spot.top, height: spot.height, width: Math.max(0, spot.left) }} />
          <div className="absolute right-0 bg-ink/55" style={{ top: spot.top, height: spot.height, left: spot.left + spot.width }} />
          <div className="absolute rounded-[14px] pointer-events-none ring-2 ring-accent" style={{ ...spot }} />
        </>
      ) : (
        <div className="absolute inset-0 bg-ink/55" />
      )}
      <div className="absolute inset-0" onClick={stop} />
      <div className="absolute card p-4 shadow-2xl" style={tipStyle} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="eyebrow">
            Stap {stap + 1} van {TOUR_STAPPEN.length}
          </div>
          <button className="w-7 h-7 -mt-1 -mr-1 rounded-full hover:bg-bg-2 flex items-center justify-center cursor-pointer" onClick={stop} aria-label="Rondleiding sluiten">
            <X size={14} />
          </button>
        </div>
        <div className="font-tight font-bold text-[17px] mt-1 leading-tight">{s.titel}</div>
        <p className="text-[13.5px] text-ink-2 mt-2 leading-relaxed">{s.tekst}</p>
        {zoeken && <div className="text-[11px] text-ink-4 mt-2">Scherm laden…</div>}
        <div className="flex items-center justify-between mt-4">
          <button className="btn-ghost btn-sm" onClick={() => setStap(Math.max(0, stap - 1))} disabled={stap === 0}>
            <ArrowLeft size={14} /> Vorige
          </button>
          <div className="flex gap-1">
            {TOUR_STAPPEN.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === stap ? 'bg-accent' : 'bg-line-2'}`} />
            ))}
          </div>
          {laatste ? (
            <button className="btn-primary btn-sm" onClick={stop}>
              Afronden
            </button>
          ) : (
            <button className="btn-ink btn-sm" onClick={() => setStap(stap + 1)}>
              Volgende <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
