import { AlertTriangle, ArrowRight, Clock, PlusSquare, Wallet } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, KpiCard, PageHeader } from '../../components/ui'
import { useStore } from '../../data/StoreContext'
import { afwijkingen, berekenNacalculatie, OPDRACHT_STATUS, urenVanRegel, WERKBON_STATUS } from '../../lib/calculatie'
import { datumKort, euro, euroKort, kapitaliseer, datumLang, urenLabel, vandaag, weekDagen, weekNummer, weekStart } from '../../lib/format'

export default function Dashboard() {
  const store = useStore()
  const nav = useNavigate()
  const vd = vandaag()
  const week = weekDagen(weekStart(vd))
  const opdrachten = store.getOpdrachten()
  const lopend = opdrachten.filter((o) => o.status === 'in_uitvoering')
  const werkbonnen = store.getWerkbonnen()
  const openWb = werkbonnen.filter((w) => w.status !== 'goedgekeurd' && w.datum <= vd)
  const uren = store.getUren()
  const urenWeek = uren.filter((u) => week.includes(u.datum))
  const totUrenWeek = urenWeek.reduce((s, u) => s + urenVanRegel(u), 0)
  const nietGoed = uren.filter((u) => !u.goedgekeurd && u.eind)
  const meerwerk = store.getMeerwerk()
  const terAkkoord = meerwerk.filter((m) => m.status === 'ter_akkoord')
  const gemeld = meerwerk.filter((m) => m.status === 'gemeld')
  const ncs = opdrachten.filter((o) => o.status !== 'offerte').map((o) => berekenNacalculatie(store, o.id)!)
  const teFactureren = ncs.reduce((s, n) => s + n.teFactureren, 0)
  const budget90 = ncs.filter((n) => n.opdracht.status === 'in_uitvoering' && (n.budgetVerbruiktPct > 90 || n.kleur === 'bad'))
  const afw = uren.filter((u) => afwijkingen(u, store.getOpdracht(u.opdrachtId), vd).length > 0 && !u.goedgekeurd)
  const gereedWb = werkbonnen.filter((w) => w.status === 'gereed')
  const erpFout = store.getFacturen().filter((f) => f.erpStatus === 'fout')
  const vervallen = store.getFacturen().filter((f) => f.status === 'verzonden' && f.vervaldatum < vd)

  const grafiek = ncs
    .filter((n) => n.opdracht.status !== 'gepland')
    .map((n) => ({
      naam: n.opdracht.nummer.slice(-3),
      volledig: `${n.opdracht.nummer} – ${n.opdracht.omschrijving}`,
      Begroot: Math.round(n.begrootKost),
      Werkelijk: Math.round(n.werkelijkKost),
      Prognose: Math.round(n.prognoseKost),
      voortgang: n.voortgang,
    }))

  const vandaagBonnen = werkbonnen.filter((w) => w.datum === vd).sort((a, b) => a.geplandStart.localeCompare(b.geplandStart))

  const aandacht: { icon: typeof Clock; kleur: string; tekst: string; sub: string; to: string }[] = [
    ...gereedWb.slice(0, 1).map(() => ({ icon: Clock, kleur: 'text-warn bg-amber-50', tekst: `${gereedWb.length} werkbon${gereedWb.length > 1 ? 'nen' : ''} gereed, wacht op goedkeuring`, sub: gereedWb.map((w) => w.nummer).slice(0, 4).join(', ') + (gereedWb.length > 4 ? '…' : ''), to: '/beheer/werkbonnen' })),
    ...(nietGoed.length ? [{ icon: Clock, kleur: 'text-accent bg-accent-soft', tekst: `${nietGoed.length} urenregels nog niet goedgekeurd (${urenLabel(nietGoed.reduce((s, u) => s + urenVanRegel(u), 0))} uur)`, sub: afw.length ? `waarvan ${afw.length} met afwijking (geen check-out, >10 u, buiten locatie)` : 'geen afwijkingen', to: '/beheer/uren' }] : []),
    ...terAkkoord.map((m) => ({ icon: PlusSquare, kleur: 'text-warn bg-amber-50', tekst: `Meerwerk ${m.nummer} wacht op akkoord klant · ${euro(m.bedrag)}`, sub: `${store.getOpdracht(m.opdrachtId)?.nummer} · ${m.omschrijving}`, to: `/beheer/opdrachten/${m.opdrachtId}?tab=meerwerk` })),
    ...gemeld.map((m) => ({ icon: PlusSquare, kleur: 'text-ink-2 bg-bg-2', tekst: `Meerwerk ${m.nummer} gemeld vanaf de bouw · ${euro(m.bedrag)}`, sub: `Beoordelen en ter akkoord sturen · ${m.omschrijving}`, to: `/beheer/opdrachten/${m.opdrachtId}?tab=meerwerk` })),
    ...budget90.map((n) => ({ icon: AlertTriangle, kleur: 'text-bad bg-red-50', tekst: `${n.opdracht.nummer}: budget ${Math.round(n.budgetVerbruiktPct)}% verbruikt bij ${n.voortgang}% voortgang${n.budgetVerbruiktPct > 90 ? ' (> 90%)' : ''}`, sub: `Prognose resultaat ${euro(n.prognoseResultaat)} t.o.v. begroot ${euro(n.begrootResultaat)}`, to: `/beheer/calculatie/${n.opdracht.id}` })),
    ...erpFout.map((f) => ({ icon: AlertTriangle, kleur: 'text-bad bg-red-50', tekst: `Factuur ${f.nummer} niet gesynchroniseerd met ERP`, sub: f.erpMelding ?? 'Fout', to: `/beheer/facturatie/${f.id}` })),
    ...vervallen.map((f) => ({ icon: Wallet, kleur: 'text-warn bg-amber-50', tekst: `Factuur ${f.nummer} over vervaldatum · ${euro(f.totaal)}`, sub: `${store.getKlant(f.klantId)?.naam}`, to: `/beheer/facturatie/${f.id}` })),
  ]

  return (
    <div>
      <PageHeader eyebrow={kapitaliseer(datumLang(vd)) + ` · week ${weekNummer(vd)}`} titel="Goedemorgen, Pieter" sub={`${lopend.length} opdrachten in uitvoering · ${vandaagBonnen.length} werkbonnen vandaag · ${store.getMedewerkers().length} medewerkers`} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5" data-tour="kpis">
        <KpiCard label="Lopende opdrachten" waarde={lopend.length} sub={`${opdrachten.filter((o) => o.status === 'gepland').length} gepland · ${opdrachten.filter((o) => o.status === 'offerte').length} offerte`} onClick={() => nav('/beheer/opdrachten')} />
        <KpiCard label="Open werkbonnen" waarde={openWb.length} sub={`${gereedWb.length} gereed, te keuren`} kleur={gereedWb.length ? 'warn' : undefined} onClick={() => nav('/beheer/werkbonnen')} />
        <KpiCard label="Uren deze week" waarde={urenLabel(totUrenWeek)} sub={`${urenWeek.filter((u) => !u.goedgekeurd).length} regels niet goedgekeurd`} onClick={() => nav('/beheer/uren')} />
        <KpiCard label="Meerwerk ter akkoord" waarde={euroKort(terAkkoord.reduce((s, m) => s + m.bedrag, 0))} sub={`${terAkkoord.length} bij klant · ${gemeld.length} gemeld`} kleur="warn" onClick={() => nav('/beheer/meerwerk')} />
        <KpiCard label="Te factureren" waarde={euroKort(teFactureren)} sub="excl. btw, o.b.v. voortgang en goedgekeurde uren" kleur="accent" onClick={() => nav('/beheer/facturatie')} />
      </div>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-4 mb-4">
        <div className="card p-4" data-tour="aandacht">
          <div className="flex items-center justify-between mb-3">
            <div className="font-tight font-semibold text-[15px]">Aandacht nodig</div>
            <span className="text-[12px] text-ink-3">{aandacht.length} punten</span>
          </div>
          {aandacht.length === 0 ? (
            <div className="text-[13px] text-ink-3 py-6 text-center">Alles is bij. 🎉</div>
          ) : (
            <div className="grid gap-1.5">
              {aandacht.slice(0, 8).map((a, i) => (
                <Link key={i} to={a.to} className="flex items-start gap-3 rounded-[10px] px-2.5 py-2 hover:bg-bg-2 transition">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${a.kleur}`}>
                    <a.icon size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium leading-snug">{a.tekst}</div>
                    <div className="text-[11.5px] text-ink-3 truncate">{a.sub}</div>
                  </div>
                  <ArrowRight size={14} className="text-ink-4 shrink-0 mt-1.5" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4" data-tour="grafiek">
          <div className="flex items-center justify-between mb-1">
            <div className="font-tight font-semibold text-[15px]">Voor- versus nacalculatie</div>
            <Link to="/beheer/calculatie" className="text-[12px] font-semibold text-accent">
              Alle opdrachten
            </Link>
          </div>
          <div className="text-[11.5px] text-ink-3 mb-2">Kosten per opdracht: begroot, werkelijk tot nu en prognose einde</div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grafiek} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" vertical={false} />
                <XAxis dataKey="naam" tick={{ fontSize: 11, fill: '#6b6b6b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b6b6b' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.09)', fontSize: 12, fontFamily: 'Inter' }}
                  formatter={(v) => euro(Number(v))}
                  labelFormatter={(_, p) => (p && p[0] ? String((p[0].payload as { volledig: string }).volledig) : '')}
                />
                <Legend wrapperStyle={{ fontSize: 11.5 }} iconType="circle" iconSize={8} />
                <Bar dataKey="Begroot" fill="#aaaaaa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Werkelijk" fill="#0f0f0f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Prognose" fill="#e8410a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <div className="font-tight font-semibold text-[15px]">Vandaag op de bouw</div>
            <Link to="/beheer/werkbonnen" className="text-[12px] font-semibold text-accent">
              Planbord
            </Link>
          </div>
          {vandaagBonnen.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-ink-3">Geen werkbonnen gepland voor vandaag.</div>
          ) : (
            <div className="divide-y divide-line">
              {vandaagBonnen.map((w) => {
                const o = store.getOpdracht(w.opdrachtId)
                const st = WERKBON_STATUS[w.status]
                return (
                  <Link key={w.id} to={`/beheer/opdrachten/${w.opdrachtId}?tab=werkbonnen`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-2/60">
                    <span className="text-[12px] tabular text-ink-3 w-10">{w.geplandStart}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{w.omschrijving}</div>
                      <div className="text-[11.5px] text-ink-3 truncate">
                        {o?.locatie.plaats} · {w.toegewezenAan.map((id) => store.getMedewerker(id)?.naam.split(' ')[0]).join(', ')}
                      </div>
                    </div>
                    <Badge label={st.label} kleur={st.kleur} />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <div className="font-tight font-semibold text-[15px]">Lopende opdrachten</div>
            <Link to="/beheer/opdrachten" className="text-[12px] font-semibold text-accent">
              Alle opdrachten
            </Link>
          </div>
          <div className="divide-y divide-line">
            {opdrachten
              .filter((o) => o.status === 'in_uitvoering' || o.status === 'gepland' || o.status === 'opgeleverd')
              .map((o) => {
                const n = berekenNacalculatie(store, o.id)!
                const st = OPDRACHT_STATUS[o.status]
                return (
                  <Link key={o.id} to={`/beheer/opdrachten/${o.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-2/60">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{o.omschrijving}</div>
                      <div className="text-[11.5px] text-ink-3">
                        {o.nummer} · {store.getKlant(o.klantId)?.naam} · start {datumKort(o.startdatum)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[13px] font-semibold tabular ${n.kleur === 'bad' ? 'text-bad' : n.kleur === 'warn' ? 'text-warn' : 'text-good'}`}>{euroKort(o.status === 'gepland' ? n.begrootResultaat : n.prognoseResultaat)}</div>
                      <div className="text-[11px] text-ink-3">{o.voortgang}% · {o.status === 'gepland' ? 'begroot' : 'prognose'}</div>
                    </div>
                    <Badge label={st.label} kleur={st.kleur} />
                  </Link>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
