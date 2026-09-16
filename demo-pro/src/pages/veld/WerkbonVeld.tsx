import { ArrowLeft, Camera, Check, CheckSquare, ClipboardList, Clock, LogIn, LogOut, MapPin, Navigation, PenLine, Plus, PlusSquare, Square, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FotoGrid } from '../../components/FotoGrid'
import { Handtekening } from '../../components/Handtekening'
import { MateriaalModal } from '../../components/panels/MateriaalPanel'
import { Badge, Modal, Spinner, useToast, Veld } from '../../components/ui'
import { useRol } from '../../data/RolContext'
import { useStore } from '../../data/StoreContext'
import { FOTO_CATEGORIE, UURSOORT_LABEL, urenVanRegel, WERKBON_STATUS } from '../../lib/calculatie'
import { datumLang, euro, getal, kapitaliseer, tijd, urenLabel } from '../../lib/format'
import { afstandLabel, afstandMeters, haalGps, navigatieUrl } from '../../lib/geo'
import { comprimeerAfbeelding } from '../../lib/image'
import type { FotoCategorie, GpsPunt, Uursoort } from '../../types'

function Sectie({ icon: Icon, titel, meta, children }: { icon: typeof Clock; titel: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="flex items-center gap-2 text-ink-2">
          <Icon size={14} strokeWidth={1.6} />
          <span className="text-[13px] font-semibold text-ink">{titel}</span>
        </div>
        {meta && <span className="text-[12px] font-semibold text-ink-3">{meta}</span>}
      </div>
      {children}
    </div>
  )
}

