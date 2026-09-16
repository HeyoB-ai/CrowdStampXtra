import type { ErpPakket } from '../../types'
import type { ErpAdapter } from '../types'
import { afasAdapter } from './afas'
import { exactAdapter } from './exact'
import { generiekAdapter } from './generiek'
import { snelstartAdapter } from './snelstart'
import { twinfieldAdapter } from './twinfield'

const ADAPTERS: Record<ErpPakket, ErpAdapter> = {
  exact: exactAdapter,
  afas: afasAdapter,
  twinfield: twinfieldAdapter,
  snelstart: snelstartAdapter,
  generiek: generiekAdapter,
}

export function getAdapter(pakket: ErpPakket): ErpAdapter {
  return ADAPTERS[pakket]
}

export const ALLE_PAKKETTEN: ErpPakket[] = ['exact', 'afas', 'twinfield', 'snelstart', 'generiek']
