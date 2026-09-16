import { Briefcase, Calculator, ClipboardList, Clock, Database, FileText, HardHat, LayoutDashboard, Menu, PlugZap, PlusSquare, RotateCcw, Sparkles, User, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useRol } from '../data/RolContext'
import { useStore } from '../data/StoreContext'
import { Logo, Modal, useToast } from './ui'
import { useTour } from './Tour'

/* ── Demo-balk bovenaan ── */
export function DemoBar() {
  const store = useStore()
  const toast = useToast()
  const tour = useTour()
  const [bevestig, setBevestig] = useState(false)
  return (
    <>
      <div className="no-print bg-ink text-white/85 text-[11.5px] px-4 h-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          <span className="truncate">Demo-omgeving – fictieve gegevens</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/10 cursor-pointer" onClick={() => tour.start()}>
            <Sparkles size={12} /> <span className="hidden sm:inline">Rondleiding</span>
          </button>
          <button className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/10 cursor-pointer" onClick={() => setBevestig(true)}>
            <RotateCcw size={12} /> <span className="hidden sm:inline">Demo resetten</span>
          </button>
        </div>
      </div>
      <Modal
        open={bevestig}
        onClose={() => setBevestig(false)}
        titel="Demo resetten?"
        footer={
          <>
            <button className="btn-outline btn-sm" onClick={() => setBevestig(false)}>
              Annuleren
            </button>
            <button
              className="btn-primary btn-sm"
              onClick={() => {
                store.resetDemo()
                setBevestig(false)
                toast('Demo-gegevens hersteld', 'good')
              }}
            >
              Ja, herstel de voorbeelddata
            </button>
          </>
        }
      >
        <p className="text-[14px] text-ink-2">Alle wijzigingen die je in deze demo hebt gemaakt worden verwijderd en de oorspronkelijke voorbeelddata komt terug.</p>
      </Modal>
    </>
  )
}

/* ── Rolwisselaar ── */
export function RolWisselaar({ compact: _compact = false }: { compact?: boolean }) {
  const { rol, setRol } = useRol()
  const nav = useNavigate()
  const kies = (r: 'beheer' | 'veld') => {
    setRol(r)
    nav(r === 'beheer' ? '/beheer' : '/veld')
  }
  return (
    <div className="inline-flex rounded-[10px] border border-line bg-bg-2 p-0.5 text-[12px] font-semibold" data-tour="rolwisselaar">
      <button onClick={() => kies('beheer')} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] cursor-pointer transition ${rol === 'beheer' ? 'bg-paper shadow-sm text-ink' : 'text-ink-3 hover:text-ink-2'}`}>
        <Briefcase size={13} /> Projectleider
      </button>
      <button onClick={() => kies('veld')} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] cursor-pointer transition ${rol === 'veld' ? 'bg-paper shadow-sm text-ink' : 'text-ink-3 hover:text-ink-2'}`}>
        <HardHat size={13} /> Monteur
      </button>
    </div>
  )
}

const NAV = [
  { to: '/beheer', label: 'Dashboard', icon: LayoutDashboard, end: true, tour: 'nav-dashboard' },
  { to: '/beheer/opdrachten', label: 'Opdrachten', icon: ClipboardList, tour: 'nav-opdrachten' },
  { to: '/beheer/werkbonnen', label: 'Werkbonnen', icon: FileText, tour: 'nav-werkbonnen' },
  { to: '/beheer/uren', label: 'Uren', icon: Clock, tour: 'nav-uren' },
  { to: '/beheer/meerwerk', label: 'Meerwerk', icon: PlusSquare, tour: 'nav-meerwerk' },
  { to: '/beheer/calculatie', label: 'Calculatie', icon: Calculator, tour: 'nav-calculatie' },
  { to: '/beheer/facturatie', label: 'Facturatie', icon: FileText, tour: 'nav-facturatie' },
  { to: '/beheer/stamgegevens', label: 'Stamgegevens', icon: Database, tour: 'nav-stamgegevens' },
  { to: '/beheer/integraties', label: 'Integraties', icon: PlugZap, tour: 'nav-integraties' },
]

