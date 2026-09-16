import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader, useToast, Veld } from '../../components/ui'
import { nieuwId } from '../../data/store'
import { useStore } from '../../data/StoreContext'
import { KOSTENSOORTEN } from '../../lib/calculatie'
import { dagenVooruit, euro } from '../../lib/format'
import { coordsVoorPlaats } from '../../lib/geo'
import type { CalculatieRegel, Contractvorm, Kostensoort, OpdrachtStatus } from '../../types'

export default function OpdrachtNieuw() {
  const store = useStore()
  const toast = useToast()
  const nav = useNavigate()
  const klanten = store.getKlanten()
  const [f, setF] = useState({
    klantId: klanten[0]?.id ?? '',
    omschrijving: '',
    toelichting: '',
    straat: '',
    postcode: '',
    plaats: '',
    status: 'gepland' as OpdrachtStatus,
    startdatum: dagenVooruit(7),
    einddatum: dagenVooruit(35),
    contractvorm: 'aanneemsom' as Contractvorm,
    aanneemsom: 0,
    btw: '21',
  })
  const [regels, setRegels] = useState<CalculatieRegel[]>([
    { id: nieuwId('cr'), type: 'arbeid', omschrijving: 'Arbeid', aantal: 40, eenheid: 'uur', kostprijs: 38, verkoopprijs: 62, opslagPercentage: 63.2 },
    { id: nieuwId('cr'), type: 'materiaal', omschrijving: 'Materiaal', aantal: 1, eenheid: 'post', kostprijs: 1500, verkoopprijs: 1950, opslagPercentage: 30 },
  ])
  const zet = (patch: Partial<typeof f>) => setF({ ...f, ...patch })
  const zetRegel = (id: string, patch: Partial<CalculatieRegel>) =>
    setRegels(
      regels.map((r) => {
        if (r.id !== id) return r
        const n = { ...r, ...patch }
        n.opslagPercentage = n.kostprijs ? Math.round(((n.verkoopprijs - n.kostprijs) / n.kostprijs) * 1000) / 10 : 0
        return n
      }),
    )
  const totKost = regels.reduce((s, r) => s + r.aantal * r.kostprijs, 0)
  const totVerkoop = regels.reduce((s, r) => s + r.aantal * r.verkoopprijs, 0)

  const opslaan = () => {
    if (!f.omschrijving.trim() || !f.plaats.trim()) {
      toast('Vul minimaal een omschrijving en plaats in', 'bad')
      return
    }
    const o = store.createOpdracht({
      klantId: f.klantId,
      omschrijving: f.omschrijving.trim(),
      toelichting: f.toelichting.trim() || undefined,
      locatie: { straat: f.straat, postcode: f.postcode, plaats: f.plaats, ...coordsVoorPlaats(f.plaats) },
      status: f.status,
      startdatum: f.startdatum,
      einddatum: f.einddatum,
      contractvorm: f.contractvorm,
      aanneemsom: f.contractvorm === 'aanneemsom' ? f.aanneemsom || totVerkoop : undefined,
      voorcalculatie: regels.filter((r) => r.omschrijving.trim()),
      btwVerlegd: f.btw === 'verlegd',
      btwPercentage: f.btw === '9' ? 9 : 21,
      documenten: [],
      projectleiderId: 'm_pieter',
      voortgang: 0,
    })
    toast(`Opdracht ${o.nummer} aangemaakt`, 'good')
    nav(`/beheer/opdrachten/${o.id}`)
  }

  return (
    <div className="max-w-4xl">
      <Link to="/beheer/opdrachten" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-3 hover:text-ink mb-3">
        <ArrowLeft size={13} /> Opdrachten
      </Link>
      <PageHeader
        eyebrow="Opdracht inladen"
        titel="Nieuwe opdracht"
        sub="Handmatig invoeren. Liever uit Excel of CSV? Gebruik dan Importeren."
        acties={
          <Link to="/beheer/opdrachten/import" className="btn-outline btn-sm">
            <Upload size={13} /> Importeren
          </Link>
        }
      />
      <div className="grid gap-4">
        <div className="card p-5 grid gap-3">
          <div className="font-tight font-semibold text-[15px]">Gegevens</div>
          <div className="grid md:grid-cols-2 gap-3">
            <Veld label="Klant" className="md:col-span-2">
              <select className="input" value={f.klantId} onChange={(e) => zet({ klantId: e.target.value })}>
                {klanten.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.naam} (deb. {k.debiteurnummer})
                  </option>
                ))}
              </select>
            </Veld>
            <Veld label="Omschrijving" className="md:col-span-2">
              <input className="input" value={f.omschrijving} onChange={(e) => zet({ omschrijving: e.target.value })} placeholder="Bijv. Renovatie 8 badkamers Vondelflat" autoFocus />
            </Veld>
            <Veld label="Toelichting" className="md:col-span-2">
              <textarea className="input min-h-[70px]" value={f.toelichting} onChange={(e) => zet({ toelichting: e.target.value })} />
            </Veld>
            <Veld label="Straat en huisnummer">
              <input className="input" value={f.straat} onChange={(e) => zet({ straat: e.target.value })} />
            </Veld>
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <Veld label="Postcode">
                <input className="input" value={f.postcode} onChange={(e) => zet({ postcode: e.target.value })} />
              </Veld>
              <Veld label="Plaats" hint="Coördinaten worden in de demo afgeleid van de plaats">
                <input className="input" value={f.plaats} onChange={(e) => zet({ plaats: e.target.value })} placeholder="Woerden" />
              </Veld>
            </div>
            <Veld label="Status">
              <select className="input" value={f.status} onChange={(e) => zet({ status: e.target.value as OpdrachtStatus })}>
                <option value="offerte">Offerte</option>
                <option value="gepland">Gepland</option>
                <option value="in_uitvoering">In uitvoering</option>
              </select>
            </Veld>
            <div className="grid grid-cols-2 gap-3">
              <Veld label="Startdatum">
                <input type="date" className="input" value={f.startdatum} onChange={(e) => zet({ startdatum: e.target.value })} />
              </Veld>
              <Veld label="Einddatum">
                <input type="date" className="input" value={f.einddatum} onChange={(e) => zet({ einddatum: e.target.value })} />
              </Veld>
            </div>
            <Veld label="Contractvorm">
              <select className="input" value={f.contractvorm} onChange={(e) => zet({ contractvorm: e.target.value as Contractvorm })}>
                <option value="aanneemsom">Aanneemsom (vaste prijs, termijnfacturen)</option>
                <option value="regie">Regie (uren × tarief + materiaal)</option>
              </select>
            </Veld>
            {f.contractvorm === 'aanneemsom' ? (
              <Veld label="Aanneemsom excl. btw" hint={`Leeg = begrote verkoopwaarde (${euro(totVerkoop)})`}>
                <input type="number" className="input" value={f.aanneemsom || ''} onChange={(e) => zet({ aanneemsom: Number(e.target.value) })} placeholder={String(Math.round(totVerkoop))} />
              </Veld>
            ) : (
              <div />
            )}
            <Veld label="Btw-regime">
              <select className="input" value={f.btw} onChange={(e) => zet({ btw: e.target.value })}>
                <option value="21">21%</option>
                <option value="9">9% (schilderen/stukadoren woningen &gt; 2 jaar)</option>
                <option value="verlegd">Btw verlegd (onderaanneming)</option>
              </select>
            </Veld>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-line flex items-center justify-between">
            <div className="font-tight font-semibold text-[15px]">Voorcalculatie</div>
            <button className="btn-outline btn-sm" onClick={() => setRegels([...regels, { id: nieuwId('cr'), type: 'arbeid', omschrijving: '', aantal: 1, eenheid: 'uur', kostprijs: 38, verkoopprijs: 62, opslagPercentage: 63.2 }])}>
              <Plus size={13} /> Regel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  <th className="th">Soort</th>
                  <th className="th">Omschrijving</th>
                  <th className="th w-24">Aantal</th>
                  <th className="th w-20">Eenheid</th>
                  <th className="th w-28">Kostprijs</th>
                  <th className="th w-28">Verkoop</th>
                  <th className="th text-right">Totaal verkoop</th>
                  <th className="th w-10"></th>
                </tr>
              </thead>
              <tbody>
                {regels.map((r) => (
                  <tr key={r.id}>
                    <td className="td">
                      <select className="input !py-1 text-[12.5px]" value={r.type} onChange={(e) => zetRegel(r.id, { type: e.target.value as Kostensoort })}>
                        {KOSTENSOORTEN.map((k) => (
                          <option key={k.code} value={k.code}>
                            {k.naam}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="td">
                      <input className="input !py-1" value={r.omschrijving} onChange={(e) => zetRegel(r.id, { omschrijving: e.target.value })} />
                    </td>
                    <td className="td">
                      <input type="number" className="input !py-1" value={r.aantal} onChange={(e) => zetRegel(r.id, { aantal: Number(e.target.value) })} />
                    </td>
                    <td className="td">
                      <input className="input !py-1" value={r.eenheid} onChange={(e) => zetRegel(r.id, { eenheid: e.target.value })} />
                    </td>
                    <td className="td">
                      <input type="number" className="input !py-1" value={r.kostprijs} onChange={(e) => zetRegel(r.id, { kostprijs: Number(e.target.value) })} />
                    </td>
                    <td className="td">
                      <input type="number" className="input !py-1" value={r.verkoopprijs} onChange={(e) => zetRegel(r.id, { verkoopprijs: Number(e.target.value) })} />
                    </td>
                    <td className="td text-right tabular font-semibold">{euro(r.aantal * r.verkoopprijs)}</td>
                    <td className="td">
                      <button className="w-7 h-7 rounded-[8px] hover:bg-bg-2 flex items-center justify-center cursor-pointer text-ink-3" onClick={() => setRegels(regels.filter((x) => x.id !== r.id))}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-line text-[13px] flex flex-wrap gap-6 justify-end tabular">
            <span>
              Kostprijs <span className="font-semibold">{euro(totKost)}</span>
            </span>
            <span>
              Verkoop <span className="font-semibold">{euro(totVerkoop)}</span>
            </span>
            <span>
              Marge <span className="font-semibold text-good">{euro(totVerkoop - totKost)}</span>
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link to="/beheer/opdrachten" className="btn-outline">
            Annuleren
          </Link>
          <button className="btn-ink" onClick={opslaan}>
            <Plus size={15} /> Opdracht aanmaken
          </button>
        </div>
      </div>
    </div>
  )
}
