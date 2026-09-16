import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'
import { store, type DataStore } from './store'

const StoreContext = createContext<DataStore>(store)

export function StoreProvider({ children }: { children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

/**
 * Geeft de store terug én abonneert de component op wijzigingen.
 * Elke mutatie in de store levert een nieuwe state-referentie op, waardoor
 * de component opnieuw rendert en verse data via store.getX() leest.
 */
export function useStore(): DataStore {
  const s = useContext(StoreContext)
  useSyncExternalStore(
    (l) => s.subscribe(l),
    () => s.getState(),
    () => s.getState(),
  )
  return s
}