/* ── Beheer-layout (desktop-first, werkt ook op mobiel) ── */
export function BeheerLayout() {
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  const { rol, setRol } = useRol()
  // Rol volgt de route (ook bij direct navigeren via URL)
  useEffect(() => {
    if (rol !== 'beheer') setRol('beheer')
  }, [rol, setRol])
  return (
    <div className="min-h-dvh flex flex-col">
      <DemoBar />
      <header className="no-print sticky top-0 z-[100] bg-[rgba(250,249,246,0.88)] backdrop-blur-md border-b border-line">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button className="lg:hidden w-9 h-9 rounded-[10px] flex items-center justify-center hover:bg-bg-2 cursor-pointer" onClick={() => setMenu(true)} aria-label="Menu">
              <Menu size={18} />
            </button>
            <Link to="/" className="shrink-0">
              <Logo />
            </Link>
            <nav className="hidden lg:flex items-center gap-0.5 ml-2">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  data-tour={n.tour}
                  className={({ isActive }) => `px-2.5 py-1.5 rounded-[8px] text-[13px] font-medium transition ${isActive ? 'bg-ink text-white' : 'text-ink-2 hover:bg-bg-2'}`}
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <RolWisselaar compact />
            <div className="hidden md:flex items-center gap-2 text-[12.5px] text-ink-3">
              <span className="w-7 h-7 rounded-full bg-ink text-white inline-flex items-center justify-center text-[11px] font-bold">PM</span>
              <span className="hidden xl:inline">Pieter van der Meulen</span>
            </div>
          </div>
        </div>
      </header>
      {menu && (
        <div className="fixed inset-0 z-[150] lg:hidden" onClick={() => setMenu(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-paper p-4 flex flex-col gap-1 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <Logo />
              <button className="w-8 h-8 rounded-full bg-bg-2 flex items-center justify-center cursor-pointer" onClick={() => setMenu(false)}>
                <X size={15} />
              </button>
            </div>
            {NAV.map((n) => {
              const actief = n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)
              return (
                <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMenu(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium ${actief ? 'bg-ink text-white' : 'text-ink-2 hover:bg-bg-2'}`}>
                  <n.icon size={16} /> {n.label}
                </NavLink>
              )
            })}
          </div>
        </div>
      )}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-5 md:py-7">
        <Outlet />
      </main>
    </div>
  )
}

/* ── Veld-layout: smal, grote knoppen, tabbalk onderin (zoals app.html) ── */
export function VeldLayout() {
  const { veldMedewerkerId, rol, setRol } = useRol()
  useEffect(() => {
    if (rol !== 'veld') setRol('veld')
  }, [rol, setRol])
  const store = useStore()
  const mw = store.getMedewerker(veldMedewerkerId)
  const loc = useLocation()
  const tabs = [
    { to: '/veld', label: 'Mijn dag', icon: Clock, end: true },
    { to: '/veld/werkbonnen', label: 'Werkbonnen', icon: FileText },
    { to: '/veld/mij', label: 'Mij', icon: User },
  ]
  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      <DemoBar />
      <div className="w-full max-w-[480px] mx-auto flex-1 flex flex-col relative">
        <header className="sticky top-0 z-[100] bg-paper border-b border-line px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            {mw && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-3">
                <span className="w-6 h-6 rounded-full text-white inline-flex items-center justify-center text-[10px] font-bold" style={{ background: mw.kleur }}>
                  {mw.initialen}
                </span>
                <span className="hidden min-[380px]:inline">{mw.naam.split(' ')[0]}</span>
              </span>
            )}
            <RolWisselaar compact />
          </div>
        </header>
        <main className="flex-1 px-3.5 pt-4 pb-28">
          <Outlet />
        </main>
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-paper border-t border-line flex justify-around px-6 pt-2 pb-[max(18px,env(safe-area-inset-bottom))] z-[100]">
          {tabs.map((t) => {
            const actief = t.end ? loc.pathname === t.to : loc.pathname.startsWith(t.to)
            return (
              <NavLink key={t.to} to={t.to} end={t.end} className={`flex flex-col items-center gap-0.5 ${actief ? 'text-ink' : 'text-ink-4'}`}>
                <t.icon size={20} strokeWidth={1.6} />
                <span className="text-[10.5px] font-semibold">{t.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

/* ── Kale layout (klantakkoord-pagina) ── */
export function KaleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      <DemoBar />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
