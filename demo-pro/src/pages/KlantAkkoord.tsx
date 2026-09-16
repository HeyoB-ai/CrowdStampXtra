import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Handtekening } from '../components/Handtekening'
import { KaleLayout } from '../components/Layout'
import { Logo, Rij, useToast, Veld } from '../components/ui'
import { useStore } from '../data/StoreContext'
import { datum, datumTijd, euro, getal } from '../lib/format'

/**
 * Deelbare klantakkoord-pagina voor een meerwerkpost.
 * In productie: beveiligde link (token) per e-mail/SMS, zonder inlog.
 */
export default function KlantAkkoord() {
  const { id = '' } = useParams()
  const store = useStore()
  const toast = useToast()
  const m = store.getMeerwerkItem(id)
  const [naam, setNaam] = useState('')
  const [hand, setHand] = useState<string | null>(null)
  const [afwijzen, setAfwijzen] = useState(false)
  const [reden, setReden] = useState('')

  if (!m)
    return (
      <KaleLayout>
        <div className="card p-8 text-center text-[14px] text-ink-3">Deze akkoord-link is niet (meer) geldig.</div>
      </KaleLayout>
    )
  const o = store.getOpdracht(m.opdrachtId)!
  const k = store.getKlant(o.klantId)!
  const bedrijf = store.getState().bedrijf
  const fotos = store.getFotos().filter((f) => m.fotoIds.includes(f.id))
  const btw = o.btwVerlegd ? 0 : (m.bedrag * o.btwPercentage) / 100

  const akkoord = () => {
    if (!naam.trim() || !hand) return
    store.akkoordMeerwerk(m.id, naam.trim(), hand)
    toast('Bedankt, uw akkoord is vastgelegd', 'good')
  }

  return (
    <KaleLayout>
      <div className="flex items-center justify-between mb-5">
        <Logo pro={false} />
        <span className="text-[12px] text-ink-3">Namens {bedrijf.naam}</span>
      </div>

      {m.status === 'akkoord' ? (
        <div className="card p-6 text-center">
          <span className="w-12 h-12 rounded-full bg-good text-white inline-flex items-center justify-center mb-3">
            <Check size={22} strokeWidth={2.5} />
          </span>
          <h1 className="text-[22px] font-bold">Akkoord vastgelegd</h1>
          <p className="text-[14px] text-ink-3 mt-1">
            {m.akkoordDoor} heeft op {datumTijd(m.akkoordOp)} akkoord gegeven op meerwerk {m.nummer}.
          </p>
          {m.akkoordHandtekening && <img src={m.akkoordHandtekening} alt="Handtekening" className="h-20 mx-auto mt-3 border border-line rounded-[10px] bg-paper" />}
          <div className="text-[13px] mt-4 text-ink-2">
            Bedrag: <span className="font-semibold tabular">{euro(m.bedrag)}</span> excl. btw. Het meerwerk is toegevoegd aan de calculatie en wordt bij de volgende factuur meegenomen.
          </div>
          <Link to={`/beheer/opdrachten/${o.id}?tab=meerwerk`} className="btn-outline btn-sm mt-5">
            Terug naar de demo (beheer)
          </Link>
        </div>
      ) : m.status === 'afgewezen' ? (
        <div className="card p-6 text-center">
          <span className="w-12 h-12 rounded-full bg-bad text-white inline-flex items-center justify-center mb-3">
            <X size={22} strokeWidth={2.5} />
          </span>
          <h1 className="text-[22px] font-bold">Meerwerk afgewezen</h1>
          <p className="text-[14px] text-ink-3 mt-1">{m.afgewezenReden}</p>
          <Link to={`/beheer/opdrachten/${o.id}?tab=meerwerk`} className="btn-outline btn-sm mt-5">
            Terug naar de demo (beheer)
          </Link>
        </div>
      ) : (
        <>
          <div className="eyebrow mb-1">Verzoek tot akkoord meerwerk</div>
          <h1 className="text-[26px] md:text-[30px] font-bold leading-[1.1]">{m.omschrijving}</h1>
          <p className="text-[14px] text-ink-3 mt-2">
            Geachte {k.contactpersoon.split(' (')[0]}, tijdens de uitvoering van <span className="font-medium text-ink">{o.omschrijving}</span> ({o.nummer}) is onderstaand meerwerk geconstateerd. Wij vragen u dit te beoordelen en bij akkoord te ondertekenen.
          </p>

          <div className="card p-5 mt-5">
            <div className="label mb-1">Toelichting</div>
            <p className="text-[14.5px] leading-relaxed">{m.reden}</p>
            {fotos.length > 0 && (
              <div className={`grid gap-2 mt-4 ${fotos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {fotos.map((f) => (
                  <img key={f.id} src={f.dataUrl} alt={f.bijschrift} className="w-full rounded-[10px] border border-line" />
                ))}
              </div>
            )}
          </div>

          <div className="card px-5 py-1 mt-4">
            <div className="label pt-4">Specificatie</div>
            <Rij k={`Arbeid: ${getal(m.geschatteUren, 1)} uur × ${euro(m.uurtarief)}`} v={euro(m.geschatteUren * m.uurtarief)} mono />
            <Rij k={`Materiaal${m.materiaalOmschrijving ? `: ${m.materiaalOmschrijving}` : ''}`} v={euro(m.materiaalBedrag)} mono />
            <Rij k="Subtotaal excl. btw" v={euro(m.bedrag)} mono />
            <Rij k={o.btwVerlegd ? 'Btw verlegd' : `Btw ${o.btwPercentage}%`} v={euro(btw)} mono />
            <Rij k={<span className="font-bold text-ink">Totaal</span>} v={<span className="text-[17px]">{euro(m.bedrag + btw)}</span>} mono />
            <div className="text-[11.5px] text-ink-4 py-3">
              Gemeld op {datum(m.gemeldOp)} door {store.getMedewerker(m.gemeldDoor)?.naam}. Uitvoering na akkoord, facturatie op basis van werkelijke uren tot maximaal het bovenstaande bedrag.
            </div>
          </div>

          {!afwijzen ? (
            <div className="card p-5 mt-4" data-tour="klantakkoord">
              <div className="font-tight font-semibold text-[16px] mb-3">Akkoord geven</div>
              <div className="grid gap-3">
                <Veld label="Uw naam">
                  <input className="input" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder={k.contactpersoon.split(' (')[0]} />
                </Veld>
                <div>
                  <span className="label">Handtekening</span>
                  <Handtekening onChange={setHand} />
                </div>
                <button className="btn-primary btn-lg w-full" disabled={!naam.trim() || !hand} onClick={akkoord}>
                  <Check size={16} /> Ik ga akkoord met dit meerwerk
                </button>
                <button className="btn-ghost btn-sm text-ink-3" onClick={() => setAfwijzen(true)}>
                  Ik ga niet akkoord
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-5 mt-4">
              <div className="font-tight font-semibold text-[16px] mb-3">Niet akkoord</div>
              <Veld label="Reden (optioneel)">
                <textarea className="input min-h-[70px]" value={reden} onChange={(e) => setReden(e.target.value)} />
              </Veld>
              <div className="flex gap-2 mt-3">
                <button className="btn-outline btn-sm" onClick={() => setAfwijzen(false)}>
                  Terug
                </button>
                <button className="btn-ink btn-sm" onClick={() => { store.wijsMeerwerkAf(m.id, reden.trim() || 'Afgewezen door klant via akkoord-pagina'); toast('Uw reactie is doorgegeven') }}>
                  Afwijzing versturen
                </button>
              </div>
            </div>
          )}

          <div className="text-[11.5px] text-ink-4 mt-6 text-center">
            {bedrijf.naam} · {bedrijf.adres.straat}, {bedrijf.adres.postcode} {bedrijf.adres.plaats} · KvK {bedrijf.kvk} · {bedrijf.email}
          </div>
        </>
      )}
    </KaleLayout>
  )
}