export default function WerkbonVeld() {
  const { id = '' } = useParams()
  const store = useStore()
  const toast = useToast()
  const nav = useNavigate()
  const { veldMedewerkerId } = useRol()
  const wb = store.getWerkbon(id)
  const o = wb ? store.getOpdracht(wb.opdrachtId) : undefined
  const mw = store.getMedewerker(veldMedewerkerId)

  const [bezig, setBezig] = useState<'in' | 'uit' | null>(null)
  const [pauze, setPauze] = useState(30)
  const [fotoCat, setFotoCat] = useState<FotoCategorie>('tijdens')
  const [fotoBezig, setFotoBezig] = useState(false)
  const [materiaalOpen, setMateriaalOpen] = useState(false)
  const [meerwerkOpen, setMeerwerkOpen] = useState(false)
  const [tekenOpen, setTekenOpen] = useState(false)
  const [notities, setNotities] = useState(wb?.notities ?? '')
  const fotoRef = useRef<HTMLInputElement>(null)
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30000)
    return () => clearInterval(t)
  }, [])

  if (!wb || !o)
    return (
      <div className="card p-8 text-center text-[13.5px] text-ink-3">
        Werkbon niet gevonden.
        <Link to="/veld" className="btn-outline btn-sm mt-3">
          Terug
        </Link>
      </div>
    )

  const mijnUren = store.getUren({ werkbonId: id, medewerkerId: veldMedewerkerId }).sort((a, b) => a.start.localeCompare(b.start))
  const actief = mijnUren.find((u) => !u.eind)
  const totaal = mijnUren.reduce((s, u) => s + urenVanRegel(u), 0)
  const materiaal = store.getMateriaal({ werkbonId: id })
  const fotos = store.getFotos({ werkbonId: id })
  const meerwerk = store.getMeerwerk({ werkbonId: id })
  const st = WERKBON_STATUS[wb.status]
  const isEigen = wb.toegewezenAan.includes(veldMedewerkerId)
  const afgerond = wb.status === 'gereed' || wb.status === 'goedgekeurd'
  const alleTakenGedaan = wb.checklist.every((c) => c.gedaan)

  const doCheckIn = async () => {
    setBezig('in')
    const { punt, bron } = await haalGps(o.locatie)
    store.checkIn(id, veldMedewerkerId, punt)
    setBezig(null)
    const m = afstandMeters(punt, o.locatie)
    toast(bron === 'gps' ? `Ingecheckt · ${afstandLabel(m)} van de locatie` : 'Ingecheckt (GPS niet beschikbaar, locatie van opdracht gebruikt)', 'good')
  }
  const doCheckOut = async () => {
    if (!actief) return
    setBezig('uit')
    const { punt } = await haalGps(o.locatie)
    store.checkOut(actief.id, punt, pauze)
    setBezig(null)
    toast('Uitgecheckt', 'good')
  }

  const kiesFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setFotoBezig(true)
    const { punt } = await haalGps(o.locatie)
    for (const f of files) {
      try {
        const dataUrl = await comprimeerAfbeelding(f, 1600)
        store.addFoto({ werkbonId: id, opdrachtId: o.id, dataUrl, tijdstempel: new Date().toISOString(), gps: { lat: punt.lat, lng: punt.lng }, categorie: fotoCat, bijschrift: `${FOTO_CATEGORIE[fotoCat]} – ${wb.omschrijving}`, medewerkerId: veldMedewerkerId })
      } catch {
        toast('Foto kon niet worden gelezen', 'bad')
      }
    }
    setFotoBezig(false)
    toast(`${files.length} foto${files.length > 1 ? "'s" : ''} toegevoegd`, 'good')
  }

  const bewaarNotities = () => {
    if (notities !== wb.notities) store.updateWerkbon(id, { notities })
  }

  const afronden = () => {
    bewaarNotities()
    store.setWerkbonStatus(id, 'gereed', mw?.naam)
    toast('Werkbon afgerond en ingediend', 'good')
    nav('/veld')
  }

  const gpsRij = (label: string, p?: GpsPunt) =>
    p ? (
      <div className="flex gap-2 items-baseline text-[12px]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-4 min-w-[44px]">{label}</span>
        <span className="font-tight text-ink-2 tabular">
          {p.lat.toFixed(5)}, {p.lng.toFixed(5)} · ±{p.nauwkeurigheid} m · {afstandLabel(afstandMeters(p, o.locatie))} van locatie
        </span>
      </div>
    ) : null

  return (
    <div className="grid gap-4" data-tour="veld-werkbon">
      <button className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-3 px-1 cursor-pointer" onClick={() => nav(-1)}>
        <ArrowLeft size={13} /> Terug
      </button>

      {/* Kop */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold tabular text-ink-3">
            {wb.nummer} · {kapitaliseer(datumLang(wb.datum))}
          </span>
          <Badge label={st.label} kleur={st.kleur} />
        </div>
        <div className="font-tight font-bold text-[20px] leading-tight mt-1">{wb.omschrijving}</div>
        <div className="text-[13px] text-ink-3 mt-0.5">
          {o.nummer} · {o.omschrijving}
        </div>
        <div className="text-[12.5px] text-ink-2 mt-3 flex items-start gap-1.5">
          <MapPin size={13} className="text-ink-4 shrink-0 mt-0.5" />
          <span>
            {o.locatie.straat}, {o.locatie.postcode} {o.locatie.plaats}
          </span>
        </div>
        <div className="flex gap-2 mt-3">
          <a href={navigatieUrl(o.locatie)} target="_blank" rel="noreferrer" className="btn-outline btn-sm flex-1">
            <Navigation size={13} /> Navigeer
          </a>
          <span className="btn-ghost btn-sm flex-1 !cursor-default text-ink-3">
            {wb.geplandStart} · {wb.geplandUren} u gepland
          </span>
        </div>
        {!isEigen && <div className="mt-3 text-[12px] text-warn bg-amber-50 rounded-[8px] px-3 py-2">Deze werkbon is aan een collega toegewezen. Je kijkt mee als {mw?.naam.split(' ')[0]}.</div>}
      </div>

      {/* Tijdregistratie – zelfde tegels als app.html */}
      <Sectie icon={Clock} titel="Tijdregistratie" meta={actief ? <span className="text-accent">bezig · {urenLabel(urenVanRegel({ ...actief, eind: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}` }))}</span> : totaal ? <span className="text-good">{urenLabel(totaal)} totaal</span> : undefined}>
        <div className="card p-4" data-tour="veld-checkin">
          <div className="grid grid-cols-2 gap-2">
            <button disabled={!!actief || afgerond || bezig !== null} onClick={doCheckIn} className={`rounded-[12px] p-3.5 text-left flex flex-col gap-2 border transition active:scale-[0.97] disabled:active:scale-100 cursor-pointer disabled:cursor-not-allowed ${actief || afgerond ? 'bg-bg-2 border-line text-ink-3' : 'bg-accent border-transparent text-white'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold">Inchecken</span>
                {bezig === 'in' ? <Spinner /> : <LogIn size={15} />}
              </div>
              <span className={`font-tight text-[13px] tabular ${actief || afgerond ? 'text-ink-2' : 'text-white/70'}`}>{actief ? actief.start : mijnUren.length ? mijnUren.at(-1)!.start : '—  :  —'}</span>
            </button>
            <button disabled={!actief || bezig !== null} onClick={doCheckOut} className={`rounded-[12px] p-3.5 text-left flex flex-col gap-2 border transition active:scale-[0.97] disabled:active:scale-100 cursor-pointer disabled:cursor-not-allowed ${actief ? 'bg-ink border-transparent text-white' : 'bg-paper border-line text-ink-3 disabled:opacity-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold">Uitchecken</span>
                {bezig === 'uit' ? <Spinner /> : <LogOut size={15} />}
              </div>
              <span className={`font-tight text-[13px] tabular ${actief ? 'text-white/70' : 'text-ink-2'}`}>{mijnUren.at(-1)?.eind ?? '—  :  —'}</span>
            </button>
          </div>
          {actief && (
            <div className="mt-3 flex items-center gap-2 text-[12.5px]">
              <span className="text-ink-3">Pauze bij uitchecken</span>
              <div className="ml-auto inline-flex rounded-[8px] border border-line p-0.5">
                {[0, 30, 45, 60].map((p) => (
                  <button key={p} onClick={() => setPauze(p)} className={`px-2.5 py-1 rounded-[6px] text-[12px] font-semibold cursor-pointer ${pauze === p ? 'bg-ink text-white' : 'text-ink-2'}`}>
                    {p} min
                  </button>
                ))}
              </div>
            </div>
          )}
          {mijnUren.length > 0 && (
            <div className="mt-3 pt-3 border-t border-line grid gap-1.5">
              {gpsRij('Start', mijnUren.at(-1)!.checkIn)}
              {gpsRij('Einde', mijnUren.at(-1)!.checkOut)}
            </div>
          )}
        </div>
      </Sectie>

      {/* Checklist */}
      <Sectie icon={ClipboardList} titel="Werkzaamheden" meta={`${wb.checklist.filter((c) => c.gedaan).length}/${wb.checklist.length}`}>
        <div className="card px-4 py-1">
          {wb.checklist.map((c) => (
            <button key={c.id} disabled={afgerond} onClick={() => store.toggleChecklist(id, c.id)} className="w-full flex items-center gap-3 py-3 border-b border-line last:border-b-0 text-left cursor-pointer disabled:cursor-default">
              {c.gedaan ? <CheckSquare size={22} className="text-good shrink-0" strokeWidth={1.8} /> : <Square size={22} className="text-ink-4 shrink-0" strokeWidth={1.6} />}
              <span className={`text-[15px] ${c.gedaan ? 'text-ink-3 line-through decoration-line-2' : 'text-ink font-medium'}`}>{c.tekst}</span>
            </button>
          ))}
        </div>
      </Sectie>

      {/* Uren */}
      {mijnUren.length > 0 && (
        <Sectie icon={Clock} titel="Mijn uren op deze bon" meta={urenLabel(totaal)}>
          <div className="card px-4 py-1">
            {mijnUren.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-b-0">
                <div className="flex-1">
                  <div className="text-[14px] font-semibold tabular">
                    {u.start} – {u.eind ?? '…'}
                    {u.pauzeMinuten ? <span className="text-ink-3 font-normal text-[12px]"> · {u.pauzeMinuten} min pauze</span> : null}
                  </div>
                  <select className="text-[12px] text-ink-3 bg-transparent outline-none mt-0.5" value={u.uursoort} disabled={u.goedgekeurd} onChange={(e) => store.saveUrenregel({ ...u, uursoort: e.target.value as Uursoort })}>
                    {(Object.keys(UURSOORT_LABEL) as Uursoort[]).map((k) => (
                      <option key={k} value={k}>
                        {UURSOORT_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-right">
                  <div className="font-tight font-semibold text-[16px] tabular">{u.eind ? urenLabel(urenVanRegel(u)) : <span className="text-accent text-[12px]">actief</span>}</div>
                  {u.goedgekeurd && <div className="text-[10.5px] text-good font-semibold">goedgekeurd</div>}
                </div>
              </div>
            ))}
          </div>
        </Sectie>
      )}

      {/* Materiaal */}
      <Sectie icon={PlusSquare} titel="Materiaal" meta={materiaal.length ? `${materiaal.length} regels` : undefined}>
        <div className="card px-4 py-1">
          {materiaal.map((m) => (
            <div key={m.id} className="flex items-center gap-2 py-2.5 border-b border-line last:border-b-0 text-[13.5px]">
              <span className="flex-1 min-w-0 truncate">{m.artikel}</span>
              <span className="tabular text-ink-2 whitespace-nowrap">
                {getal(m.aantal, m.aantal % 1 ? 1 : 0)} {m.eenheid}
              </span>
              {!afgerond && (
                <button onClick={() => store.deleteMateriaal(m.id)} className="w-7 h-7 rounded-full hover:bg-bg-2 flex items-center justify-center text-ink-4 cursor-pointer" aria-label="Verwijderen">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          {!afgerond && (
            <button onClick={() => setMateriaalOpen(true)} className="w-full my-2 border border-dashed border-line-2 rounded-[12px] py-3.5 flex items-center justify-center gap-2 text-[14px] font-medium text-ink-2 bg-bg-2 active:bg-line cursor-pointer">
              <Plus size={15} /> Materiaal toevoegen
            </button>
          )}
          {afgerond && materiaal.length === 0 && <div className="py-3 text-[13px] text-ink-3">Geen materiaal geboekt.</div>}
        </div>
      </Sectie>

      {/* Foto's */}
      <Sectie icon={Camera} titel="Foto's" meta={fotos.length ? `${fotos.length} toegevoegd` : undefined}>
        <div className="card p-3">
          <input ref={fotoRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={kiesFoto} />
          {!afgerond && (
            <>
              <div className="flex gap-1 flex-wrap mb-2">
                {(Object.keys(FOTO_CATEGORIE) as FotoCategorie[]).map((c) => (
                  <button key={c} onClick={() => setFotoCat(c)} className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border cursor-pointer ${fotoCat === c ? 'bg-ink text-white border-ink' : 'border-line text-ink-2'}`}>
                    {FOTO_CATEGORIE[c]}
                  </button>
                ))}
              </div>
              <button onClick={() => fotoRef.current?.click()} disabled={fotoBezig} className="w-full border border-dashed border-line-2 rounded-[12px] py-4 flex items-center justify-center gap-2 text-[14px] font-medium text-ink-2 bg-bg-2 active:bg-line cursor-pointer mb-2">
                {fotoBezig ? <Spinner donker /> : <Camera size={16} />} Foto maken ({FOTO_CATEGORIE[fotoCat].toLowerCase()})
              </button>
            </>
          )}
          <FotoGrid fotos={fotos} compact filter={false} verwijderbaar={!afgerond} />
        </div>
      </Sectie>

      {/* Notities */}
      <Sectie icon={PenLine} titel="Notities">
        <div className="card p-3">
          <textarea className="w-full bg-transparent outline-none text-[14.5px] leading-relaxed min-h-[76px] resize-none placeholder:text-ink-4" placeholder="Bijzonderheden, afspraken met bewoner, restpunten…" value={notities} onChange={(e) => setNotities(e.target.value)} onBlur={bewaarNotities} disabled={afgerond} />
        </div>
      </Sectie>

      {/* Meerwerk */}
      <Sectie icon={PlusSquare} titel="Meerwerk" meta={meerwerk.length ? `${meerwerk.length} gemeld` : undefined}>
        <div className="card p-3 grid gap-2">
          {meerwerk.map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-[13px] border border-line rounded-[10px] px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{m.omschrijving}</div>
                <div className="text-ink-3 text-[12px] tabular">
                  {m.nummer} · {euro(m.bedrag)}
                </div>
              </div>
              <Badge label={{ gemeld: 'Gemeld', ter_akkoord: 'Bij klant', akkoord: 'Akkoord', afgewezen: 'Afgewezen' }[m.status]} kleur={{ gemeld: 'bg-bg-2 text-ink-2', ter_akkoord: 'bg-amber-50 text-warn', akkoord: 'bg-green-50 text-good', afgewezen: 'bg-red-50 text-bad' }[m.status]} />
            </div>
          ))}
          {!afgerond && (
            <button onClick={() => setMeerwerkOpen(true)} className="btn-outline w-full !py-3" data-tour="veld-meerwerk">
              <PlusSquare size={15} /> Meerwerk melden
            </button>
          )}
        </div>
      </Sectie>

      {/* Handtekening */}
      <Sectie icon={PenLine} titel="Handtekening klant">
        <div className="card p-3">
          {wb.handtekeningKlant ? (
            <div>
              <img src={wb.handtekeningKlant} alt="Handtekening" className="h-24 mx-auto" />
              <div className="text-[12px] text-ink-3 text-center">
                {wb.handtekeningNaam} · {tijd(wb.handtekeningOp)}
              </div>
              {!afgerond && (
                <button onClick={() => store.updateWerkbon(id, { handtekeningKlant: undefined, handtekeningNaam: undefined, handtekeningOp: undefined })} className="btn-ghost btn-sm w-full mt-1 text-ink-3">
                  <X size={13} /> Opnieuw laten tekenen
                </button>
              )}
            </div>
          ) : afgerond ? (
            <div className="text-[13px] text-ink-3 py-2">Geen handtekening vastgelegd.</div>
          ) : (
            <button onClick={() => setTekenOpen(true)} className="btn-outline w-full !py-3">
              <PenLine size={15} /> Klant laten tekenen
            </button>
          )}
        </div>
      </Sectie>

      {/* Afronden – zoals de submit-knop in app.html */}
      {!afgerond ? (
        <button onClick={afronden} disabled={!!actief || mijnUren.length === 0} className="w-full bg-ink text-white rounded-[14px] px-4 py-4 flex items-center justify-between disabled:opacity-30 active:scale-[0.98] transition cursor-pointer disabled:cursor-not-allowed" data-tour="veld-afronden">
          <span className="text-[15px] font-semibold tracking-[-0.02em]">{actief ? 'Eerst uitchecken' : mijnUren.length === 0 ? 'Check eerst in' : alleTakenGedaan ? 'Werkbon afronden' : 'Afronden (niet alle taken afgevinkt)'}</span>
          <span className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
            <Check size={15} strokeWidth={2.4} />
          </span>
        </button>
      ) : (
        <div className="card p-4 flex items-center gap-3 bg-green-50/60 border-good/30">
          <span className="w-8 h-8 rounded-full bg-good text-white flex items-center justify-center">
            <Check size={16} strokeWidth={2.4} />
          </span>
          <div className="text-[13.5px]">
            <div className="font-semibold">Werkbon {wb.status === 'goedgekeurd' ? 'goedgekeurd door de projectleider' : 'ingediend'}</div>
            <div className="text-ink-3 text-[12.5px]">{wb.status === 'gereed' ? 'Wacht op goedkeuring van de projectleider.' : 'Uren zijn verwerkt.'}</div>
          </div>
        </div>
      )}

      <MateriaalModal open={materiaalOpen} onClose={() => setMateriaalOpen(false)} opdrachtId={o.id} werkbonId={id} />
      {meerwerkOpen && <MeerwerkMeldenModal werkbonId={id} onClose={() => setMeerwerkOpen(false)} />}
      <Modal
        open={tekenOpen}
        onClose={() => setTekenOpen(false)}
        titel="Handtekening klant"
        footer={
          <button className="btn-outline btn-sm" onClick={() => setTekenOpen(false)}>
            Annuleren
          </button>
        }
      >
        <TekenFormulier
          onKlaar={(naam, dataUrl) => {
            store.updateWerkbon(id, { handtekeningKlant: dataUrl, handtekeningNaam: naam, handtekeningOp: new Date().toISOString() })
            store.addTijdlijn({ opdrachtId: o.id, type: 'werkbon', tekst: `Werkbon ${wb.nummer} getekend door ${naam}`, door: mw?.naam })
            setTekenOpen(false)
            toast('Handtekening opgeslagen', 'good')
          }}
        />
      </Modal>
    </div>
  )
}

