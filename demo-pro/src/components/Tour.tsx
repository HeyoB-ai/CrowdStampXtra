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
    titel: 'Welkom bij CrowdStamp Pro',
    tekst: 'In deze rondleiding volgen we één opdracht – de badkamerrenovatie van 12 woningen in Woerden – van het inladen van de opdracht tot de factuur in het boekhoudpakket. Klik op "Volgende" om te beginnen.',
  },
  {
    route: '/beheer',
    selector: '[data-tour="kpis"]',
    titel: 'Dashboard: alles in één blik',
    tekst: 'Lopende opdrachten, open werkbonnen, uren van deze week, meerwerk dat wacht op akkoord en het bedrag dat je nog kunt factureren. Daaronder staat wat aandacht nodig heeft.',
  },
  {
    route: '/beheer',
    selector: '[data-tour="grafiek"]',
    titel: 'Voor- versus nacalculatie',
    tekst: 'Per opdracht zie je direct of de werkelijke kosten binnen het budget blijven. De badkamerrenovatie (OPD-2026-009) loopt uit door het tegelwerk – daar komen we op terug.',
  },
  {
    route: '/beheer/opdrachten/import',
    selector: '[data-tour="import"]',
    titel: 'Stap 1 – Opdracht inladen',
    tekst: 'Opdrachten voer je handmatig in óf je importeert ze uit Excel/CSV, inclusief de voorcalculatie. Kolommen wijs je zelf toe; er is een voorbeeldbestand om mee te oefenen.',
  },
  {
    route: '/beheer/opdrachten/o_009',
    selector: '[data-tour="procesbalk"]',
    titel: 'De keten in één balk',
    tekst: 'Boven elke opdracht staat de procesbalk: Opdracht → Werkbon → Uren → Meerwerk → Calculatie → Facturatie. Per stap zie je de status, zodat je nooit hoeft te zoeken waar het werk staat.',
  },
  {
    route: '/beheer/werkbonnen',
    selector: '[data-tour="planbord"]',
    titel: 'Stap 2 – Werkbonnen plannen',
    tekst: 'Op het planbord sleep je werkbonnen naar een medewerker en dag. De monteur ziet de bon direct in zijn "Mijn dag" op de telefoon.',
  },
  {
    route: veldWerkbonVandaag,
    selector: '[data-tour="veld-checkin"]',
    titel: 'Stap 3 – Op locatie: inchecken',
    tekst: 'Dit is het scherm van de monteur. Eén tik: GPS-check-in, dan werkzaamheden afvinken, uren, materiaal, foto’s en de handtekening van de klant. Dezelfde eenvoud als de huidige CrowdStamp-app.',
    rol: 'veld',
  },
  {
    route: veldWerkbonVandaag,
    selector: '[data-tour="veld-meerwerk"]',
    titel: 'Stap 4 – Meerwerk melden vanaf de bouw',
    tekst: 'Ziet de monteur iets wat niet in de opdracht zit? Foto, omschrijving, geschatte uren en materiaal – en de projectleider heeft het meerwerk direct in beeld.',
    rol: 'veld',
  },
  {
    route: '/beheer/uren',
    selector: '[data-tour="uren-afwijkingen"]',
    titel: 'Uren controleren en goedkeuren',
    tekst: 'Alle uren per week, medewerker en opdracht. Afwijkingen worden gemarkeerd: geen check-out, meer dan 10 uur, of ingecheckt buiten 250 meter van de locatie. Goedkeuren kan in bulk.',
    rol: 'beheer',
  },
  {
    route: '/beheer/meerwerk',
    selector: '[data-tour="meerwerk-lijst"]',
    titel: 'Meerwerk ter akkoord naar de klant',
    tekst: 'Elke meerwerkpost krijgt een deelbare akkoord-pagina met foto’s, bedrag en tekenveld. Na akkoord komt het meerwerk automatisch in de calculatie en staat het klaar voor facturatie.',
  },
  {
    route: '/beheer/calculatie/o_009',
    selector: '[data-tour="nacalculatie"]',
    titel: 'Stap 5 – Voor- en nacalculatie',
    tekst: 'Begroot versus werkelijk per kostensoort, marge, voortgang en een prognose van het eindresultaat. Hier zie je dat de onderaanneming (tegelwerk) fors uitloopt – vóór het te laat is.',
  },
  {
    route: '/beheer/facturatie',
    selector: '[data-tour="factuur-nieuw"]',
    titel: 'Stap 6 – Factureren',
    tekst: 'Termijnfactuur op basis van voortgang, regiefactuur op goedgekeurde uren en materiaal, of een meerwerkfactuur op akkoord gegeven posten. Inclusief A4-voorbeeld, PDF en btw-verlegging waar nodig.',
  },
  {
    route: '/beheer/integraties',
    selector: '[data-tour="integraties"]',
    titel: 'Stap 7 – Naar het boekhoudpakket',
    tekst: 'Facturen en uren gaan automatisch naar Exact, AFAS, Twinfield of SnelStart; betaalstatus komt terug. Geen koppeling? Dan exporteer je UBL 2.1 (Peppol) of een CSV-journaalpost. De keten is rond.',
  },
  {
    route: '/beheer',
    titel: 'Dat was de rondleiding',
    tekst: 'Klik gerust overal rond – alles is echt werkend met fictieve data. Met "Demo resetten" bovenin zet je alles terug. Wissel van rol om het monteursscherm op je telefoon te proberen.',
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
