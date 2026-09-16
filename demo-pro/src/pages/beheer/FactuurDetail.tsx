import { ArrowLeft, Check, Download, FileCode2, Printer, RefreshCw, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Leeg, Logo, Modal, Rij, Spinner, useToast } from '../../components/ui'
import { useStore } from '../../data/StoreContext'
import { ERP_NAAM, ERP_STATUS, FACTUUR_STATUS, FACTUUR_TYPE } from '../../lib/calculatie'
import { totalen, werkOpdrachtStatusBij } from '../../lib/factuur'
import { datum, euro, getal } from '../../lib/format'
import { downloadBestand } from '../../lib/image'
import { maakJournaalCsv } from '../../lib/journaal'
import { maakUbl } from '../../lib/ubl'
import { actievePakketten, bijFactuurVerzonden, pushFactuur } from '../../integrations/sync'

export default function FactuurDetail() {
  const { id = '' } = useParams()
  const store = useStore()
  const toast = useToast()
  const nav = useNavigate()
  const f = store.getFactuur(id)
  const [bezig, setBezig] = useState(false)
  const [verwijder, setVerwijder] = useState(false)
  if (!f)
    return (
      <Leeg
        titel="Factuur niet gevonden"
        actie={
          <Link to="/beheer/facturatie" className="btn-outline btn-sm">
            Naar facturatie
          </Link>
        }
      />
    )
  const o = store.getOpdracht(f.opdrachtId)!
  const k = store.getKlant(f.klantId)!
  const b = store.getState().bedrijf
  const t = totalen(f.regels, f.btwVerlegd)
  const st = FACTUUR_STATUS[f.status]
  const erp = ERP_STATUS[f.erpStatus]
  const pakketten = actievePakketten(store)
  const generiek = store.getKoppeling('generiek')

  const verzend = async () => {
    setBezig(true)
    store.setFactuurStatus(f.id, 'verzonden')
    toast(`Factuur ${f.nummer} gemarkeerd als verzonden`, 'good')
    await bijFactuurVerzonden(store, f.id)
    setBezig(false)
  }
  const sync = async (pakket = pakketten[0]) => {
    if (!pakket) {
      toast('Geen boekhoudpakket verbonden – ga naar Integraties', 'bad')
      return
    }
    setBezig(true)
    const ok = await pushFactuur(store, pakket, f.id)
    setBezig(false)
    toast(ok ? `Gesynchroniseerd naar ${ERP_NAAM[pakket]}` : `Synchronisatie mislukt – zie synchronisatielog`, ok ? 'good' : 'bad')
  }
  const betaald = () => {
    store.setFactuurStatus(f.id, 'betaald')
    werkOpdrachtStatusBij(store, f.opdrachtId)
    toast('Factuur op betaald gezet', 'good')
  }
  const downloadUbl = () => {
    downloadBestand(`${f.nummer}.xml`, maakUbl(f, o, k, b, { kostenplaats: generiek.instellingen.kostenplaatsIsOpdracht ? o.nummer : undefined }), 'application/xml;charset=utf-8')
    store.addSyncLog({ pakket: 'generiek', richting: 'naar_erp', object: `Factuur ${f.nummer}`, objectId: f.id, status: 'ok', melding: 'UBL 2.1 (Peppol BIS 3.0) gedownload' })
    toast('UBL-bestand gedownload', 'good')
  }
  const downloadCsv = () => {
    downloadBestand(`journaalpost-${f.nummer}.csv`, maakJournaalCsv([{ f, o, k }], generiek.instellingen), 'text/csv;charset=utf-8')
    store.addSyncLog({ pakket: 'generiek', richting: 'naar_erp', object: `Factuur ${f.nummer}`, objectId: f.id, status: 'ok', melding: 'CSV-journaalpost gedownload' })
    toast('CSV-journaalpost gedownload', 'good')
  }

  return (
    <div>
      <div className="no-print">
        <button className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-3 hover:text-ink mb-3 cursor-pointer" onClick={() => nav(-1)}>
          <ArrowLeft size={13} /> Terug
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-tight font-bold text-[13px] tabular text-ink-3">{FACTUUR_TYPE[f.type]}</span>
              <Badge label={st.label} kleur={st.kleur} />
              <Badge label={erp.label + (f.erpPakket && f.erpStatus !== 'niet_gesynchroniseerd' ? ` · ${ERP_NAAM[f.erpPakket]}` : '')} kleur={erp.kleur} />
            </div>
            <h1 className="text-[26px] font-bold leading-tight mt-1">Factuur {f.nummer}</h1>
            <div className="text-[13.5px] text-ink-3">
              {k.naam} · <Link to={`/beheer/opdrachten/${o.id}`} className="underline decoration-line-2 hover:text-ink">{o.nummer}</Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline btn-sm" onClick={() => window.print()}>
              <Printer size={13} /> PDF / afdrukken
            </button>
            <button className="btn-outline btn-sm" onClick={downloadUbl}>
              <FileCode2 size={13} /> UBL 2.1
            </button>
            <button className="btn-outline btn-sm" onClick={downloadCsv}>
              <Download size={13} /> CSV-journaalpost
            </button>
            {f.status === 'concept' && (
              <button className="btn-ink btn-sm" onClick={verzend} disabled={bezig} data-tour="factuur-verzenden">
                {bezig ? <Spinner /> : <Send size={13} />} Verzenden
              </button>
            )}
            {f.status === 'verzonden' && (
              <button className="btn-ink btn-sm" onClick={betaald}>
                <Check size={13} /> Markeer als betaald
              </button>
            )}
            {f.status !== 'concept' && f.erpStatus !== 'gesynchroniseerd' && (
              <button className="btn-primary btn-sm" onClick={() => sync()} disabled={bezig}>
                {bezig ? <Spinner /> : <RefreshCw size={13} />} {f.erpStatus === 'fout' ? 'Opnieuw naar ERP' : 'Naar ERP'}
              </button>
            )}
          </div>
        </div>

        {f.erpStatus === 'fout' && f.erpMelding && (
          <div className="card p-3 mb-4 bg-red-50/60 border-bad/30 text-[13px]">
            <span className="font-semibold text-bad">ERP-fout:</span> {f.erpMelding}{' '}
            <Link to="/beheer/integraties" className="underline">
              Naar integraties
            </Link>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
        {/* A4-voorbeeld */}
        <div className="print-page bg-paper border border-line rounded-[4px] shadow-sm mx-auto w-full max-w-[794px] min-w-0 p-6 sm:p-8 md:p-12 text-[12.5px] leading-relaxed overflow-hidden" style={{ minHeight: 1000 }}>
          <div className="flex items-start justify-between gap-6">
            <div>
              <Logo size={26} pro={false} />
              <div className="text-[11px] text-ink-3 mt-1">powered by CrowdStamp Pro</div>
            </div>
            <div className="text-right text-[11.5px] text-ink-2">
              <div className="font-bold text-[13px] text-ink">{b.naam}</div>
              <div>{b.adres.straat}</div>
              <div>
                {b.adres.postcode} {b.adres.plaats}
              </div>
              <div className="mt-1">{b.telefoon}</div>
              <div>{b.email}</div>
              <div className="mt-1">KvK {b.kvk} · Btw {b.btw}</div>
              <div>IBAN {b.iban}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-10">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3 mb-1">Factuur aan</div>
              <div className="font-semibold text-[13.5px]">{k.naam}</div>
              <div>t.a.v. {k.contactpersoon}</div>
              <div>{k.adres.straat}</div>
              <div>
                {k.adres.postcode} {k.adres.plaats}
              </div>
              {k.kvk && <div className="text-ink-3 mt-1">KvK {k.kvk}</div>}
              <div className="text-ink-3">Debiteurnummer {k.debiteurnummer}</div>
            </div>
            <div>
              <h2 className="text-[26px] font-bold leading-none mb-3">Factuur</h2>
              <table className="text-[12px]">
                <tbody>
                  <tr>
                    <td className="pr-4 text-ink-3 py-0.5">Factuurnummer</td>
                    <td className="font-semibold tabular">{f.nummer}</td>
                  </tr>
                  <tr>
                    <td className="pr-4 text-ink-3 py-0.5">Factuurdatum</td>
                    <td className="tabular">{datum(f.datum)}</td>
                  </tr>
                  <tr>
                    <td className="pr-4 text-ink-3 py-0.5">Vervaldatum</td>
                    <td className="tabular">{datum(f.vervaldatum)}</td>
                  </tr>
                  <tr>
                    <td className="pr-4 text-ink-3 py-0.5">Uw referentie</td>
                    <td>{o.nummer}</td>
                  </tr>
                  <tr>
                    <td className="pr-4 text-ink-3 py-0.5">Project</td>
                    <td>{o.omschrijving}</td>
                  </tr>
                  <tr>
                    <td className="pr-4 text-ink-3 py-0.5">Werklocatie</td>
                    <td>
                      {o.locatie.straat}, {o.locatie.plaats}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 font-semibold text-[13.5px]">{f.omschrijving}</div>

          <table className="w-full mt-3 text-[12px]">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="text-left py-2 font-semibold">Omschrijving</th>
                <th className="text-right py-2 font-semibold w-20">Aantal</th>
                <th className="text-right py-2 font-semibold w-24">Prijs</th>
                <th className="text-right py-2 font-semibold w-14">Btw</th>
                <th className="text-right py-2 font-semibold w-28">Bedrag</th>
              </tr>
            </thead>
            <tbody>
              {f.regels.map((r) => (
                <tr key={r.id} className="border-b border-line">
                  <td className="py-2 pr-3">{r.omschrijving}</td>
                  <td className="py-2 text-right tabular whitespace-nowrap">
                    {getal(r.aantal, r.aantal % 1 ? 2 : 0)} {r.eenheid}
                  </td>
                  <td className="py-2 text-right tabular">{euro(r.prijs)}</td>
                  <td className="py-2 text-right tabular">{f.btwVerlegd ? 'verlegd' : `${r.btwPercentage}%`}</td>
                  <td className="py-2 text-right tabular font-medium">{euro(r.bedrag)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-4">
            <table className="text-[12.5px] min-w-[280px]">
              <tbody>
                <tr>
                  <td className="py-1 text-ink-3">Subtotaal excl. btw</td>
                  <td className="py-1 text-right tabular">{euro(t.subtotaal)}</td>
                </tr>
                {f.btwVerlegd ? (
                  <tr>
                    <td className="py-1 text-ink-3">Btw verlegd</td>
                    <td className="py-1 text-right tabular">{euro(0)}</td>
                  </tr>
                ) : (
                  [...t.perBtw.entries()].map(([p, g]) => (
                    <tr key={p}>
                      <td className="py-1 text-ink-3">
                        Btw {p}% over {euro(g.grondslag)}
                      </td>
                      <td className="py-1 text-right tabular">{euro(g.btw)}</td>
                    </tr>
                  ))
                )}
                <tr className="border-t-2 border-ink">
                  <td className="py-2 font-bold text-[14px]">Te betalen</td>
                  <td className="py-2 text-right tabular font-bold text-[14px]">{euro(t.totaal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {f.btwVerlegd && (
            <div className="mt-6 p-3 border border-line rounded-[6px] bg-bg text-[11.5px]">
              <span className="font-semibold">Btw verlegd.</span> De btw is verlegd naar de afnemer op grond van artikel 12, lid 5 Wet op de omzetbelasting 1968 (onderaanneming in de bouw). Btw-nummer afnemer: {k.kvk ? `NL${k.kvk}B01` : 'op te vragen'}.
            </div>
          )}
          {!f.btwVerlegd && o.btwPercentage === 9 && <div className="mt-6 text-[11.5px] text-ink-3">Op deze factuur is het verlaagde btw-tarief van 9% toegepast (schilder- en stukadoorswerk aan woningen ouder dan twee jaar).</div>}

          <div className="mt-8 text-[11.5px] text-ink-2 leading-relaxed">
            Wij verzoeken u het bedrag van <span className="font-semibold">{euro(t.totaal)}</span> vóór {datum(f.vervaldatum)} over te maken op IBAN <span className="tabular">{b.iban}</span> t.n.v. {b.naam} onder vermelding van factuurnummer <span className="font-semibold">{f.nummer}</span>.
            {f.regels.some((r) => r.bron?.type === 'uren') && ' De urenspecificatie per werkbon is op verzoek beschikbaar.'}
          </div>
          <div className="mt-10 pt-4 border-t border-line text-[10.5px] text-ink-4 text-center">
            {b.naam} · {b.adres.straat}, {b.adres.postcode} {b.adres.plaats} · KvK {b.kvk} · {b.website} · Op al onze werkzaamheden zijn de AVA 2013 van toepassing.
          </div>
        </div>

        {/* Zijpaneel */}
        <div className="no-print grid gap-4 min-w-0">
          <div className="card px-4 py-1">
            <div className="label pt-3">Status</div>
            <Rij k="Factuur" v={<Badge label={st.label} kleur={st.kleur} />} />
            <Rij k="Verzonden" v={f.verzondenOp ? datum(f.verzondenOp) : '—'} mono />
            <Rij k="Betaald" v={f.betaaldOp ? datum(f.betaaldOp) : '—'} mono />
            <Rij k="ERP" v={<Badge label={erp.label} kleur={erp.kleur} />} />
            {f.erpReferentie && <Rij k="ERP-referentie" v={f.erpReferentie} mono />}
            {f.erpPakket && <Rij k="Pakket" v={ERP_NAAM[f.erpPakket]} />}
          </div>
          <div className="card px-4 py-1 min-w-0">
            <div className="label pt-3">Herkomst regels</div>
            {f.regels.map((r) => (
              <div key={r.id} className="py-2 border-b border-line last:border-b-0 text-[12.5px]">
                <div className="truncate">{r.omschrijving}</div>
                <div className="text-[11px] text-ink-3">{r.bron ? `${{ uren: 'urenregels', materiaal: 'materiaalregels', meerwerk: 'meerwerkpost', termijn: 'termijn / aanneemsom' }[r.bron.type]}${r.bron.ids.length ? ` (${r.bron.ids.length})` : ''}` : 'handmatig'}</div>
              </div>
            ))}
          </div>
          {pakketten.length > 1 && (
            <div className="card p-4">
              <div className="label mb-1.5">Synchroniseer naar</div>
              <div className="grid gap-1.5">
                {pakketten.map((p) => (
                  <button key={p} className="btn-outline btn-sm justify-start" onClick={() => sync(p)} disabled={bezig}>
                    <RefreshCw size={13} /> {ERP_NAAM[p]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {f.status === 'concept' && (
            <button className="btn-ghost btn-sm text-bad justify-start" onClick={() => setVerwijder(true)}>
              <Trash2 size={13} /> Conceptfactuur verwijderen
            </button>
          )}
        </div>
      </div>

      <Modal
        open={verwijder}
        onClose={() => setVerwijder(false)}
        titel="Conceptfactuur verwijderen?"
        footer={
          <>
            <button className="btn-outline btn-sm" onClick={() => setVerwijder(false)}>
              Annuleren
            </button>
            <button
              className="btn-primary btn-sm"
              onClick={() => {
                store.deleteFactuur(f.id)
                toast('Conceptfactuur verwijderd')
                nav('/beheer/facturatie')
              }}
            >
              Verwijderen
            </button>
          </>
        }
      >
        <p className="text-[14px] text-ink-2">Gekoppeld meerwerk komt weer beschikbaar voor facturatie.</p>
      </Modal>
    </div>
  )
}
