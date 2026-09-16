import { useState } from 'react'
import { MeerwerkLijst } from '../../components/panels/MeerwerkPanel'
import { KpiCard, PageHeader, Tabs } from '../../components/ui'
import { useStore } from '../../data/StoreContext'
import { euro } from '../../lib/format'
import type { MeerwerkStatus } from '../../types'

type Tab = 'alle' | MeerwerkStatus

export default function Meerwerk() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('alle')
  const [opd, setOpd] = useState('alle')
  const alle = store.getMeerwerk().filter((m) => opd === 'alle' || m.opdrachtId === opd)
  const lijst = alle.filter((m) => tab === 'alle' || m.status === tab)
  const som = (s: MeerwerkStatus) => alle.filter((m) => m.status === s).reduce((t, m) => t + m.bedrag, 0)
  const n = (s: MeerwerkStatus) => alle.filter((m) => m.status === s).length

  return (
    <div>
      <PageHeader
        eyebrow="Meerwerk"
        titel="Meerwerk"
        sub="Gemeld vanaf de bouw, ter akkoord naar de klant, na akkoord automatisch in de calculatie en klaar voor facturatie."
        acties={
          <select className="input w-auto" value={opd} onChange={(e) => setOpd(e.target.value)}>
            <option value="alle">Alle opdrachten</option>
            {store.getOpdrachten().map((o) => (
              <option key={o.id} value={o.id}>
                {o.nummer} – {o.omschrijving}
              </option>
            ))}
          </select>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Gemeld (te beoordelen)" waarde={euro(som('gemeld'))} sub={`${n('gemeld')} post(en)`} onClick={() => setTab('gemeld')} />
        <KpiCard label="Ter akkoord bij klant" waarde={euro(som('ter_akkoord'))} sub={`${n('ter_akkoord')} post(en)`} kleur="warn" onClick={() => setTab('ter_akkoord')} />
        <KpiCard label="Akkoord" waarde={euro(som('akkoord'))} sub={`${alle.filter((m) => m.status === 'akkoord' && !m.gefactureerd).length} nog te factureren`} kleur="good" onClick={() => setTab('akkoord')} />
        <KpiCard label="Afgewezen" waarde={euro(som('afgewezen'))} sub={`${n('afgewezen')} post(en)`} onClick={() => setTab('afgewezen')} />
      </div>
      <div className="mb-4">
        <Tabs
          items={[
            { id: 'alle', label: 'Alle', teller: alle.length },
            { id: 'gemeld', label: 'Gemeld', teller: n('gemeld') },
            { id: 'ter_akkoord', label: 'Ter akkoord', teller: n('ter_akkoord') },
            { id: 'akkoord', label: 'Akkoord', teller: n('akkoord') },
            { id: 'afgewezen', label: 'Afgewezen', teller: n('afgewezen') },
          ]}
          actief={tab}
          onChange={setTab}
        />
      </div>
      <MeerwerkLijst items={lijst} toonOpdracht />
    </div>
  )
}
