import { ArrowRight, Briefcase, HardHat, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DemoBar } from '../components/Layout'
import { useTour } from '../components/Tour'
import { Logo } from '../components/ui'
import { useRol } from '../data/RolContext'

const KETEN = ['Opdracht', 'Werkbon', 'Uren & werk', 'Meerwerk', 'Calculatie', 'Facturatie', 'ERP-export']

export default function Start() {
  const nav = useNavigate()
  const tour = useTour()
  const { setRol } = useRol()
  const ga = (rol: 'beheer' | 'veld') => {
    setRol(rol)
    nav(rol === 'beheer' ? '/beheer' : '/veld')
  }
  return (
    <div className="min-h-dvh flex flex-col">
      <DemoBar />
      <header className="px-6 h-16 flex items-center justify-between max-w-[960px] mx-auto w-full">
        <Logo size={24} />
        <a href="https://crowdstamp.nl" target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-ink-3 hover:text-ink">
          crowdstamp.nl
        </a>
      </header>
      <main className="flex-1 max-w-[960px] mx-auto w-full px-6 pb-16">
        <section className="text-center pt-10 md:pt-16 pb-10">
          <div className="eyebrow mb-3">Demo · CrowdStamp Pro</div>
          <h1 className="text-[36px] md:text-[54px] font-bold leading-[1.05] tracking-[-0.04em]">
            Van opdracht tot factuur
            <br />
            in één keten
          </h1>
          <p className="text-[15px] md:text-[18px] text-ink-3 max-w-[560px] mx-auto mt-5 leading-relaxed">
            CrowdStamp Pro breidt de bekende GPS check-in uit met werkbonnen, uren, meerwerk, voor- en nacalculatie, facturatie en een koppeling met je boekhoudpakket. Voor aannemers en onderaannemers in de bouw en afbouw.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-8">
            <button
              className="btn-primary btn-lg"
              onClick={() => {
                setRol('beheer')
                nav('/beheer')
                setTimeout(() => tour.start(), 250)
              }}
            >
              <Sparkles size={16} /> Start rondleiding
            </button>
            <button className="btn-outline btn-lg" onClick={() => ga('beheer')}>
              Zelf rondkijken <ArrowRight size={16} />
            </button>
          </div>
        </section>

        <section className="card p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-center gap-y-3">
            {KETEN.map((k, i) => (
              <div key={k} className="flex items-center">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-ink text-white text-[12px] font-bold inline-flex items-center justify-center tabular">{i + 1}</span>
                  <span className="text-[13.5px] md:text-[14.5px] font-semibold">{k}</span>
                </div>
                {i < KETEN.length - 1 && <ArrowRight size={14} className="text-ink-4 mx-3 hidden sm:block" />}
              </div>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-4 mt-6">
          <button className="card p-6 text-left hover:border-line-2 transition cursor-pointer group" onClick={() => ga('beheer')}>
            <div className="w-10 h-10 rounded-[12px] bg-ink text-white flex items-center justify-center mb-4">
              <Briefcase size={18} />
            </div>
            <div className="font-tight font-bold text-[18px]">Projectleider / Administratie</div>
            <p className="text-[13.5px] text-ink-3 mt-1.5 leading-relaxed">Dashboard, opdrachten importeren, planbord, uren goedkeuren, meerwerk, nacalculatie, facturen en ERP-koppelingen. Werkt het best op desktop.</p>
            <div className="text-[13px] font-semibold text-accent mt-4 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              Open beheeromgeving <ArrowRight size={14} />
            </div>
          </button>
          <button className="card p-6 text-left hover:border-line-2 transition cursor-pointer group" onClick={() => ga('veld')}>
            <div className="w-10 h-10 rounded-[12px] bg-accent text-white flex items-center justify-center mb-4">
              <HardHat size={18} />
            </div>
            <div className="font-tight font-bold text-[18px]">Monteur / Uitvoerder</div>
            <p className="text-[13.5px] text-ink-3 mt-1.5 leading-relaxed">Mijn dag, werkbon openen, GPS-check-in, werkzaamheden afvinken, foto’s, materiaal, meerwerk melden en de klant laten tekenen. Gemaakt voor de telefoon.</p>
            <div className="text-[13px] font-semibold text-accent mt-4 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              Open veld-app <ArrowRight size={14} />
            </div>
          </button>
        </section>

        <p className="text-center text-[12px] text-ink-4 mt-10">
          Alle bedrijven, personen, adressen en bedragen in deze demo zijn fictief. Gegevens worden alleen in je eigen browser opgeslagen.
        </p>
      </main>
    </div>
  )
}