function TekenFormulier({ onKlaar }: { onKlaar: (naam: string, dataUrl: string) => void }) {
  const [naam, setNaam] = useState('')
  const [hand, setHand] = useState<string | null>(null)
  return (
    <div className="grid gap-3">
      <p className="text-[13px] text-ink-3">Laat de klant of bewoner tekenen voor akkoord op de uitgevoerde werkzaamheden.</p>
      <Veld label="Naam ondertekenaar">
        <input className="input" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Bijv. M. Verhoef" />
      </Veld>
      <Handtekening onChange={setHand} />
      <button className="btn-ink w-full" disabled={!naam.trim() || !hand} onClick={() => onKlaar(naam.trim(), hand!)}>
        <Check size={15} /> Handtekening opslaan
      </button>
    </div>
  )
}

function MeerwerkMeldenModal({ werkbonId, onClose }: { werkbonId: string; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const { veldMedewerkerId } = useRol()
  const wb = store.getWerkbon(werkbonId)!
  const o = store.getOpdracht(wb.opdrachtId)!
  const mw = store.getMedewerker(veldMedewerkerId)
  const [oms, setOms] = useState('')
  const [reden, setReden] = useState('')
  const [uren, setUren] = useState(2)
  const [mat, setMat] = useState(0)
  const [matOms, setMatOms] = useState('')
  const [fotoIds, setFotoIds] = useState<string[]>([])
  const [bezig, setBezig] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const tarief = mw?.uurtariefVerkoop ?? 60

  const kies = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    setBezig(true)
    const { punt } = await haalGps(o.locatie)
    for (const f of files) {
      const dataUrl = await comprimeerAfbeelding(f, 1600)
      const foto = store.addFoto({ werkbonId, opdrachtId: o.id, dataUrl, tijdstempel: new Date().toISOString(), gps: { lat: punt.lat, lng: punt.lng }, categorie: 'meerwerk', bijschrift: oms || 'Meerwerk', medewerkerId: veldMedewerkerId })
      setFotoIds((x) => [...x, foto.id])
    }
    setBezig(false)
  }
  const meld = () => {
    if (!oms.trim()) {
      toast('Geef een omschrijving', 'bad')
      return
    }
    const m = store.createMeerwerk({ opdrachtId: o.id, werkbonId, omschrijving: oms.trim(), reden: reden.trim(), fotoIds, geschatteUren: uren, uurtarief: tarief, materiaalBedrag: mat, materiaalOmschrijving: matOms.trim() || undefined, status: 'gemeld', gemeldDoor: veldMedewerkerId, gemeldOp: new Date().toISOString() })
    toast(`Meerwerk ${m.nummer} gemeld aan de projectleider`, 'good')
    onClose()
  }
  const fotos = store.getFotos().filter((f) => fotoIds.includes(f.id))
  return (
    <Modal
      open
      onClose={onClose}
      titel="Meerwerk melden"
      footer={
        <>
          <button className="btn-outline btn-sm" onClick={onClose}>
            Annuleren
          </button>
          <button className="btn-primary btn-sm" onClick={meld}>
            <PlusSquare size={14} /> Melden
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <Veld label="Wat moet er extra gebeuren?">
          <input className="input !text-[15px]" value={oms} onChange={(e) => setOms(e.target.value)} placeholder="Bijv. extra afvoer verleggen" autoFocus />
        </Veld>
        <Veld label="Waarom (reden)?">
          <textarea className="input min-h-[70px]" value={reden} onChange={(e) => setReden(e.target.value)} placeholder="Bijv. bestaande leiding ligt anders dan op tekening" />
        </Veld>
        <div className="grid grid-cols-2 gap-3">
          <Veld label="Geschatte uren">
            <input type="number" className="input" step={0.5} min={0} value={uren} onChange={(e) => setUren(Number(e.target.value))} />
          </Veld>
          <Veld label="Materiaal (€ excl. btw)">
            <input type="number" className="input" step={5} min={0} value={mat} onChange={(e) => setMat(Number(e.target.value))} />
          </Veld>
        </div>
        <Veld label="Materiaal omschrijving (optioneel)">
          <input className="input" value={matOms} onChange={(e) => setMatOms(e.target.value)} />
        </Veld>
        <div>
          <span className="label">Foto's</span>
          <input ref={ref} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={kies} />
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((f) => (
              <img key={f.id} src={f.dataUrl} alt="" className="aspect-[4/3] object-cover rounded-[10px] border border-line" />
            ))}
            <button onClick={() => ref.current?.click()} className="aspect-[4/3] rounded-[10px] border border-dashed border-line-2 bg-bg-2 flex items-center justify-center text-ink-3 cursor-pointer">
              {bezig ? <Spinner donker /> : <Camera size={18} />}
            </button>
          </div>
        </div>
        <div className="text-[13px] text-ink-3">
          Indicatie: {getal(uren, 1)} u × {euro(tarief)} + {euro(mat)} = <span className="font-semibold text-ink tabular">{euro(uren * tarief + mat)}</span> excl. btw. De projectleider controleert dit en stuurt het ter akkoord naar de klant.
        </div>
      </div>
    </Modal>
  )
}
