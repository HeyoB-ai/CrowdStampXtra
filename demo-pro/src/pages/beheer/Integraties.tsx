import { ArrowDownToLine, ArrowUpFromLine, Check, Download, FileCode2, Link2, Link2Off, RefreshCw, Settings2, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Modal, PageHeader, Schakelaar, Spinner, useToast, Veld } from '../../components/ui'
import { useStore } from '../../data/StoreContext'
import { ALLE_PAKKETTEN, getAdapter } from '../../integrations/adapters'
import { haalBetaalstatus, opnieuwProberen, pushUren, syncArtikelen, syncKlanten } from '../../integrations/sync'
import { ERP_NAAM } from '../../lib/calculatie'
import { datumTijd } from '../../lib/format'
import { downloadBestand } from '../../lib/image'
import { maakJournaalCsv } from '../../lib/journaal'
import { maakUbl } from '../../lib/ubl'
import type { ErpPakket, KoppelingInstellingen, SyncLogRegel } from '../../types'

const OMSCHRIJVING: Record<ErpPakket, string> = {
  exact: 'REST API met OAuth2. Verkoopfacturen, debiteuren, artikelen, kostenplaatsen en bankmutaties.',
  afas: 'GetConnectors en UpdateConnectors (app-token). Financiële boekingen en projectadministratie.',
  twinfield: 'SOAP/XML via Wolters Kluwer OAuth. Verkoopboek, dimensies (debiteur, kostenplaats) en btw-codes.',
  snelstart: 'B2B API met koppelsleutel. Verkoopfacturen en relaties.',
  generiek: 'Geen API nodig: UBL 2.1 e-facturen (Peppol BIS 3.0) en CSV-journaalposten om in elk pakket te importeren.',
}

const LOGO_KLEUR: Record<ErpPakket, string> = {
  exact: 'bg-[#e2001a]',
  afas: 'bg-[#005eb8]',
  twinfield: 'bg-[#00a3e0]',
  snelstart: 'bg-[#f39200]',
  generiek: 'bg-ink',
}

