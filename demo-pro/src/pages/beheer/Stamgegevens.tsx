import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Avatar, Badge, Modal, PageHeader, Tabs, useToast, Veld } from '../../components/ui'
import { nieuwId } from '../../data/store'
import { useStore } from '../../data/StoreContext'
import { KLANT_SOORT, UURSOORT_FACTOR, UURSOORT_LABEL } from '../../lib/calculatie'
import { euro, procent } from '../../lib/format'
import type { Artikel, Klant, Medewerker, MedewerkerRol, Uursoort } from '../../types'

type Tab = 'klanten' | 'medewerkers' | 'artikelen' | 'uursoorten' | 'bedrijf'

const KLEUREN = ['#0f0f0f', '#e8410a', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#be185d', '#65a30d', '#dc2626']

export default function Stamgegevens() {
  const store = useStore()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('klanten')
  const [klant, setKlant] = useState<Klant | null>(null)
  const [mw, setMw] = useState<Medewerker | null>(null)
  const [art, setArt] = useState<Artikel | null>(null)
  const bedrijf = store.getState().bedrijf

  const nieuweKlant = (): Klant => ({ id: nieuwId('k'), naam: '', kvk: '', adres: { straat: '', postcode: '', plaats: '' }, contactpersoon: '', email: '', telefoon: '', debiteurnummer: String(11000 + store.getKlanten().length * 7 + 3), soort: 'overig' })
  const nieuweMw = (): Medewerker => ({ id: nieuwId('m'), naam: '', initialen: '', rol: 'monteur', uurtariefKostprijs: 36, uurtariefVerkoop: 60, bedrijf: bedrijf.naam, soort: 'eigen', telefoon: '', email: '', kleur: KLEUREN[store.getMedewerkers().length % KLEUREN.length] })
  const nieuwArt = (): Artikel => ({ id: nieuwId('a'), code: '', naam: '', eenheid: 'stuk', kostprijs: 0, verkoopprijs: 0, btwPercentage: 21, groep: 'materiaal' })

  return (
    <div>
      <PageHeader eyebrow="Stamgegevens" titel="Stamgegevens" sub="Klanten, medewerkers, tarieven, artikelen en uursoorten – centraal beheerd en overal gebruikt (werkbonnen, calculatie, facturatie, ERP)." />
      <div className="mb-4">
        <Tabs
          items={[
            { id: 'klanten', label: 'Klanten', teller: store.getKlanten().length },
            { id: 'medewerkers', label: 'Medewerkers & tarieven', teller: store.getMedewerkers().length },
            { id: 'artikelen', label: 'Artikelen', teller: store.getArtikelen().length },
            { id: 'uursoorten', label: 'Uursoorten' },
            { id: 'bedrijf', label: 'Eigen bedrijf' },
          ]}
          actief={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'klanten' && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex justify-between items-center">
            <span className="text-[12.5px] text-ink-3">Debiteurnummer = koppelsleutel naar het boekhoudpakket.</span>
            <button className="btn-ink btn-sm" onClick={() => setKlant(nieuweKlant())}>
              <Plus size={13} /> Klant
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr>
                  <th className="th">Naam</th>
                  <th className="th">Soort</th>
                  <th className="th">Contactpersoon</th>
                  <th className="th">Plaats</th>
                  <th className="th">KvK</th>
                  <th className="th">Debiteurnr.</th>
                  <th className="th text-right">Opdrachten</th>
                  <th className="th w-10"></th>
                </tr>
              </thead>
              <tbody>
                {store.getKlanten().map((k) => (
                  <tr key={k.id} className="hover:bg-accent/[0.03]">
                    <td className="td font-medium">{k.naam}</td>
                    <td className="td">
                      <Badge label={KLANT_SOORT[k.soort]} kleur="bg-bg-2 text-ink-2" />
                    </td>
                    <td className="td text-ink-2">
                      {k.contactpersoon}
                      <div className="text-[11.5px] text-ink-3">{k.email}</div>
                    </td>
                    <td className="td text-ink-2">{k.adres.plaats}</td>
                    <td className="td tabular text-ink-2">{k.kvk || '—'}</td>
                    <td className="td tabular font-semibold">{k.debiteurnummer}</td>
                    <td className="td text-right tabular">{store.getOpdrachten().filter((o) => o.klantId === k.id).length}</td>
                    <td className="td">
                      <button className="w-7 h-7 rounded-[8px] hover:bg-bg-2 flex items-center justify-center cursor-pointer text-ink-3" onClick={() => setKlant({ ...k, adres: { ...k.adres } })}>
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'medewerkers' && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex justify-between items-center">
            <span className="text-[12.5px] text-ink-3">Kostprijs voor de nacalculatie, verkooptarief voor regie- en meerwerkfacturen.</span>
            <button className="btn-ink btn-sm" onClick={() => setMw(nieuweMw())}>
              <Plus size={13} /> Medewerker
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr>
                  <th className="th">Naam</th>
                  <th className="th">Rol</th>
                  <th className="th">Bedrijf</th>
                  <th className="th text-right">Kostprijs/u</th>
                  <th className="th text-right">Verkoop/u</th>
                  <th className="th text-right">Marge</th>
                  <th className="th">Contact</th>
                  <th className="th w-10"></th>
                </tr>
              </thead>
              <tbody>
                {store.getMedewerkers().map((m) => (
                  <tr key={m.id} className="hover:bg-accent/[0.03]">
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <Avatar mw={m} size={26} /> <span className="font-medium">{m.naam}</span>
                      </div>
                    </td>
                    <td className="td text-ink-2 capitalize">{m.rol}</td>
                    <td className="td">
                      <span className="text-ink-2">{m.bedrijf}</span>
                      {m.soort === 'onderaannemer' && <Badge label="Onderaannemer" kleur="bg-cyan-50 text-cyan-700" className="ml-1.5" />}
                    </td>
                    <td className="td text-right tabular">{euro(m.uurtariefKostprijs)}</td>
                    <td className="td text-right tabular font-semibold">{euro(m.uurtariefVerkoop)}</td>
                    <td className="td text-right tabular text-ink-3">{procent(((m.uurtariefVerkoop - m.uurtariefKostprijs) / m.uurtariefVerkoop) * 100)}</td>
                    <td className="td text-[12px] text-ink-3">
                      {m.telefoon}
                      <div>{m.email}</div>
                    </td>
                    <td className="td">
                      <button className="w-7 h-7 rounded-[8px] hover:bg-bg-2 flex items-center justify-center cursor-pointer text-ink-3" onClick={() => setMw({ ...m })}>
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'artikelen' && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex justify-between items-center">
            <span className="text-[12.5px] text-ink-3">Gebruikt bij materiaal boeken op de werkbon; btw-percentage per artikel (9% voor verf bij woningen &gt; 2 jaar).</span>
            <button className="btn-ink btn-sm" onClick={() => setArt(nieuwArt())}>
              <Plus size={13} /> Artikel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  <th className="th">Code</th>
                  <th className="th">Artikel</th>
                  <th className="th">Groep</th>
                  <th className="th">Eenheid</th>
                  <th className="th text-right">Kostprijs</th>
                  <th className="th text-right">Verkoop</th>
                  <th className="th text-right">Btw</th>
                  <th className="th w-16"></th>
                </tr>
              </thead>
              <tbody>
                {store.getArtikelen().map((a) => (
                  <tr key={a.id} className="hover:bg-accent/[0.03]">
                    <td className="td tabular text-[12.5px] text-ink-3">{a.code}</td>
                    <td className="td font-medium">{a.naam}</td>
                    <td className="td capitalize text-ink-2">{a.groep}</td>
                    <td className="td text-ink-2">{a.eenheid}</td>
                    <td className="td text-right tabular">{euro(a.kostprijs)}</td>
                    <td className="td text-right tabular font-semibold">{euro(a.verkoopprijs)}</td>
                    <td className="td text-right tabular">{a.btwPercentage}%</td>
                    <td className="td">
                      <div className="flex justify-end gap-0.5">
                        <button className="w-7 h-7 rounded-[8px] hover:bg-bg-2 flex items-center justify-center cursor-pointer text-ink-3" onClick={() => setArt({ ...a })}>
                          <Pencil size={13} />
                        </button>
                        <button className="w-7 h-7 rounded-[8px] hover:bg-bg-2 flex items-center justify-center cursor-pointer text-ink-3" onClick={() => { store.deleteArtikel(a.id); toast('Artikel verwijderd') }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'uursoorten' && (
        <div className="card overflow-hidden max-w-2xl">
          <div className="px-4 py-3 border-b border-line text-[12.5px] text-ink-3">Toeslagfactor wordt toegepast op kost- én verkooptarief in de nacalculatie en op regiefacturen.</div>
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Code</th>
                <th className="th">Naam</th>
                <th className="th text-right">Factor</th>
                <th className="th">Toelichting</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(UURSOORT_LABEL) as Uursoort[]).map((u) => (
                <tr key={u}>
                  <td className="td tabular text-ink-3 text-[12.5px]">{u}</td>
                  <td className="td font-medium">{UURSOORT_LABEL[u]}</td>
                  <td className="td text-right tabular font-semibold">× {UURSOORT_FACTOR[u].toFixed(2).replace('.', ',')}</td>
                  <td className="td text-[12.5px] text-ink-3">{{ normaal: 'Reguliere werkuren', overwerk125: 'Avond / eerste 2 uur overwerk', overwerk150: 'Zaterdag en > 2 uur overwerk', reistijd: 'Reistijd woon-werk buiten 30 km, geen toeslag' }[u]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bedrijf' && (
        <div className="card p-5 max-w-2xl grid grid-cols-2 gap-3 text-[13.5px]">
          {Object.entries({ Naam: bedrijf.naam, Adres: `${bedrijf.adres.straat}, ${bedrijf.adres.postcode} ${bedrijf.adres.plaats}`, KvK: bedrijf.kvk, 'Btw-nummer': bedrijf.btw, IBAN: bedrijf.iban, 'E-mail': bedrijf.email, Telefoon: bedrijf.telefoon, Website: bedrijf.website }).map(([k, v]) => (
            <div key={k}>
              <div className="label">{k}</div>
              <div className="font-medium">{v}</div>
            </div>
          ))}
          <div className="col-span-2 text-[12px] text-ink-4 pt-2">Deze gegevens staan op de factuur en in de UBL-export (leverancier).</div>
        </div>
      )}

      {klant && (
        <Modal
          open
          onClose={() => setKlant(null)}
          titel={klant.naam ? `Klant: ${klant.naam}` : 'Nieuwe klant'}
          footer={
            <>
              <button className="btn-outline btn-sm" onClick={() => setKlant(null)}>
                Annuleren
              </button>
              <button className="btn-ink btn-sm" disabled={!klant.naam.trim()} onClick={() => { store.saveKlant(klant); setKlant(null); toast('Klant opgeslagen', 'good') }}>
                Opslaan
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Veld label="Naam" className="col-span-2">
              <input className="input" value={klant.naam} onChange={(e) => setKlant({ ...klant, naam: e.target.value })} autoFocus />
            </Veld>
            <Veld label="Soort">
              <select className="input" value={klant.soort} onChange={(e) => setKlant({ ...klant, soort: e.target.value as Klant['soort'] })}>
                {Object.entries(KLANT_SOORT).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Veld>
            <Veld label="Debiteurnummer (ERP)">
              <input className="input" value={klant.debiteurnummer} onChange={(e) => setKlant({ ...klant, debiteurnummer: e.target.value })} />
            </Veld>
            <Veld label="KvK">
              <input className="input" value={klant.kvk} onChange={(e) => setKlant({ ...klant, kvk: e.target.value })} />
            </Veld>
            <Veld label="Contactpersoon">
              <input className="input" value={klant.contactpersoon} onChange={(e) => setKlant({ ...klant, contactpersoon: e.target.value })} />
            </Veld>
            <Veld label="E-mail">
              <input className="input" value={klant.email} onChange={(e) => setKlant({ ...klant, email: e.target.value })} />
            </Veld>
            <Veld label="Telefoon">
              <input className="input" value={klant.telefoon ?? ''} onChange={(e) => setKlant({ ...klant, telefoon: e.target.value })} />
            </Veld>
            <Veld label="Straat" className="col-span-2">
              <input className="input" value={klant.adres.straat} onChange={(e) => setKlant({ ...klant, adres: { ...klant.adres, straat: e.target.value } })} />
            </Veld>
            <Veld label="Postcode">
              <input className="input" value={klant.adres.postcode} onChange={(e) => setKlant({ ...klant, adres: { ...klant.adres, postcode: e.target.value } })} />
            </Veld>
            <Veld label="Plaats">
              <input className="input" value={klant.adres.plaats} onChange={(e) => setKlant({ ...klant, adres: { ...klant.adres, plaats: e.target.value } })} />
            </Veld>
          </div>
        </Modal>
      )}

      {mw && (
        <Modal
          open
          onClose={() => setMw(null)}
          titel={mw.naam ? mw.naam : 'Nieuwe medewerker'}
          footer={
            <>
              <button className="btn-outline btn-sm" onClick={() => setMw(null)}>
                Annuleren
              </button>
              <button
                className="btn-ink btn-sm"
                disabled={!mw.naam.trim()}
                onClick={() => {
                  const delen = mw.naam.trim().split(' ')
                  store.saveMedewerker({ ...mw, initialen: (delen[0][0] + (delen.at(-1)?.[0] ?? '')).toUpperCase() })
                  setMw(null)
                  toast('Medewerker opgeslagen', 'good')
                }}
              >
                Opslaan
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Veld label="Naam" className="col-span-2">
              <input className="input" value={mw.naam} onChange={(e) => setMw({ ...mw, naam: e.target.value })} autoFocus />
            </Veld>
            <Veld label="Rol">
              <select className="input" value={mw.rol} onChange={(e) => setMw({ ...mw, rol: e.target.value as MedewerkerRol })}>
                {['projectleider', 'uitvoerder', 'monteur', 'timmerman', 'schilder', 'stukadoor', 'tegelzetter', 'administratie'].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Veld>
            <Veld label="Dienstverband">
              <select className="input" value={mw.soort} onChange={(e) => setMw({ ...mw, soort: e.target.value as Medewerker['soort'], bedrijf: e.target.value === 'eigen' ? bedrijf.naam : mw.bedrijf === bedrijf.naam ? '' : mw.bedrijf })}>
                <option value="eigen">Eigen personeel</option>
                <option value="onderaannemer">Onderaannemer</option>
              </select>
            </Veld>
            {mw.soort === 'onderaannemer' && (
              <Veld label="Bedrijf onderaannemer" className="col-span-2">
                <input className="input" value={mw.bedrijf} onChange={(e) => setMw({ ...mw, bedrijf: e.target.value })} />
              </Veld>
            )}
            <Veld label="Kostprijs per uur">
              <input type="number" className="input" value={mw.uurtariefKostprijs} onChange={(e) => setMw({ ...mw, uurtariefKostprijs: Number(e.target.value) })} />
            </Veld>
            <Veld label="Verkooptarief per uur">
              <input type="number" className="input" value={mw.uurtariefVerkoop} onChange={(e) => setMw({ ...mw, uurtariefVerkoop: Number(e.target.value) })} />
            </Veld>
            <Veld label="Telefoon">
              <input className="input" value={mw.telefoon} onChange={(e) => setMw({ ...mw, telefoon: e.target.value })} />
            </Veld>
            <Veld label="E-mail">
              <input className="input" value={mw.email} onChange={(e) => setMw({ ...mw, email: e.target.value })} />
            </Veld>
            <div className="col-span-2">
              <span className="label">Kleur (planbord)</span>
              <div className="flex gap-1.5">
                {KLEUREN.map((c) => (
                  <button key={c} onClick={() => setMw({ ...mw, kleur: c })} className={`w-7 h-7 rounded-full cursor-pointer ${mw.kleur === c ? 'ring-2 ring-offset-2 ring-ink' : ''}`} style={{ background: c }} aria-label={c} />
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {art && (
        <Modal
          open
          onClose={() => setArt(null)}
          titel={art.naam ? art.naam : 'Nieuw artikel'}
          footer={
            <>
              <button className="btn-outline btn-sm" onClick={() => setArt(null)}>
                Annuleren
              </button>
              <button className="btn-ink btn-sm" disabled={!art.naam.trim()} onClick={() => { store.saveArtikel(art); setArt(null); toast('Artikel opgeslagen', 'good') }}>
                Opslaan
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Veld label="Code">
              <input className="input" value={art.code} onChange={(e) => setArt({ ...art, code: e.target.value })} />
            </Veld>
            <Veld label="Groep">
              <select className="input" value={art.groep} onChange={(e) => setArt({ ...art, groep: e.target.value as Artikel['groep'] })}>
                <option value="materiaal">Materiaal</option>
                <option value="materieel">Materieel (huur/afvoer)</option>
              </select>
            </Veld>
            <Veld label="Naam" className="col-span-2">
              <input className="input" value={art.naam} onChange={(e) => setArt({ ...art, naam: e.target.value })} autoFocus />
            </Veld>
            <Veld label="Eenheid">
              <input className="input" value={art.eenheid} onChange={(e) => setArt({ ...art, eenheid: e.target.value })} />
            </Veld>
            <Veld label="Btw">
              <select className="input" value={art.btwPercentage} onChange={(e) => setArt({ ...art, btwPercentage: Number(e.target.value) as 21 | 9 })}>
                <option value={21}>21%</option>
                <option value={9}>9%</option>
              </select>
            </Veld>
            <Veld label="Kostprijs">
              <input type="number" step={0.01} className="input" value={art.kostprijs} onChange={(e) => setArt({ ...art, kostprijs: Number(e.target.value) })} />
            </Veld>
            <Veld label="Verkoopprijs">
              <input type="number" step={0.01} className="input" value={art.verkoopprijs} onChange={(e) => setArt({ ...art, verkoopprijs: Number(e.target.value) })} />
            </Veld>
          </div>
        </Modal>
      )}
    </div>
  )
}
