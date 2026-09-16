import { ArrowRight } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { NacalculatiePanel } from '../../components/panels/CalculatiePanel'
import { Badge, PageHeader, Voortgang } from '../../components/ui'
import { useStore } from '../../data/StoreContext'
import { berekenNacalculatie, OPDRACHT_STATUS } from '../../lib/calculatie'
import { euro, euroKort, procent } from '../../lib/format'

const KLEUR = { good: 'bg-green-50 text-good', warn: 'bg-amber-50 text-warn', bad: 'bg-red-50 text-bad' }
const LABEL = { good: 'Op koers', warn: 'Let op', bad: 'Overschrijding' }

export default function Calculatie() {
  const { id } = useParams()
  const store = useStore()
  const nav = useNavigate()
  const opdrachten = store.getOpdrachten().filter((o) => o.status !== 'offerte')

  if (id) {
    const o = store.getOpdracht(id)
    if (!o) return <div className="card p-6 text-ink-3">Opdracht niet gevonden.</div>
    return (
      <div>
        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-3 mb-3">
          <Link to="/beheer/calculatie" className="hover:text-ink">
            Calculatie
          </Link>
          <span>/</span>
          <span className="text-ink">{o.nummer}</span>
        </div>
        <PageHeader
          eyebrow={`${o.nummer} · ${o.contractvorm === 'aanneemsom' ? 'Aanneemsom' : 'Regie'}`}
          titel={o.omschrijving}
          sub={`${store.getKlant(o.klantId)?.naam} · ${o.locatie.plaats}`}
          acties={
            <>
              <select className="input w-auto" value={id} onChange={(e) => nav(`/beheer/calculatie/${e.target.value}`)}>
                {opdrachten.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nummer} – {x.omschrijving}
                  </option>
                ))}
              </select>
              <Link to={`/beheer/opdrachten/${o.id}`} className="btn-outline btn-sm">
                Naar opdracht <ArrowRight size={13} />
              </Link>
            </>
          }
        />
        <NacalculatiePanel opdrachtId={id} />
      </div>
    )
  }

  const rijen = opdrachten.map((o) => berekenNacalculatie(store, o.id)!)
  const totBegroot = rijen.reduce((s, r) => s + r.begrootResultaat, 0)
  const totPrognose = rijen.reduce((s, r) => s + r.prognoseResultaat, 0)

  return (
    <div>
      <PageHeader eyebrow="Voor- en nacalculatie" titel="Calculatie" sub="Begroot versus werkelijk per opdracht. Klik op een opdracht voor de uitsplitsing per kostensoort." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="card p-4">
          <div className="text-[11.5px] text-ink-3">Begroot resultaat (alle opdrachten)</div>
          <div className="font-tight text-[24px] font-semibold tabular mt-1">{euro(totBegroot)}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11.5px] text-ink-3">Prognose resultaat</div>
          <div className={`font-tight text-[24px] font-semibold tabular mt-1 ${totPrognose < totBegroot * 0.9 ? 'text-warn' : 'text-good'}`}>{euro(totPrognose)}</div>
          <div className="text-[12px] text-ink-3 mt-1">{totPrognose >= totBegroot ? '+' : ''}{euro(totPrognose - totBegroot)} t.o.v. begroot</div>
        </div>
        <div className="card p-4">
          <div className="text-[11.5px] text-ink-3">Opdrachten met overschrijding</div>
          <div className="font-tight text-[24px] font-semibold tabular mt-1 text-bad">{rijen.filter((r) => r.kleur === 'bad').length}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11.5px] text-ink-3">Budget &gt; 90% verbruikt</div>
          <div className="font-tight text-[24px] font-semibold tabular mt-1 text-warn">{rijen.filter((r) => r.budgetVerbruiktPct > 90 && r.opdracht.status === 'in_uitvoering').length}</div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr>
                <th className="th">Opdracht</th>
                <th className="th">Status</th>
                <th className="th text-right">Contractwaarde</th>
                <th className="th text-right">Begroot kost</th>
                <th className="th text-right">Werkelijk kost</th>
                <th className="th w-[150px]">Budget / voortgang</th>
                <th className="th text-right">Begroot res.</th>
                <th className="th text-right">Prognose res.</th>
                <th className="th text-right">Marge</th>
                <th className="th">Signaal</th>
              </tr>
            </thead>
            <tbody>
              {rijen
                .sort((a, b) => (a.kleur === 'bad' ? -1 : b.kleur === 'bad' ? 1 : a.kleur === 'warn' ? -1 : 1))
                .map((r) => {
                  const o = r.opdracht
                  const st = OPDRACHT_STATUS[o.status]
                  return (
                    <tr key={o.id} className="hover:bg-accent/[0.03] cursor-pointer" onClick={() => nav(`/beheer/calculatie/${o.id}`)}>
                      <td className="td">
                        <div className="text-[12.5px] font-semibold tabular">{o.nummer}</div>
                        <div className="text-[12.5px] text-ink-2 max-w-[260px] truncate">{o.omschrijving}</div>
                      </td>
                      <td className="td">
                        <Badge label={st.label} kleur={st.kleur} />
                      </td>
                      <td className="td text-right tabular">{euroKort(r.contractwaarde)}</td>
                      <td className="td text-right tabular text-ink-2">{euroKort(r.begrootKost)}</td>
                      <td className="td text-right tabular font-semibold">{euroKort(r.werkelijkKost)}</td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <Voortgang pct={r.budgetVerbruiktPct} kleur={r.budgetVerbruiktPct > 100 ? 'bad' : r.budgetVerbruiktPct > o.voortgang + 5 ? 'warn' : 'good'} dun />
                          <span className="text-[11.5px] tabular text-ink-3 whitespace-nowrap">
                            {Math.round(r.budgetVerbruiktPct)}% / {o.voortgang}%
                          </span>
                        </div>
                      </td>
                      <td className="td text-right tabular text-ink-2">{euroKort(r.begrootResultaat)}</td>
                      <td className={`td text-right tabular font-semibold ${r.kleur === 'bad' ? 'text-bad' : r.kleur === 'warn' ? 'text-warn' : 'text-good'}`}>{euroKort(r.prognoseResultaat)}</td>
                      <td className="td text-right tabular">{procent(r.prognoseMargePct, 1)}</td>
                      <td className="td">
                        <Badge label={LABEL[r.kleur]} kleur={KLEUR[r.kleur]} />
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
