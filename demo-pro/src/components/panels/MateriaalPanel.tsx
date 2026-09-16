import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../data/StoreContext'
import { datumKort, euro, getal, vandaag } from '../../lib/format'
import type { ID, Materiaalregel } from '../../types'
import { Leeg, Modal, useToast, Veld } from '../ui'

export function MateriaalTabel({ regels, opdrachtId, toonWerkbon = true }: { regels: Materiaalregel[]; opdrachtId?: ID; toonWerkbon?: boolean }) {
  const store = useStore()
  const [nieuw, setNieuw] = useState(false)
  const lijst = [...regels].sort((a, b) => b.datum.localeCompare(a.datum))
  const totKost = lijst.reduce((s, m) => s + m.aantal * m.kostprijs, 0)
  const totVerkoop = lijst.reduce((s, m) => s + m.aantal * m.verkoopprijs, 0)

  // Groepering per artikel voor het overzicht
  const perArtikel = Object.values(
    lijst.reduce<Record<string, { artikel: string; eenheid: string; aantal: number; kost: number; verkoop: number }>>((acc, m) => {
      const k = m.artikelId ?? m.artikel
      acc[k] ??= { artikel: m.artikel, eenheid: m.eenheid, aantal: 0, kost: 0, verkoop: 0 }
      acc[k].aantal += m.aantal
      acc[k].kost += m.aantal * m.kostprijs
      acc[k].verkoop += m.aantal * m.verkoopprijs
      return acc
    }, {}),
  ).sort((a, b) => b.verkoop - a.verkoop)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="text-[12.5px] text-ink-3">
          {lijst.length} regels · kostprijs <span className="font-semibold text-ink tabular">{euro(totKost)}</span> · verkoop <span className="font-semibold text-ink tabular">{euro(totVerkoop)}</span>
        </div>
        {opdrachtId && (
          <button className="btn-ink btn-sm" onClick={() => setNieuw(true)}>
            <Plus size={13} /> Materiaal boeken
          </button>
        )}
      </div>
      {lijst.length === 0 ? (
        <Leeg titel="Geen materiaal" tekst="Materiaal wordt vanaf de werkbon geboekt of hier handmatig toegevoegd." />
      ) : (
        <div className="grid lg:grid-cols-[1fr_340px] gap-4">
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    <th className="th">Datum</th>
                    {toonWerkbon && <th className="th">Werkbon</th>}
                    <th className="th">Artikel</th>
                    <th className="th text-right">Aantal</th>
                    <th className="th text-right">Kostprijs</th>
                    <th className="th text-right">Verkoop</th>
                    <th className="th w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lijst.map((m) => (
                    <tr key={m.id}>
                      <td className="td tabular text-ink-2 whitespace-nowrap">{datumKort(m.datum)}</td>
                      {toonWerkbon && <td className="td text-[12.5px] text-ink-3 whitespace-nowrap">{store.getWerkbon(m.werkbonId)?.nummer ?? '—'}</td>}
                      <td className="td font-medium">{m.artikel}</td>
                      <td className="td text-right tabular whitespace-nowrap">
                        {getal(m.aantal, m.aantal % 1 ? 1 : 0)} {m.eenheid}
                      </td>
                      <td className="td text-right tabular text-ink-2">{euro(m.aantal * m.kostprijs)}</td>
                      <td className="td text-right tabular font-semibold">{euro(m.aantal * m.verkoopprijs)}</td>
                      <td className="td">
                        <button className="w-7 h-7 rounded-[8px] hover:bg-bg-2 flex items-center justify-center cursor-pointer text-ink-3" onClick={() => store.deleteMateriaal(m.id)} aria-label="Verwijderen">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card p-4">
            <div className="label mb-2">Per artikel</div>
            {perArtikel.map((a) => (
              <div key={a.artikel} className="flex items-center justify-between gap-2 py-1.5 border-b border-line last:border-b-0 text-[12.5px]">
                <div className="min-w-0">
                  <div className="truncate font-medium">{a.artikel}</div>
                  <div className="text-ink-3 tabular">
                    {getal(a.aantal, 0)} {a.eenheid}
                  </div>
                </div>
                <div className="tabular font-semibold shrink-0">{euro(a.verkoop)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {opdrachtId && <MateriaalModal open={nieuw} onClose={() => setNieuw(false)} opdrachtId={opdrachtId} />}
    </>
  )
}

export function MateriaalModal({ open, onClose, opdrachtId, werkbonId }: { open: boolean; onClose: () => void; opdrachtId: ID; werkbonId?: ID }) {
  const store = useStore()
  const toast = useToast()
  const artikelen = store.getArtikelen()
  const werkbonnen = store.getWerkbonnen({ opdrachtId })
  const [art, setArt] = useState(artikelen[0]?.id ?? '')
  const [aantal, setAantal] = useState(1)
  const [wb, setWb] = useState(werkbonId ?? werkbonnen.at(-1)?.id ?? '')
  const [vrij, setVrij] = useState(false)
  const [vrijNaam, setVrijNaam] = useState('')
  const [vrijEenheid, setVrijEenheid] = useState('stuk')
  const [vrijKost, setVrijKost] = useState(0)
  const [vrijVerkoop, setVrijVerkoop] = useState(0)
  const a = artikelen.find((x) => x.id === art)

  const opslaan = () => {
    if (!vrij && !a) return
    if (vrij && !vrijNaam.trim()) {
      toast('Vul een artikelnaam in', 'bad')
      return
    }
    store.addMateriaal({
      werkbonId: wb || werkbonId || '',
      opdrachtId,
      artikelId: vrij ? undefined : a!.id,
      artikel: vrij ? vrijNaam.trim() : a!.naam,
      aantal,
      eenheid: vrij ? vrijEenheid : a!.eenheid,
      kostprijs: vrij ? vrijKost : a!.kostprijs,
      verkoopprijs: vrij ? vrijVerkoop : a!.verkoopprijs,
      datum: store.getWerkbon(wb)?.datum ?? vandaag(),
    })
    toast('Materiaal geboekt', 'good')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      titel="Materiaal boeken"
      footer={
        <>
          <button className="btn-outline btn-sm" onClick={onClose}>
            Annuleren
          </button>
          <button className="btn-ink btn-sm" onClick={opslaan}>
            <Plus size={14} /> Boeken
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="flex gap-1.5 text-[12.5px]">
          <button className={`px-3 py-1.5 rounded-full border cursor-pointer font-semibold ${!vrij ? 'bg-ink text-white border-ink' : 'border-line'}`} onClick={() => setVrij(false)}>
            Uit artikelbestand
          </button>
          <button className={`px-3 py-1.5 rounded-full border cursor-pointer font-semibold ${vrij ? 'bg-ink text-white border-ink' : 'border-line'}`} onClick={() => setVrij(true)}>
            Vrije regel
          </button>
        </div>
        {!vrij ? (
          <Veld label="Artikel">
            <select className="input" value={art} onChange={(e) => setArt(e.target.value)}>
              {artikelen.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.code} – {x.naam} ({euro(x.verkoopprijs)}/{x.eenheid})
                </option>
              ))}
            </select>
          </Veld>
        ) : (
          <>
            <Veld label="Omschrijving">
              <input className="input" value={vrijNaam} onChange={(e) => setVrijNaam(e.target.value)} />
            </Veld>
            <div className="grid grid-cols-3 gap-3">
              <Veld label="Eenheid">
                <input className="input" value={vrijEenheid} onChange={(e) => setVrijEenheid(e.target.value)} />
              </Veld>
              <Veld label="Kostprijs">
                <input type="number" className="input" value={vrijKost} onChange={(e) => setVrijKost(Number(e.target.value))} />
              </Veld>
              <Veld label="Verkoopprijs">
                <input type="number" className="input" value={vrijVerkoop} onChange={(e) => setVrijVerkoop(Number(e.target.value))} />
              </Veld>
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Veld label={`Aantal${a && !vrij ? ` (${a.eenheid})` : ''}`}>
            <input type="number" className="input" value={aantal} min={0.5} step={0.5} onChange={(e) => setAantal(Number(e.target.value))} />
          </Veld>
          {!werkbonId && (
            <Veld label="Werkbon">
              <select className="input" value={wb} onChange={(e) => setWb(e.target.value)}>
                {werkbonnen.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nummer} – {datumKort(w.datum)}
                  </option>
                ))}
              </select>
            </Veld>
          )}
        </div>
        {a && !vrij && (
          <div className="text-[12.5px] text-ink-3 tabular">
            Kostprijs {euro(a.kostprijs * aantal)} · verkoop {euro(a.verkoopprijs * aantal)} · btw {a.btwPercentage}%
          </div>
        )}
      </div>
    </Modal>
  )
}
