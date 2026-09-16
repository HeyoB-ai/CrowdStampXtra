import { ArrowLeft, FileText, MapPin, Navigation, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FotoGrid } from '../../components/FotoGrid'
import { ProcesBalk } from '../../components/ProcesBalk'
import { NacalculatiePanel } from '../../components/panels/CalculatiePanel'
import { FacturenTabel, NieuweFactuurKnop } from '../../components/panels/FacturenPanel'
import { MateriaalTabel } from '../../components/panels/MateriaalPanel'
import { MeerwerkLijst } from '../../components/panels/MeerwerkPanel'
import { Tijdlijn } from '../../components/panels/TijdlijnPanel'
import { UrenTabel } from '../../components/panels/UrenPanel'
import { NieuweWerkbonModal, WerkbonnenTabel } from '../../components/panels/WerkbonnenPanel'
import { Badge, KpiCard, Leeg, Modal, Rij, Tabs, useToast, Veld, Voortgang } from '../../components/ui'
import { useStore } from '../../data/StoreContext'
import { berekenNacalculatie, KLANT_SOORT, OPDRACHT_STATUS } from '../../lib/calculatie'
import { datum, euro, getal, procent } from '../../lib/format'
import { navigatieUrl } from '../../lib/geo'
import type { Opdracht, OpdrachtStatus } from '../../types'

type Tab = 'overzicht' | 'werkbonnen' | 'uren' | 'materiaal' | 'fotos' | 'meerwerk' | 'calculatie' | 'facturatie' | 'tijdlijn'