export default function Integraties() {
  const store = useStore()
  const toast = useToast()
  const [verbindMet, setVerbindMet] = useState<ErpPakket | null>(null)
  const [instellingen, setInstellingen] = useState<ErpPakket | null>(null)
  const [bezig, setBezig] = useState<string | null>(null)
  const [filter, setFilter] = useState<'alle' | 'fout'>('alle')
  const koppelingen = store.getKoppelingen()
  const log = [...store.getSyncLog()].sort((a, b) => b.tijdstip.localeCompare(a.tijdstip)).filter((r) => filter === 'alle' || r.status === 'fout')
  const generiek = store.getKoppeling('generiek')

  const actie = async (naam: string, fn: () => Promise<unknown>, ok: string) => {
    setBezig(naam)
    try {
      const r = await fn()
      if (r === false) toast('Actie mislukt – zie synchronisatielog', 'bad')
      else toast(typeof r === 'number' ? `${ok}: ${r} factuur/facturen op betaald gezet` : ok, 'good')
    } finally {
      setBezig(null)
    }
  }

  const ontkoppel = async (p: ErpPakket) => {
    await getAdapter(p).ontkoppel()
    store.updateKoppeling(p, { verbonden: false, verbondenOp: undefined, administratie: undefined })
    store.addSyncLog({ pakket: p, richting: 'naar_erp', object: 'Koppeling', status: 'ok', melding: 'Koppeling verbroken' })
    toast(`${ERP_NAAM[p]} ontkoppeld`)
  }

  const exportAlleUbl = () => {
    const fs = store.getFacturen().filter((f) => f.status !== 'concept')
    const b = store.getState().bedrijf
    fs.forEach((f, i) => {
      const o = store.getOpdracht(f.opdrachtId)!
      setTimeout(() => downloadBestand(`${f.nummer}.xml`, maakUbl(f, o, store.getKlant(f.klantId)!, b, { kostenplaats: generiek.instellingen.kostenplaatsIsOpdracht ? o.nummer : undefined }), 'application/xml;charset=utf-8'), i * 250)
    })
    store.addSyncLog({ pakket: 'generiek', richting: 'naar_erp', object: `${fs.length} facturen`, status: 'ok', melding: `${fs.length} UBL 2.1-bestanden geëxporteerd` })
    toast(`${fs.length} UBL-bestanden worden gedownload`, 'good')
  }
  const exportJournaal = () => {
    const fs = store.getFacturen().filter((f) => f.status !== 'concept').map((f) => ({ f, o: store.getOpdracht(f.opdrachtId)!, k: store.getKlant(f.klantId)! }))
    downloadBestand(`journaalposten-verkoop-${new Date().toISOString().slice(0, 10)}.csv`, maakJournaalCsv(fs, generiek.instellingen), 'text/csv;charset=utf-8')
    store.addSyncLog({ pakket: 'generiek', richting: 'naar_erp', object: `${fs.length} facturen`, status: 'ok', melding: 'CSV-journaalpostexport gedownload' })
    toast('CSV-journaalposten gedownload', 'good')
  }

  return (
    <div data-tour="integraties">
      <PageHeader eyebrow="Integraties" titel="Boekhouding & ERP" sub="Facturen, uren en betaalstatus automatisch heen en weer. Eén adapter per pakket, dezelfde koppeling-instellingen." />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
        {ALLE_PAKKETTEN.map((p) => {
          const k = koppelingen.find((x) => x.pakket === p)!
          const isGeneriek = p === 'generiek'
          return (
            <div key={p} className={`card p-4 flex flex-col gap-3 ${k.verbonden ? 'border-good/30' : ''}`}>
              <div className="flex items-start gap-3">
                <span className={`w-10 h-10 rounded-[10px] ${LOGO_KLEUR[p]} text-white font-tight font-bold text-[15px] flex items-center justify-center shrink-0`}>{ERP_NAAM[p].slice(0, 2).toUpperCase()}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-tight font-semibold text-[15px]">{ERP_NAAM[p]}</div>
                    {k.verbonden ? <Badge label="Verbonden" kleur="bg-green-50 text-good" /> : <Badge label="Niet verbonden" kleur="bg-bg-2 text-ink-3" />}
                  </div>
                  <div className="text-[12px] text-ink-3 mt-0.5 leading-snug">{OMSCHRIJVING[p]}</div>
                </div>
              </div>
              {k.verbonden && (
                <div className="text-[11.5px] text-ink-3 tabular">
                  {k.administratie} · {k.laatsteSync ? `laatste sync ${datumTijd(k.laatsteSync)}` : 'nog niet gesynchroniseerd'}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {!k.verbonden ? (
                  <button className="btn-ink btn-sm" onClick={() => setVerbindMet(p)}>
                    <Link2 size={13} /> Verbinden
                  </button>
                ) : isGeneriek ? (
                  <>
                    <button className="btn-outline btn-sm" onClick={exportAlleUbl}>
                      <FileCode2 size={13} /> UBL alle facturen
                    </button>
                    <button className="btn-outline btn-sm" onClick={exportJournaal}>
                      <Download size={13} /> CSV-journaal
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn-outline btn-sm" disabled={!!bezig} onClick={() => actie(`${p}-klanten`, () => syncKlanten(store, p), 'Klanten gesynchroniseerd')}>
                      {bezig === `${p}-klanten` ? <Spinner donker /> : <ArrowDownToLine size={13} />} Klanten
                    </button>
                    <button className="btn-outline btn-sm" disabled={!!bezig} onClick={() => actie(`${p}-art`, () => syncArtikelen(store, p), 'Artikelen gesynchroniseerd')}>
                      {bezig === `${p}-art` ? <Spinner donker /> : <ArrowDownToLine size={13} />} Artikelen
                    </button>
                    <button className="btn-outline btn-sm" disabled={!!bezig} onClick={() => actie(`${p}-uren`, () => pushUren(store, p), 'Uren geboekt')}>
                      {bezig === `${p}-uren` ? <Spinner donker /> : <ArrowUpFromLine size={13} />} Uren
                    </button>
                    <button className="btn-primary btn-sm" disabled={!!bezig} onClick={() => actie(`${p}-betaal`, () => haalBetaalstatus(store, p), 'Betaalstatus opgehaald')} data-tour="betaalstatus">
                      {bezig === `${p}-betaal` ? <Spinner /> : <RefreshCw size={13} />} Betaalstatus ophalen
                    </button>
                  </>
                )}
                <button className="btn-ghost btn-sm" onClick={() => setInstellingen(p)}>
                  <Settings2 size={13} /> Instellingen
                </button>
                {k.verbonden && !isGeneriek && (
                  <button className="btn-ghost btn-sm text-ink-3" onClick={() => ontkoppel(p)}>
                    <Link2Off size={13} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between flex-wrap gap-2">
          <div className="font-tight font-semibold text-[15px]">Synchronisatielog</div>
          <div className="flex gap-1.5">
            <button onClick={() => setFilter('alle')} className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border cursor-pointer ${filter === 'alle' ? 'bg-ink text-white border-ink' : 'border-line text-ink-2'}`}>
              Alles
            </button>
            <button onClick={() => setFilter('fout')} className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border cursor-pointer ${filter === 'fout' ? 'bg-ink text-white border-ink' : 'border-line text-ink-2'}`}>
              Alleen fouten ({store.getSyncLog().filter((r) => r.status === 'fout').length})
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr>
                <th className="th">Tijdstip</th>
                <th className="th">Pakket</th>
                <th className="th">Richting</th>
                <th className="th">Object</th>
                <th className="th">Status</th>
                <th className="th">Melding</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {log.length === 0 && (
                <tr>
                  <td className="td text-center text-ink-3 py-8" colSpan={7}>
                    Geen logregels.
                  </td>
                </tr>
              )}
              {log.slice(0, 60).map((r) => (
                <LogRij key={r.id} r={r} onRetry={() => actie(`retry-${r.id}`, () => opnieuwProberen(store, r.id), 'Opnieuw geprobeerd – gelukt')} bezig={bezig === `retry-${r.id}`} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {verbindMet && (
        <VerbindModal
          pakket={verbindMet}
          onClose={() => setVerbindMet(null)}
          onKlaar={(administratie) => {
            store.updateKoppeling(verbindMet, { verbonden: true, verbondenOp: new Date().toISOString(), administratie })
            store.addSyncLog({ pakket: verbindMet, richting: 'van_erp', object: 'Koppeling', status: 'ok', melding: `Verbonden met administratie "${administratie}" (OAuth-autorisatie geslaagd)` })
            toast(`${ERP_NAAM[verbindMet]} verbonden`, 'good')
            setVerbindMet(null)
          }}
        />
      )}
      {instellingen && <InstellingenModal pakket={instellingen} onClose={() => setInstellingen(null)} />}
    </div>
  )
}

function LogRij({ r, onRetry, bezig }: { r: SyncLogRegel; onRetry: () => void; bezig: boolean }) {
  return (
    <tr className={r.status === 'fout' ? 'bg-red-50/40' : ''}>
      <td className="td tabular text-[12px] text-ink-2 whitespace-nowrap">{datumTijd(r.tijdstip)}</td>
      <td className="td text-[12.5px] font-semibold whitespace-nowrap">{ERP_NAAM[r.pakket]}</td>
      <td className="td text-[12px] whitespace-nowrap">
        <span className="inline-flex items-center gap-1 text-ink-2">{r.richting === 'naar_erp' ? <ArrowUpFromLine size={12} /> : <ArrowDownToLine size={12} />} {r.richting === 'naar_erp' ? 'naar ERP' : 'van ERP'}</span>
      </td>
      <td className="td text-[12.5px] whitespace-nowrap">{r.object}</td>
      <td className="td">{r.status === 'ok' ? <Badge label="OK" kleur="bg-green-50 text-good" /> : r.status === 'fout' ? <Badge label="Fout" kleur="bg-red-50 text-bad" /> : <Badge label="Bezig" kleur="bg-accent-soft text-accent" />}</td>
      <td className="td text-[12.5px] text-ink-2">{r.melding}</td>
      <td className="td text-right">
        {r.status === 'fout' && r.actie && (
          <button className="btn-outline btn-sm whitespace-nowrap" onClick={onRetry} disabled={bezig}>
            {bezig ? <Spinner donker /> : <RefreshCw size={12} />} Opnieuw proberen
          </button>
        )}
      </td>
    </tr>
  )
}

/** Nep-OAuth-flow: stappen met laadstatus, geen externe calls */
function VerbindModal({ pakket, onClose, onKlaar }: { pakket: ErpPakket; onClose: () => void; onKlaar: (administratie: string) => void }) {
  const STAPPEN = [`Doorsturen naar ${ERP_NAAM[pakket]}…`, 'Inloggen bij het pakket (gesimuleerd)', 'Toestemming voor CrowdStamp Pro: facturen, relaties, artikelen, bankmutaties', 'Administratie ophalen', 'Koppeling opslaan']
  const [stap, setStap] = useState(0)
  const [administratie, setAdministratie] = useState<string | null>(null)
  useEffect(() => {
    let actief = true
    const run = async () => {
      for (let i = 0; i < STAPPEN.length; i++) {
        if (!actief) return
        setStap(i)
        await new Promise((r) => setTimeout(r, 650 + Math.random() * 500))
      }
      if (!actief) return
      const res = await getAdapter(pakket).verbind()
      if (actief && res.ok && res.data) setAdministratie(res.data.administratie)
    }
    run()
    return () => {
      actief = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pakket])
  return (
    <Modal open onClose={onClose} titel={`Verbinden met ${ERP_NAAM[pakket]}`}>
      <div className="grid gap-2">
        {STAPPEN.map((s, i) => (
          <div key={s} className="flex items-center gap-3 text-[13.5px]">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${i < stap || administratie ? 'bg-good text-white' : i === stap ? 'bg-ink text-white' : 'bg-bg-2 text-ink-4'}`}>{i < stap || administratie ? <Check size={13} /> : i === stap ? <Spinner /> : <span className="text-[11px] font-bold">{i + 1}</span>}</span>
            <span className={i <= stap || administratie ? 'text-ink' : 'text-ink-4'}>{s}</span>
          </div>
        ))}
      </div>
      {administratie && (
        <div className="card p-4 mt-4 bg-green-50/60 border-good/30">
          <div className="flex items-center gap-2 text-[13.5px] font-semibold">
            <ShieldCheck size={16} className="text-good" /> Autorisatie geslaagd
          </div>
          <div className="text-[13px] text-ink-2 mt-1">
            Administratie: <span className="font-semibold">{administratie}</span>
          </div>
          <button className="btn-ink btn-sm mt-3 w-full" onClick={() => onKlaar(administratie)}>
            Koppeling activeren
          </button>
        </div>
      )}
      <div className="text-[11.5px] text-ink-4 mt-4">Demo: er wordt geen verbinding met een extern systeem gemaakt. In productie opent hier het echte inlog-/toestemmingsscherm van het pakket (OAuth2 / app-token).</div>
    </Modal>
  )
}

function InstellingenModal({ pakket, onClose }: { pakket: ErpPakket; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const k = store.getKoppeling(pakket)
  const [i, setI] = useState<KoppelingInstellingen>({ ...k.instellingen })
  const zet = (p: Partial<KoppelingInstellingen>) => setI({ ...i, ...p })
  return (
    <Modal
      open
      onClose={onClose}
      titel={`Instellingen ${ERP_NAAM[pakket]}`}
      footer={
        <>
          <button className="btn-outline btn-sm" onClick={onClose}>
            Annuleren
          </button>
          <button className="btn-ink btn-sm" onClick={() => { store.updateKoppeling(pakket, { instellingen: i }); toast('Instellingen opgeslagen', 'good'); onClose() }}>
            Opslaan
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Veld label="Grootboek omzet">
          <input className="input" value={i.grootboekOmzet} onChange={(e) => zet({ grootboekOmzet: e.target.value })} />
        </Veld>
        <Veld label="Grootboek omzet btw verlegd">
          <input className="input" value={i.grootboekOmzetVerlegd} onChange={(e) => zet({ grootboekOmzetVerlegd: e.target.value })} />
        </Veld>
        <Veld label="Grootboek af te dragen btw">
          <input className="input" value={i.grootboekBtw} onChange={(e) => zet({ grootboekBtw: e.target.value })} />
        </Veld>
        <Veld label="Grootboek debiteuren">
          <input className="input" value={i.grootboekDebiteuren} onChange={(e) => zet({ grootboekDebiteuren: e.target.value })} />
        </Veld>
        <Veld label="Dagboek (verkoop)" className="col-span-2">
          <input className="input" value={i.dagboek} onChange={(e) => zet({ dagboek: e.target.value })} />
        </Veld>
        <div className="col-span-2 grid gap-2 pt-1">
          <Schakelaar aan={i.kostenplaatsIsOpdracht} onChange={(v) => zet({ kostenplaatsIsOpdracht: v })} label="Kostenplaats = opdrachtnummer (projectadministratie)" />
          <Schakelaar aan={i.autoSyncBijVerzonden} onChange={(v) => zet({ autoSyncBijVerzonden: v })} label='Automatisch synchroniseren bij "factuur verzonden"' />
        </div>
      </div>
      {pakket === 'generiek' && <div className="text-[12px] text-ink-3 mt-3">Deze rekeningen worden gebruikt in de CSV-journaalpost; de UBL bevat het opdrachtnummer als AccountingCost (kostenplaats).</div>}
    </Modal>
  )
}
