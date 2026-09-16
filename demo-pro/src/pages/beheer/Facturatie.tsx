import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FacturenTabel, NieuweFactuurKnop } from '../../components/panels/FacturenPanel'
import { KpiCard, PageHeader, Tabs } from '../../components/ui'
import { useStore } from '../../data/StoreContext'
import { berekenNacalculatie } from '../../lib/calculatie'
import { euro, euroKort, vandaag } from '../../lib/format'
import type { FactuurStatus } from '../../types'

type Tab = 'alle' | FactuurStatus | 'te_factureren'

export default function Facturatie() {
  const store = useStore()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('alle')
  const facturen = store.getFacturen()
  const lijst = facturen.filter((f) => tab === 'alle' || f.status === tab)
  const som = (s: FactuurStatus) => facturen.filter((f) => f.status === s).reduce((t, f) => t + f.totaal, 0)
  const vervallen = facturen.filter((f) => f.status === 'verzonden' && f.vervaldatum < vandaag())
  const teFactureren = store
    .getOpdrachten()
    .filter((o) => o.status !== 'offerte')
    .map((o) => ({ o, nc: berekenNacalculatie(store, o.id)! }))
    .filter((x) => x.nc.teFactureren >= 1)
    .sort((a, b) => b.nc.teFactureren - a.nc.teFactureren)
  const totTeFactureren = teFactureren.reduce((s, x) => s + x.nc.teFactureren, 0)
  const erpFout = facturen.filter((f) => f.erpStatus === 'fout').length

  return (
    <div>
      <PageHeader eyebrow="Facturatie" titel="Facturatie" sub="Termijn-, regie-, meerwerk- en eindfacturen, rechtstreeks uit de opdracht. Verzonden facturen gaan automatisch naar het boekhoudpakket." acties={<NieuweFactuurKnop />} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Nog te factureren" waarde={euroKort(totTeFactureren)} sub={`${teFactureren.length} opdracht(en) · excl. btw`} kleur="accent" onClick={() => setTab('te_factureren')} />
        <KpiCard label="Concept" waarde={euroKort(som('concept'))} sub={`${facturen.filter((f) => f.status === 'concept').length} factuur/facturen`} onClick={() => setTab('concept')} />
        <KpiCard label="Openstaand (verzonden)" waarde={euroKort(som('verzonden'))} sub={vervallen.length ? `${vervallen.length} over vervaldatum` : 'niets vervallen'} kleur={vervallen.length ? 'warn' : undefined} onClick={() => setTab('verzonden')} />
        <KpiCard label="Betaald" waarde={euroKort(som('betaald'))} sub={erpFout ? `${erpFout} ERP-synchronisatie(s) mislukt` : 'alle facturen gesynchroniseerd'} kleur={erpFout ? 'bad' : 'good'} onClick={() => setTab('betaald')} />
      </div>
      <div className="mb-4">
        <Tabs
          items={[
            { id: 'alle', label: 'Alle facturen', teller: facturen.length },
            { id: 'concept', label: 'Concept', teller: facturen.filter((f) => f.status === 'concept').length },
            { id: 'verzonden', label: 'Verzonden', teller: facturen.filter((f) => f.status === 'verzonden').length },
            { id: 'betaald', label: 'Betaald', teller: facturen.filter((f) => f.status === 'betaald').length },
            { id: 'te_factureren', label: 'Te factureren', teller: teFactureren.length },
          ]}
          actief={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'te_factureren' ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Opdracht</th>
                <th className="th">Klant</th>
                <th className="th">Vorm</th>
                <th className="th text-right">Voortgang</th>
                <th className="th text-right">Gefactureerd</th>
                <th className="th text-right">Te factureren</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {teFactureren.map(({ o, nc }) => (
                <tr key={o.id} className="hover:bg-accent/[0.03]">
                  <td className="td">
                    <div className="text-[12.5px] font-semibold tabular">{o.nummer}</div>
                    <div className="text-[12.5px] text-ink-2">{o.omschrijving}</div>
                  </td>
                  <td className="td text-ink-2">{store.getKlant(o.klantId)?.naam}</td>
                  <td className="td text-[12.5px]">{o.contractvorm === 'aanneemsom' ? 'Aanneemsom' : 'Regie'}{o.btwVerlegd ? ' · verlegd' : ''}</td>
                  <td className="td text-right tabular">{o.voortgang}%</td>
                  <td className="td text-right tabular text-ink-2">{euro(nc.gefactureerd)}</td>
                  <td className="td text-right tabular font-semibold text-accent">{euro(nc.teFactureren)}</td>
                  <td className="td text-right">
                    <button className="btn-ink btn-sm" onClick={() => nav(`/beheer/opdrachten/${o.id}?tab=facturatie`)}>
                      Factureren
                    </button>
                  </td>
                </tr>
              ))}
              {teFactureren.length === 0 && (
                <tr>
                  <td className="td text-center text-ink-3 py-8" colSpan={7}>
                    Alles is gefactureerd.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <FacturenTabel facturen={lijst} toonOpdracht />
      )}
    </div>
  )
}