export default function OpdrachtDetail() {
  const { id = '' } = useParams()
  const store = useStore()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get('tab') as Tab) || 'overzicht'
  const setTab = (t: Tab) => setSp(t === 'overzicht' ? {} : { tab: t }, { replace: true })
  const [nieuwWb, setNieuwWb] = useState(false)
  const [bewerk, setBewerk] = useState(false)

  const o = store.getOpdracht(id)
  if (!o)
    return (
      <Leeg
        titel="Opdracht niet gevonden"
        actie={
          <Link to="/beheer/opdrachten" className="btn-outline btn-sm">
            Terug naar opdrachten
          </Link>
        }
      />
    )
  const k = store.getKlant(o.klantId)
  const werkbonnen = store.getWerkbonnen({ opdrachtId: id })
  const uren = store.getUren({ opdrachtId: id })
  const materiaal = store.getMateriaal({ opdrachtId: id })
  const fotos = store.getFotos({ opdrachtId: id })
  const meerwerk = store.getMeerwerk({ opdrachtId: id })
  const facturen = store.getFacturen({ opdrachtId: id })
  const nc = berekenNacalculatie(store, id)!
  const st = OPDRACHT_STATUS[o.status]

  const tabs: { id: Tab; label: string; teller?: number }[] = [
    { id: 'overzicht', label: 'Overzicht' },
    { id: 'werkbonnen', label: 'Werkbonnen', teller: werkbonnen.length },
    { id: 'uren', label: 'Uren', teller: uren.filter((u) => !u.goedgekeurd).length },
    { id: 'materiaal', label: 'Materiaal', teller: materiaal.length },
    { id: 'fotos', label: "Foto's", teller: fotos.length },
    { id: 'meerwerk', label: 'Meerwerk', teller: meerwerk.filter((m) => m.status === 'gemeld' || m.status === 'ter_akkoord').length },
    { id: 'calculatie', label: 'Calculatie' },
    { id: 'facturatie', label: 'Facturatie', teller: facturen.length },
    { id: 'tijdlijn', label: 'Tijdlijn' },
  ]

  return (
    <div>
      <button className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-3 hover:text-ink mb-3 cursor-pointer" onClick={() => nav('/beheer/opdrachten')}>
        <ArrowLeft size={13} /> Opdrachten
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-tight font-bold text-[13px] tabular text-ink-3">{o.nummer}</span>
            <Badge label={st.label} kleur={st.kleur} />
            <span className="pill bg-bg-2 text-ink-2">{o.contractvorm === 'aanneemsom' ? 'Aanneemsom' : 'Regie'}</span>
            {o.btwVerlegd ? <span className="pill bg-bg-2 text-ink-2">btw verlegd</span> : <span className="pill bg-bg-2 text-ink-2">btw {o.btwPercentage}%</span>}
          </div>
          <h1 className="text-[24px] md:text-[28px] font-bold leading-[1.1] mt-1">{o.omschrijving}</h1>
          <div className="text-[13.5px] text-ink-3 mt-1 flex items-center gap-3 flex-wrap">
            <span>{k?.naam}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {o.locatie.straat}, {o.locatie.postcode} {o.locatie.plaats}
            </span>
            <span className="tabular">
              {datum(o.startdatum)} – {datum(o.einddatum)}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-outline btn-sm" onClick={() => setBewerk(true)}>
            <Pencil size={13} /> Bewerken
          </button>
          <button className="btn-ink btn-sm" onClick={() => setNieuwWb(true)} data-tour="werkbon-nieuw">
            <Plus size={13} /> Werkbon
          </button>
          <NieuweFactuurKnop opdrachtId={id} label="Factuur" />
        </div>
      </div>

      <ProcesBalk opdrachtId={id} actieveTab={tab} onKies={(t) => setTab(t as Tab)} />

      <div className="mt-4 mb-4">
        <Tabs items={tabs} actief={tab} onChange={setTab} />
      </div>

      {tab === 'overzicht' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label={o.contractvorm === 'aanneemsom' ? 'Aanneemsom' : 'Begrote omzet'} waarde={euro(nc.contractwaarde)} sub="excl. btw" />
              <KpiCard label="Gewerkte uren" waarde={getal(nc.gewerkteUren, 1)} sub={`van ${getal(nc.begroteUren, 0)} begroot`} />
              <KpiCard label="Kosten tot nu" waarde={euro(nc.werkelijkKost)} sub={`${procent(nc.budgetVerbruiktPct)} van budget`} kleur={nc.budgetVerbruiktPct > 100 ? 'bad' : nc.budgetVerbruiktPct > 90 ? 'warn' : undefined} />
              <KpiCard label="Prognose resultaat" waarde={euro(nc.prognoseResultaat)} sub={`begroot ${euro(nc.begrootResultaat)}`} kleur={nc.kleur} onClick={() => setTab('calculatie')} />
            </div>
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-tight font-semibold text-[15px]">Voortgang</div>
                <span className="font-tight font-semibold tabular">{o.voortgang}%</span>
              </div>
              <Voortgang pct={o.voortgang} kleur={nc.kleur === 'bad' ? 'bad' : nc.kleur === 'warn' ? 'warn' : 'ink'} />
              <div className="grid sm:grid-cols-3 gap-3 mt-4 text-[13px]">
                <div>
                  <div className="text-ink-3 text-[11.5px]">Gefactureerd</div>
                  <div className="font-semibold tabular">{euro(nc.gefactureerd)}</div>
                </div>
                <div>
                  <div className="text-ink-3 text-[11.5px]">Nog te factureren</div>
                  <div className="font-semibold tabular text-accent">{euro(nc.teFactureren)}</div>
                </div>
                <div>
                  <div className="text-ink-3 text-[11.5px]">Meerwerk akkoord / ter akkoord</div>
                  <div className="font-semibold tabular">
                    {euro(nc.meerwerkAkkoord)} / {euro(nc.meerwerkTerAkkoord)}
                  </div>
                </div>
              </div>
            </div>
            {o.toelichting && (
              <div className="card p-4">
                <div className="label mb-1">Toelichting</div>
                <p className="text-[13.5px] text-ink-2 leading-relaxed">{o.toelichting}</p>
              </div>
            )}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-tight font-semibold text-[15px]">Laatste foto's</div>
                <button className="text-[12.5px] font-semibold text-accent cursor-pointer" onClick={() => setTab('fotos')}>
                  Alle {fotos.length} foto's
                </button>
              </div>
              <FotoGrid fotos={fotos.slice(-5)} filter={false} />
            </div>
          </div>
          <div className="grid gap-4 content-start">
            <div className="card px-4 py-1">
              <div className="label pt-3">Klant</div>
              <Rij k="Naam" v={k?.naam} />
              <Rij k="Soort" v={KLANT_SOORT[k?.soort ?? 'overig']} />
              <Rij k="Contactpersoon" v={k?.contactpersoon} />
              <Rij k="E-mail" v={<span className="break-all">{k?.email}</span>} />
              <Rij k="Debiteurnummer (ERP)" v={k?.debiteurnummer} mono />
              {k?.kvk && <Rij k="KvK" v={k.kvk} mono />}
            </div>
            <div className="card px-4 py-1">
              <div className="label pt-3">Locatie</div>
              <Rij k="Adres" v={`${o.locatie.straat}, ${o.locatie.postcode} ${o.locatie.plaats}`} />
              <Rij k="Coördinaten" v={`${o.locatie.lat.toFixed(5)}, ${o.locatie.lng.toFixed(5)}`} mono />
              <div className="py-3">
                <a href={navigatieUrl(o.locatie)} target="_blank" rel="noreferrer" className="btn-outline btn-sm w-full">
                  <Navigation size={13} /> Navigeer (Google Maps)
                </a>
              </div>
            </div>
            <div className="card px-4 py-1">
              <div className="label pt-3">Projectleider</div>
              <Rij k="Naam" v={store.getMedewerker(o.projectleiderId)?.naam} />
              <Rij k="Aangemaakt" v={datum(o.aangemaaktOp)} />
            </div>
            <div className="card px-4 py-1">
              <div className="label pt-3">Documenten</div>
              {o.documenten.length === 0 && <div className="py-3 text-[13px] text-ink-3">Geen documenten.</div>}
              {o.documenten.map((d) => (
                <div key={d.id} className="flex items-center gap-2 py-2.5 border-b border-line last:border-b-0 text-[13px]">
                  <FileText size={14} className="text-ink-4 shrink-0" />
                  <span className="truncate flex-1">{d.naam}</span>
                  <span className="text-[11.5px] text-ink-3 tabular">{datum(d.datum)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'werkbonnen' && <WerkbonnenTabel werkbonnen={werkbonnen} onNieuw={() => setNieuwWb(true)} />}
      {tab === 'uren' && <UrenTabel uren={uren} toonOpdracht={false} />}
      {tab === 'materiaal' && <MateriaalTabel regels={materiaal} opdrachtId={id} />}
      {tab === 'fotos' && <FotoGrid fotos={fotos} verwijderbaar />}
      {tab === 'meerwerk' && <MeerwerkLijst items={meerwerk} />}
      {tab === 'calculatie' && <NacalculatiePanel opdrachtId={id} />}
      {tab === 'facturatie' && (
        <div className="grid gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-[13px] text-ink-3">
              Gefactureerd <span className="font-semibold text-ink tabular">{euro(nc.gefactureerd)}</span> · nog te factureren <span className="font-semibold text-accent tabular">{euro(nc.teFactureren)}</span>
            </div>
            <NieuweFactuurKnop opdrachtId={id} />
          </div>
          <FacturenTabel facturen={facturen} />
        </div>
      )}
      {tab === 'tijdlijn' && <Tijdlijn opdrachtId={id} />}

      <NieuweWerkbonModal opdrachtId={id} open={nieuwWb} onClose={() => setNieuwWb(false)} />
      {bewerk && <OpdrachtBewerkModal opdracht={o} onClose={() => setBewerk(false)} />}
    </div>
  )
}

function OpdrachtBewerkModal({ opdracht, onClose }: { opdracht: Opdracht; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const [o, setO] = useState<Opdracht>({ ...opdracht, locatie: { ...opdracht.locatie } })
  const opslaan = () => {
    store.updateOpdracht(o.id, o)
    toast('Opdracht bijgewerkt', 'good')
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      titel={`${o.nummer} bewerken`}
      footer={
        <>
          <button className="btn-outline btn-sm" onClick={onClose}>
            Annuleren
          </button>
          <button className="btn-ink btn-sm" onClick={opslaan}>
            Opslaan
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <Veld label="Omschrijving">
          <input className="input" value={o.omschrijving} onChange={(e) => setO({ ...o, omschrijving: e.target.value })} />
        </Veld>
        <Veld label="Toelichting">
          <textarea className="input min-h-[70px]" value={o.toelichting ?? ''} onChange={(e) => setO({ ...o, toelichting: e.target.value })} />
        </Veld>
        <div className="grid grid-cols-2 gap-3">
          <Veld label="Status">
            <select className="input" value={o.status} onChange={(e) => setO({ ...o, status: e.target.value as OpdrachtStatus })}>
              {(Object.keys(OPDRACHT_STATUS) as OpdrachtStatus[]).map((s) => (
                <option key={s} value={s}>
                  {OPDRACHT_STATUS[s].label}
                </option>
              ))}
            </select>
          </Veld>
          <Veld label="Klant">
            <select className="input" value={o.klantId} onChange={(e) => setO({ ...o, klantId: e.target.value })}>
              {store.getKlanten().map((k) => (
                <option key={k.id} value={k.id}>
                  {k.naam}
                </option>
              ))}
            </select>
          </Veld>
          <Veld label="Startdatum">
            <input type="date" className="input" value={o.startdatum} onChange={(e) => setO({ ...o, startdatum: e.target.value })} />
          </Veld>
          <Veld label="Einddatum">
            <input type="date" className="input" value={o.einddatum} onChange={(e) => setO({ ...o, einddatum: e.target.value })} />
          </Veld>
          <Veld label="Contractvorm">
            <select className="input" value={o.contractvorm} onChange={(e) => setO({ ...o, contractvorm: e.target.value as 'aanneemsom' | 'regie' })}>
              <option value="aanneemsom">Aanneemsom</option>
              <option value="regie">Regie</option>
            </select>
          </Veld>
          {o.contractvorm === 'aanneemsom' && (
            <Veld label="Aanneemsom (excl. btw)">
              <input type="number" className="input" value={o.aanneemsom ?? 0} onChange={(e) => setO({ ...o, aanneemsom: Number(e.target.value) })} />
            </Veld>
          )}
          <Veld label="Btw">
            <select className="input" value={o.btwVerlegd ? 'verlegd' : String(o.btwPercentage)} onChange={(e) => setO({ ...o, btwVerlegd: e.target.value === 'verlegd', btwPercentage: e.target.value === '9' ? 9 : 21 })}>
              <option value="21">21%</option>
              <option value="9">9% (woningen &gt; 2 jaar: schilderen/stukadoren)</option>
              <option value="verlegd">Btw verlegd (onderaanneming)</option>
            </select>
          </Veld>
          <Veld label="Voortgang %">
            <input type="number" className="input" min={0} max={100} value={o.voortgang} onChange={(e) => setO({ ...o, voortgang: Number(e.target.value) })} />
          </Veld>
        </div>
        <div className="grid grid-cols-[1fr_100px_1fr] gap-3">
          <Veld label="Straat + nr">
            <input className="input" value={o.locatie.straat} onChange={(e) => setO({ ...o, locatie: { ...o.locatie, straat: e.target.value } })} />
          </Veld>
          <Veld label="Postcode">
            <input className="input" value={o.locatie.postcode} onChange={(e) => setO({ ...o, locatie: { ...o.locatie, postcode: e.target.value } })} />
          </Veld>
          <Veld label="Plaats">
            <input className="input" value={o.locatie.plaats} onChange={(e) => setO({ ...o, locatie: { ...o.locatie, plaats: e.target.value } })} />
          </Veld>
        </div>
      </div>
    </Modal>
  )
}
