import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ID, Rol } from '../types'
import { VELD_STANDAARD_MEDEWERKER } from './seed'

interface RolState {
  rol: Rol
  /** Welke medewerker "ik" ben in de veldrol (demo, geen echte auth) */
  veldMedewerkerId: ID
  setRol: (r: Rol) => void
  setVeldMedewerker: (id: ID) => void
}

const KEY = 'crowdstamp-pro-demo-rol'

const RolCtx = createContext<RolState>({ rol: 'beheer', veldMedewerkerId: VELD_STANDAARD_MEDEWERKER, setRol: () => {}, setVeldMedewerker: () => {} })

function lees(): { rol: Rol; veldMedewerkerId: ID } {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* negeren */
  }
  return { rol: 'beheer', veldMedewerkerId: VELD_STANDAARD_MEDEWERKER }
}

export function RolProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState(lees)
  const bewaar = useCallback((n: { rol: Rol; veldMedewerkerId: ID }) => {
    setS(n)
    try {
      localStorage.setItem(KEY, JSON.stringify(n))
    } catch {
      /* negeren */
    }
  }, [])
  const value = useMemo<RolState>(
    () => ({
      rol: s.rol,
      veldMedewerkerId: s.veldMedewerkerId,
      setRol: (rol) => bewaar({ ...s, rol }),
      setVeldMedewerker: (veldMedewerkerId) => bewaar({ ...s, veldMedewerkerId }),
    }),
    [s, bewaar],
  )
  return <RolCtx.Provider value={value}>{children}</RolCtx.Provider>
}

export function useRol() {
  return useContext(RolCtx)
}
