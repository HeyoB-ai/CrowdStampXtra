import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BeheerLayout, VeldLayout } from './components/Layout'
import { TourProvider } from './components/Tour'
import { ToastProvider } from './components/ui'
import { RolProvider } from './data/RolContext'
import { StoreProvider } from './data/StoreContext'
import Start from './pages/Start'

// Beheer
const Dashboard = lazy(() => import('./pages/beheer/Dashboard'))
const Opdrachten = lazy(() => import('./pages/beheer/Opdrachten'))
const OpdrachtDetail = lazy(() => import('./pages/beheer/OpdrachtDetail'))
const OpdrachtNieuw = lazy(() => import('./pages/beheer/OpdrachtNieuw'))
const OpdrachtImport = lazy(() => import('./pages/beheer/OpdrachtImport'))
const Werkbonnen = lazy(() => import('./pages/beheer/Werkbonnen'))
const Uren = lazy(() => import('./pages/beheer/Uren'))
const Meerwerk = lazy(() => import('./pages/beheer/Meerwerk'))
const Calculatie = lazy(() => import('./pages/beheer/Calculatie'))
const Facturatie = lazy(() => import('./pages/beheer/Facturatie'))
const FactuurDetail = lazy(() => import('./pages/beheer/FactuurDetail'))
const Stamgegevens = lazy(() => import('./pages/beheer/Stamgegevens'))
const Integraties = lazy(() => import('./pages/beheer/Integraties'))
// Veld
const MijnDag = lazy(() => import('./pages/veld/MijnDag'))
const VeldWerkbonnen = lazy(() => import('./pages/veld/VeldWerkbonnen'))
const WerkbonVeld = lazy(() => import('./pages/veld/WerkbonVeld'))
const Mij = lazy(() => import('./pages/veld/Mij'))
// Publiek
const KlantAkkoord = lazy(() => import('./pages/KlantAkkoord'))

function Laden() {
  return (
    <div className="flex items-center justify-center py-20 text-ink-3 text-[13px]">
      <span className="spinner spinner-dark mr-2" /> Laden…
    </div>
  )
}

function S({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Laden />}>{children}</Suspense>
}

export default function App() {
  return (
    <StoreProvider>
      <RolProvider>
        <ToastProvider>
          <BrowserRouter>
            <TourProvider>
              <Routes>
                <Route path="/" element={<Start />} />
                <Route path="/beheer" element={<BeheerLayout />}>
                  <Route index element={<S><Dashboard /></S>} />
                  <Route path="opdrachten" element={<S><Opdrachten /></S>} />
                  <Route path="opdrachten/nieuw" element={<S><OpdrachtNieuw /></S>} />
                  <Route path="opdrachten/import" element={<S><OpdrachtImport /></S>} />
                  <Route path="opdrachten/:id" element={<S><OpdrachtDetail /></S>} />
                  <Route path="werkbonnen" element={<S><Werkbonnen /></S>} />
                  <Route path="uren" element={<S><Uren /></S>} />
                  <Route path="meerwerk" element={<S><Meerwerk /></S>} />
                  <Route path="calculatie" element={<S><Calculatie /></S>} />
                  <Route path="calculatie/:id" element={<S><Calculatie /></S>} />
                  <Route path="facturatie" element={<S><Facturatie /></S>} />
                  <Route path="facturatie/:id" element={<S><FactuurDetail /></S>} />
                  <Route path="stamgegevens" element={<S><Stamgegevens /></S>} />
                  <Route path="integraties" element={<S><Integraties /></S>} />
                </Route>
                <Route path="/veld" element={<VeldLayout />}>
                  <Route index element={<S><MijnDag /></S>} />
                  <Route path="werkbonnen" element={<S><VeldWerkbonnen /></S>} />
                  <Route path="werkbon/:id" element={<S><WerkbonVeld /></S>} />
                  <Route path="mij" element={<S><Mij /></S>} />
                </Route>
                <Route path="/akkoord/:id" element={<S><KlantAkkoord /></S>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </TourProvider>
          </BrowserRouter>
        </ToastProvider>
      </RolProvider>
    </StoreProvider>
  )
}
