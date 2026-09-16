import type { DataStore } from '../data/store'
import type { ErpPakket, ID, Koppeling, SyncActie } from '../types'
import { getAdapter } from './adapters'
import type { ErpVerbinding } from './types'

/**
 * Synchronisatielaag: koppelt de store aan een adapter en schrijft de synclog.
 * Alle acties zijn idempotent genoeg voor "Opnieuw proberen".
 */

function verbinding(k: Koppeling): ErpVerbinding {
  return { pakket: k.pakket, administratie: k.administratie ?? '', instellingen: k.instellingen }
}

export function actievePakketten(store: DataStore): ErpPakket[] {
  return store
    .getKoppelingen()
    .filter((k) => k.verbonden && k.pakket !== 'generiek')
    .map((k) => k.pakket)
}

/** Het primaire boekhoudpakket (eerste verbonden API-koppeling) */
export function primairPakket(store: DataStore): ErpPakket | undefined {
  return actievePakketten(store)[0]
}

export async function pushFactuur(store: DataStore, pakket: ErpPakket, factuurId: ID): Promise<boolean> {
  const k = store.getKoppeling(pakket)
  const f = store.getFactuur(factuurId)
  if (!f) return false
  const o = store.getOpdracht(f.opdrachtId)!
  const klant = store.getKlant(f.klantId)!
  const log = store.addSyncLog({ pakket, richting: 'naar_erp', object: `Factuur ${f.nummer}`, objectId: f.id, status: 'bezig', melding: 'Verkoopfactuur wordt aangemaakt…', actie: 'pushFactuur' })
  const res = await getAdapter(pakket).pushFactuur(f, o, klant, verbinding(k))
  store.updateSyncLog(log.id, { status: res.ok ? 'ok' : 'fout', melding: res.melding })
  store.setErpStatus(f.id, res.ok ? 'gesynchroniseerd' : 'fout', res.referentie, pakket, res.ok ? undefined : res.melding)
  store.updateKoppeling(pakket, { laatsteSync: new Date().toISOString() })
  return res.ok
}

export async function pushUren(store: DataStore, pakket: ErpPakket): Promise<boolean> {
  const k = store.getKoppeling(pakket)
  const uren = store.getUren().filter((u) => u.goedgekeurd && u.eind)
  const log = store.addSyncLog({ pakket, richting: 'naar_erp', object: 'Goedgekeurde uren', status: 'bezig', melding: 'Uren worden geboekt…', actie: 'pushUren' })
  const res = await getAdapter(pakket).pushUren(uren, verbinding(k))
  store.updateSyncLog(log.id, { status: res.ok ? 'ok' : 'fout', melding: res.melding })
  store.updateKoppeling(pakket, { laatsteSync: new Date().toISOString() })
  return res.ok
}

export async function syncKlanten(store: DataStore, pakket: ErpPakket): Promise<boolean> {
  const k = store.getKoppeling(pakket)
  const log = store.addSyncLog({ pakket, richting: 'van_erp', object: 'Klanten (debiteuren)', status: 'bezig', melding: 'Debiteuren worden opgehaald…', actie: 'syncKlanten' })
  const res = await getAdapter(pakket).syncKlanten(store.getKlanten(), verbinding(k))
  store.updateSyncLog(log.id, { status: res.ok ? 'ok' : 'fout', melding: res.melding })
  store.updateKoppeling(pakket, { laatsteSync: new Date().toISOString() })
  return res.ok
}

export async function syncArtikelen(store: DataStore, pakket: ErpPakket): Promise<boolean> {
  const k = store.getKoppeling(pakket)
  const log = store.addSyncLog({ pakket, richting: 'van_erp', object: 'Artikelen', status: 'bezig', melding: 'Artikelen worden opgehaald…', actie: 'syncArtikelen' })
  const res = await getAdapter(pakket).syncArtikelen(store.getArtikelen(), verbinding(k))
  store.updateSyncLog(log.id, { status: res.ok ? 'ok' : 'fout', melding: res.melding })
  store.updateKoppeling(pakket, { laatsteSync: new Date().toISOString() })
  return res.ok
}

export async function haalBetaalstatus(store: DataStore, pakket: ErpPakket): Promise<number> {
  const k = store.getKoppeling(pakket)
  const log = store.addSyncLog({ pakket, richting: 'van_erp', object: 'Betaalstatus', status: 'bezig', melding: 'Bankafschriften worden gematcht…', actie: 'haalBetaalstatus' })
  const res = await getAdapter(pakket).haalBetaalstatus(store.getFacturen(), verbinding(k))
  let n = 0
  if (res.ok && res.data) {
    for (const u of res.data) {
      const f = store.getFacturen().find((x) => x.nummer === u.factuurNummer)
      if (f && u.betaald && f.status !== 'betaald') {
        store.setFactuurStatus(f.id, 'betaald')
        n++
      }
    }
  }
  store.updateSyncLog(log.id, { status: res.ok ? 'ok' : 'fout', melding: res.ok && n ? `${res.melding}: ${res.data!.map((u) => u.factuurNummer).join(', ')} → betaald` : res.melding })
  store.updateKoppeling(pakket, { laatsteSync: new Date().toISOString() })
  return n
}

export async function opnieuwProberen(store: DataStore, logId: ID): Promise<boolean> {
  const r = store.getSyncLog().find((x) => x.id === logId)
  if (!r || !r.actie) return false
  const acties: Record<SyncActie, () => Promise<boolean | number>> = {
    pushFactuur: () => (r.objectId ? pushFactuur(store, r.pakket, r.objectId) : Promise.resolve(false)),
    pushUren: () => pushUren(store, r.pakket),
    syncKlanten: () => syncKlanten(store, r.pakket),
    syncArtikelen: () => syncArtikelen(store, r.pakket),
    haalBetaalstatus: () => haalBetaalstatus(store, r.pakket),
  }
  const res = await acties[r.actie]()
  const ok = typeof res === 'number' ? true : res
  // Oude foutregel afhandelen zodat de knop verdwijnt
  if (ok) store.updateSyncLog(logId, { actie: undefined, melding: `${r.melding} → opnieuw geprobeerd, geslaagd` })
  return ok
}

/** Automatisch synchroniseren bij "factuur verzonden" (instelling per koppeling) */
export async function bijFactuurVerzonden(store: DataStore, factuurId: ID) {
  for (const pakket of actievePakketten(store)) {
    const k = store.getKoppeling(pakket)
    if (k.instellingen.autoSyncBijVerzonden) await pushFactuur(store, pakket, factuurId)
  }
}
