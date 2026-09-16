import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { nieuwId } from '../../data/store'
import { useStore } from '../../data/StoreContext'
import { berekenNacalculatie, KOSTENSOORTEN, type Nacalculatie } from '../../lib/calculatie'
import { euro, getal, procent } from '../../lib/format'
import type { CalculatieRegel, ID, Kostensoort } from '../../types'
import { KpiCard, Modal, useToast, Veld, Voortgang } from '../ui'

const kleurKlasse = (k: 'good' | 'warn' | 'bad') => ({ good: 'text-good', warn: 'text-warn', bad: 'text-bad' })[k]
const kleurBg = (k: 'good' | 'warn' | 'bad') => ({ good: 'bg-green-50 text-good', warn: 'bg-amber-50 text-warn', bad: 'bg-red-50 text-bad' })[k]

function verschilKleur(pct: number, verschil: number): 'good' | 'warn' | 'bad' {
  if (verschil <= 0) return 'good'
  if (pct > 15) return 'bad'
  if (pct > 5) return 'warn'
  return 'good'
}

/** Voor- en nacalculatie voor één opdracht */
export function NacalculatiePanel({ opdrachtId }: { opdrachtId: ID }) {
  const store = useStore()
  const toast = useToast()
  const nc = berekenNacalculatie(store, opdrachtId)
  const [bewerkVoortgang, setBewerkVoortgang] = useState(false)
  if (!nc) return null
  const o = nc.opdracht
  const meerwerkRegels = o.voorcalculatie.filter((r) => r.uitMeerwerk)

  return (
    <div className="grid gap-4" data-tour="nacalculatie">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label={o.contractvorm === 'aanneemsom' ? 'Aanneemsom' : 'Begrote omzet (regie)'} waarde={euro(nc.contractwaarde)} sub={nc.meerwerkAkkoord > 0 ? `+ ${euro(nc.meerwerkAkkoord)} meerwerk akkoord` : 'excl. btw'} />
        <KpiCard label="Begrote kosten" waarde={euro(nc.begrootKost)} sub={`marge ${procent(nc.begrootMargePct, 1)} · resultaat ${euro(nc.begrootResultaat)}`} />
        <KpiCard label="Werkelijke kosten" waarde={euro(nc.werkelijkKost)} sub={`${procent(nc.budgetVerbruiktPct)} van budget verbruikt`} kleur={nc.budgetVerbruiktPct > 100 ? 'bad' : nc.budgetVerbruiktPct > 90 ? 'warn' : undefined} />
        <KpiCard
          label="Voortgang"
          waarde={`${o.voortgang}%`}
          sub={
            <span className="inline-flex items-center gap-1">
              <button className="text-accent font-semibold inline-flex items-center gap-1 cursor-pointer" onClick={() => setBewerkVoortgang(true)}>
                <Pencil size={11} /> aanpassen
              </button>
            </span>
          }
        />
        <KpiCard label="Prognose eindresultaat" waarde={euro(nc.prognoseResultaat)} sub={`marge ${procent(nc.prognoseMargePct, 1)} · ${nc.prognoseResultaat >= nc.begrootResultaat ? '+' : ''}${euro(nc.prognoseResultaat - nc.begrootResultaat)} t.o.v. begroot`} kleur={nc.kleur === 'good' ? 'good' : nc.kleur} />
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between flex-wrap gap-2">
          <div className="font-tight font-semibold text-[15px]">Begroot versus werkelijk per kostensoort</div>
          <div className="text-[12px] text-ink-3">Verwacht = begroot × voortgang ({o.voortgang}%). Verschil = werkelijk − verwacht.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr>
                <th className="th">Kostensoort</th>
                <th className="th text-right">Begroot (kost)</th>
                <th className="th text-right">Verwacht bij {o.voortgang}%</th>
                <th className="th text-right">Werkelijk</th>
                <th className="th text-right">Verschil €</th>
                <th className="th text-right">Verschil %</th>
                <th className="th w-[180px]">Verbruik budget</th>
              </tr>
            </thead>
            <tbody>
              {nc.perSoort.map((p) => {
                const k = verschilKleur(p.verschilPct, p.verschil)
                const pct = p.begrootKost ? (p.werkelijkKost / p.begrootKost) * 100 : 0
                return (
                  <tr key={p.soort}>
                    <td className="td font-medium">{p.naam}</td>
                    <td className="td text-right tabular text-ink-2">{euro(p.begrootKost)}</td>
                    <td className="td text-right tabular text-ink-2">{euro(p.verwachtKost)}</td>
                    <td className="td text-right tabular font-semibold">{euro(p.werkelijkKost)}</td>
                    <td className={`td text-right tabular font-semibold ${kleurKlasse(k)}`}>
                      {p.verschil > 0 ? '+' : ''}
                      {euro(p.verschil)}
                    </td>
                    <td className={`td text-right tabular ${kleurKlasse(k)}`}>
                      <span className={`pill ${kleurBg(k)}`}>
                        {p.verschil > 0 ? '+' : ''}
                        {procent(p.verschilPct, 1)}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <Voortgang pct={pct} kleur={pct > 100 ? 'bad' : pct > o.voortgang + 5 ? 'warn' : 'good'} dun />
                        <span className="text-[11.5px] tabular text-ink-3 w-10 text-right">{Math.round(pct)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              <tr className="bg-bg/60">
                <td className="td font-bold">Totaal kosten</td>
                <td className="td text-right tabular font-bold">{euro(nc.begrootKost)}</td>
                <td className="td text-right tabular font-bold">{euro((nc.begrootKost * Math.max(o.voortgang, 1)) / 100)}</td>
                <td className="td text-right tabular font-bold">{euro(nc.werkelijkKost)}</td>
                <td className={`td text-right tabular font-bold ${kleurKlasse(nc.kleur)}`}>
                  {nc.werkelijkKost - (nc.begrootKost * Math.max(o.voortgang, 1)) / 100 > 0 ? '+' : ''}
                  {euro(nc.werkelijkKost - (nc.begrootKost * Math.max(o.voortgang, 1)) / 100)}
                </td>
                <td className="td"></td>
                <td className="td"></td>
              </tr>
              <tr>
                <td className="td font-medium text-violet-700">Meerwerk (apart)</td>
                <td className="td text-right tabular text-ink-3" colSpan={2}>
                  akkoord {euro(nc.meerwerkAkkoord)} · ter akkoord {euro(nc.meerwerkTerAkkoord)}
                </td>
                <td className="td text-right tabular font-semibold text-violet-700">{euro(nc.meerwerkAkkoord)}</td>
                <td className="td text-right text-[12px] text-ink-3" colSpan={3}>
                  Extra omzet bovenop de {o.contractvorm === 'aanneemsom' ? 'aanneemsom' : 'regie-omzet'}; kosten zitten in de uren en het materiaal hierboven.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-line grid sm:grid-cols-3 gap-3 text-[13px]">
          <div>
            <div className="text-ink-3 text-[11.5px]">Prognose eindkosten</div>
            <div className="font-semibold tabular">{euro(nc.prognoseKost)}</div>
            <div className="text-[11.5px] text-ink-3">werkelijk ÷ voortgang</div>
          </div>
          <div>
            <div className="text-ink-3 text-[11.5px]">Prognose omzet</div>
            <div className="font-semibold tabular">{euro(nc.prognoseOmzet)}</div>
            <div className="text-[11.5px] text-ink-3">{o.contractvorm === 'aanneemsom' ? 'aanneemsom + akkoord meerwerk' : 'gerealiseerd ÷ voortgang + meerwerk'}</div>
          </div>
          <div>
            <div className="text-ink-3 text-[11.5px]">Uren</div>
            <div className="font-semibold tabular">
              {getal(nc.gewerkteUren, 1)} van {getal(nc.begroteUren, 0)} begroot
            </div>
            <div className="text-[11.5px] text-ink-3">{nc.begroteUren ? `${Math.round((nc.gewerkteUren / nc.begroteUren) * 100)}% van de begrote uren` : '—'}</div>
          </div>
        </div>
      </div>

      <VoorcalculatieTabel opdrachtId={opdrachtId} />

      {meerwerkRegels.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line font-tight font-semibold text-[15px]">Akkoord meerwerk in calculatie</div>
          <table className="w-full">
            <tbody>
              {meerwerkRegels.map((r) => (
                <tr key={r.id}>
                  <td className="td">{r.omschrijving}</td>
                  <td className="td text-right tabular text-ink-2">kost {euro(r.kostprijs)}</td>
                  <td className="td text-right tabular font-semibold">{euro(r.verkoopprijs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={bewerkVoortgang}
        onClose={() => setBewerkVoortgang(false)}
        titel="Voortgang bijwerken"
        footer={
          <button className="btn-ink btn-sm" onClick={() => setBewerkVoortgang(false)}>
            Klaar
          </button>
        }
      >
        <p className="text-[13px] text-ink-3 mb-3">De voortgang bepaalt de verwachte kosten, de prognose en het termijnbedrag dat je kunt factureren.</p>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={100} step={5} value={o.voortgang} onChange={(e) => store.updateOpdracht(o.id, { voortgang: Number(e.target.value) })} className="flex-1 accent-accent" />
          <span className="font-tight font-semibold text-[22px] tabular w-16 text-right">{o.voortgang}%</span>
        </div>
        <button className="btn-outline btn-sm mt-3" onClick={() => { store.updateOpdracht(o.id, { voortgang: 100, status: o.status === 'in_uitvoering' ? 'opgeleverd' : o.status }); toast('Opdracht op 100% en opgeleverd', 'good'); setBewerkVoortgang(false) }}>
          Markeer als opgeleverd (100%)
        </button>
      </Modal>
    </div>
  )
}

/** Voorcalculatie-regels bewerken */
export function VoorcalculatieTabel({ opdrachtId, compact = false }: { opdrachtId: ID; compact?: boolean }) {
  const store = useStore()
  const o = store.getOpdracht(opdrachtId)
  const [bewerk, setBewerk] = useState<CalculatieRegel | null>(null)
  if (!o) return null
  const regels = o.voorcalculatie.filter((r) => !r.uitMeerwerk)
  const totKost = regels.reduce((s, r) => s + r.aantal * r.kostprijs, 0)
  const totVerkoop = regels.reduce((s, r) => s + r.aantal * r.verkoopprijs, 0)
  const nieuw = () => setBewerk({ id: nieuwId('cr'), type: 'arbeid', omschrijving: '', aantal: 1, eenheid: 'uur', kostprijs: 38, verkoopprijs: 62, opslagPercentage: 63.2 })

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between flex-wrap gap-2">
        <div className="font-tight font-semibold text-[15px]">Voorcalculatie</div>
        <button className="btn-outline btn-sm" onClick={nieuw}>
          <Plus size={13} /> Regel toevoegen
        </button>
      </div>
      {regels.length === 0 ? (
        <div className="p-6 text-center text-[13px] text-ink-3">Nog geen voorcalculatie. Voeg regels toe of importeer ze bij het inladen van de opdracht.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr>
                <th className="th">Soort</th>
                <th className="th">Omschrijving</th>
                <th className="th text-right">Aantal</th>
                <th className="th text-right">Kostprijs</th>
                <th className="th text-right">Verkoop</th>
                <th className="th text-right">Opslag</th>
                <th className="th text-right">Totaal kost</th>
                <th className="th text-right">Totaal verkoop</th>
                {!compact && <th className="th w-16"></th>}
              </tr>
            </thead>
            <tbody>
              {KOSTENSOORTEN.map(({ code, naam }) => {
                const rs = regels.filter((r) => r.type === code)
                if (rs.length === 0) return null
                return rs.map((r, i) => (
                  <tr key={r.id}>
                    <td className="td text-[12px] text-ink-3 whitespace-nowrap">{i === 0 ? naam : ''}</td>
                    <td className="td font-medium">{r.omschrijving}</td>
                    <td className="td text-right tabular whitespace-nowrap">
                      {getal(r.aantal, r.aantal % 1 ? 1 : 0)} {r.eenheid}
                    </td>
                    <td className="td text-right tabular text-ink-2">{euro(r.kostprijs)}</td>
                    <td className="td text-right tabular text-ink-2">{euro(r.verkoopprijs)}</td>
                    <td className="td text-right tabular text-ink-3 text-[12px]">{procent(r.opslagPercentage, 1)}</td>
                    <td className="td text-right tabular">{euro(r.aantal * r.kostprijs)}</td>
                    <td className="td text-right tabular font-semibold">{euro(r.aantal * r.verkoopprijs)}</td>
                    {!compact && (
                      <td className="td">
                        <div className="flex justify-end gap-0.5">
                          <button className="w-7 h-7 rounded-[8px] hover:bg-bg-2 flex items-center justify-center cursor-pointer text-ink-3" onClick={() => setBewerk({ ...r })} aria-label="Bewerken">
                            <Pencil size={13} />
                          </button>
                          <button className="w-7 h-7 rounded-[8px] hover:bg-bg-2 flex items-center justify-center cursor-pointer text-ink-3" onClick={() => store.deleteCalculatieRegel(opdrachtId, r.id)} aria-label="Verwijderen">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              })}
              <tr className="bg-bg/60">
                <td className="td font-bold" colSpan={6}>
                  Totaal · marge {euro(totVerkoop - totKost)} ({totVerkoop ? procent(((totVerkoop - totKost) / totVerkoop) * 100, 1) : '—'})
                  {o.contractvorm === 'aanneemsom' && o.aanneemsom !== undefined && <span className="text-ink-3 font-normal text-[12px]"> · aanneemsom {euro(o.aanneemsom)}</span>}
                </td>
                <td className="td text-right tabular font-bold">{euro(totKost)}</td>
                <td className="td text-right tabular font-bold">{euro(totVerkoop)}</td>
                {!compact && <td className="td"></td>}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {bewerk && <CalculatieRegelModal regel={bewerk} onClose={() => setBewerk(null)} onSave={(r) => { store.saveCalculatieRegel(opdrachtId, r); setBewerk(null) }} />}
    </div>
  )
}

export function CalculatieRegelModal({ regel, onClose, onSave }: { regel: CalculatieRegel; onClose: () => void; onSave: (r: CalculatieRegel) => void }) {
  const [r, setR] = useState(regel)
  const zet = (patch: Partial<CalculatieRegel>) => {
    const n = { ...r, ...patch }
    n.opslagPercentage = n.kostprijs ? Math.round(((n.verkoopprijs - n.kostprijs) / n.kostprijs) * 1000) / 10 : 0
    setR(n)
  }
  return (
    <Modal
      open
      onClose={onClose}
      titel="Calculatieregel"
      footer={
        <>
          <button className="btn-outline btn-sm" onClick={onClose}>
            Annuleren
          </button>
          <button className="btn-ink btn-sm" disabled={!r.omschrijving.trim()} onClick={() => onSave(r)}>
            Opslaan
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Veld label="Kostensoort">
          <select className="input" value={r.type} onChange={(e) => zet({ type: e.target.value as Kostensoort })}>
            {KOSTENSOORTEN.map((k) => (
              <option key={k.code} value={k.code}>
                {k.naam}
              </option>
            ))}
          </select>
        </Veld>
        <Veld label="Eenheid">
          <input className="input" value={r.eenheid} onChange={(e) => zet({ eenheid: e.target.value })} />
        </Veld>
        <Veld label="Omschrijving" className="col-span-2">
          <input className="input" value={r.omschrijving} onChange={(e) => zet({ omschrijving: e.target.value })} autoFocus />
        </Veld>
        <Veld label="Aantal">
          <input type="number" className="input" value={r.aantal} step={0.5} onChange={(e) => zet({ aantal: Number(e.target.value) })} />
        </Veld>
        <Veld label="Opslag %">
          <input type="number" className="input" value={r.opslagPercentage} step={0.5} onChange={(e) => setR({ ...r, opslagPercentage: Number(e.target.value), verkoopprijs: Math.round(r.kostprijs * (1 + Number(e.target.value) / 100) * 100) / 100 })} />
        </Veld>
        <Veld label="Kostprijs per eenheid">
          <input type="number" className="input" value={r.kostprijs} step={0.5} onChange={(e) => zet({ kostprijs: Number(e.target.value) })} />
        </Veld>
        <Veld label="Verkoopprijs per eenheid">
          <input type="number" className="input" value={r.verkoopprijs} step={0.5} onChange={(e) => zet({ verkoopprijs: Number(e.target.value) })} />
        </Veld>
      </div>
      <div className="text-[12.5px] text-ink-3 mt-3 tabular">
        Totaal kost {euro(r.aantal * r.kostprijs)} · verkoop {euro(r.aantal * r.verkoopprijs)}
      </div>
    </Modal>
  )
}

export type { Nacalculatie }
