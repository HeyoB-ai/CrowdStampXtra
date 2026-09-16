# CrowdStamp Pro – demo

Uitgebreide demo-variant van CrowdStamp voor prospects in de bouw en afbouw. Laat de volledige keten zien:

**Opdracht → Werkbon → Uren & werkzaamheden → Meerwerk → Voor-/nacalculatie → Facturatie → ERP-export**

Alles draait in de browser: geen backend, geen login, geen Supabase-calls. Alle gegevens zijn fictief en worden in `localStorage` van de bezoeker bewaard; met **Demo resetten** (bovenin) komt de seed-data terug. De demo raakt de productie-app (`index.html`, `app.html`, `netlify/functions`, `supabase/`) niet aan en staat volledig in deze map.

---

## Lokaal draaien

```bash
cd demo-pro
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc + vite → dist/
npm run preview    # dist/ lokaal bekijken
npm run lint       # oxlint
```

Stack: React 19 · Vite 8 · TypeScript · Tailwind CSS v4 · react-router · recharts · SheetJS (xlsx) · @dnd-kit · lucide-react.

## Deployen (Netlify, aparte site)

`netlify.toml` in deze map regelt de build (`command = npm run build`, `publish = dist`, SPA-redirect, `noindex`, `Permissions-Policy` voor GPS/camera). Maak in Netlify een **nieuwe site** op dezelfde repo, branch `demo-pro`, en zet **Base directory** op `demo-pro` – Netlify leest dan `demo-pro/netlify.toml` en de productiesite blijft onaangeroerd. Koppel bijvoorbeeld `demo.crowdstamp.nl`.

> De demo vraagt om GPS (check-in) en camera (foto's). Beide werken alleen over https of op localhost; zonder toestemming valt de demo terug op de opdrachtlocatie.

---

## Wat zit erin

### Projectleider / Administratie (desktop)
| Scherm | Wat het doet |
|---|---|
| **Dashboard** | KPI's (lopende opdrachten, open werkbonnen, uren deze week, meerwerk ter akkoord, te factureren), lijst "aandacht nodig", grafiek voor- vs nacalculatie (recharts), vandaag op de bouw, lopende opdrachten |
| **Opdrachten** | Overzicht met zoeken/filters, detail met tabs *Overzicht, Werkbonnen, Uren, Materiaal, Foto's, Meerwerk, Calculatie, Facturatie, Tijdlijn* en de procesbalk Opdracht → … → Facturatie met status per stap |
| **Opdracht inladen** | Handmatig formulier met voorcalculatie **en** import uit CSV/Excel (SheetJS) met automatische kolomherkenning, handmatige toewijzing, preview en groepering per referentie. Voorbeeld: `public/voorbeeld-opdrachten.csv` |
| **Werkbonnen** | Planbord (week × medewerker, drag & drop met @dnd-kit) en lijst; werkbon aanmaken, status, goedkeuren (keurt ook de uren goed) |
| **Uren** | Per week/medewerker/opdracht, afwijkingen (geen check-out, > 10 uur, check-in > 250 m van locatie), bulk goedkeuren, CSV-export |
| **Meerwerk** | Statussen gemeld → ter akkoord → akkoord/afgewezen; deelbare klantakkoord-pagina `/akkoord/:id` met foto's, bedrag en tekenveld; na akkoord automatisch regel in de calculatie en klaar voor facturatie |
| **Calculatie** | Per opdracht begroot vs werkelijk per kostensoort (arbeid, onderaanneming, materiaal, materieel, meerwerk apart), verschil in € en %, budgetverbruik, marge, voortgang en prognose eindresultaat, kleurcodering groen/oranje/rood; voorcalculatie bewerken |
| **Facturatie** | Factuur genereren vanuit opdracht: termijn (voortgang × aanneemsom − eerder gefactureerd), eindafrekening, regie (goedgekeurde uren × verkooptarief + materiaal), meerwerk. A4-voorbeeld, PDF via print-CSS, btw 21 % / 9 % / **verlegd**, statussen concept → verzonden → betaald, ERP-status |
| **Stamgegevens** | Klanten (debiteurnummer), medewerkers met kost- en verkooptarief (eigen/onderaannemer), artikelen (btw per artikel), uursoorten, eigen bedrijf |
| **Integraties** | Kaarten voor Exact Online, AFAS Profit, Twinfield, SnelStart, Generiek (UBL/CSV); nep-OAuth-flow; instellingen (grootboek, dagboek, kostenplaats = opdracht, auto-sync); synchronisatielog met "Opnieuw proberen"; **echte downloads**: UBL 2.1 XML (Peppol BIS Billing 3.0) per factuur en CSV-journaalposten; "Betaalstatus ophalen" zet facturen op betaald |

### Monteur / Uitvoerder (telefoon)
*Mijn dag* (werkbonnen van vandaag met navigatielink) → werkbon openen → GPS-check-in (met fallback) → werkzaamheden afvinken → uren (uursoort) → materiaal → foto's (`capture="environment"`, compressie ≤ 1600 px) → notities → meerwerk melden met foto → klant laten tekenen (canvas) → check-out → afronden. De veldrol ziet alleen eigen werkbonnen; via *Mij* wissel je in de demo van medewerker.

### Rondleiding
Eigen, lichte implementatie (`src/components/Tour.tsx`): 14 stappen langs één voorbeeldopdracht (OPD-2026-009), met route-navigatie, rolwissel en spotlight op `data-tour="…"`-elementen.

---

## Structuur

```
demo-pro/
├─ netlify.toml, vite.config.ts, tsconfig*.json, index.html
├─ public/voorbeeld-opdrachten.csv        voorbeeldbestand voor import
└─ src/
   ├─ types/index.ts                       datamodel (Klant, Opdracht, Werkbon, Urenregel, Meerwerk, Factuur, …)
   ├─ data/
   │  ├─ seed.ts                           realistische NL seed-data, relatief aan "vandaag"
   │  ├─ placeholders.ts                   gegenereerde SVG-foto's per categorie + handtekeningen
   │  ├─ store.ts                          DataStore-interface + LocalStore (memory + localStorage)
   │  ├─ StoreContext.tsx                  React-binding (useStore → re-render bij mutatie)
   │  └─ RolContext.tsx                    rolwisselaar (beheer / veld) + "wie ben ik" in het veld
   ├─ lib/
   │  ├─ format.ts                         € NL-notatie, dd-mm-jjjj, weken, uren
   │  ├─ calculatie.ts                     nacalculatie, prognose, afwijkingen, statuslabels
   │  ├─ factuur.ts                        factuurvoorstellen (termijn/regie/meerwerk/eind), totalen per btw-tarief
   │  ├─ ubl.ts                            UBL 2.1 / Peppol BIS 3.0 XML
   │  ├─ journaal.ts                       CSV-journaalpostexport
   │  ├─ geo.ts                            haversine, GPS met fallback, navigatielink
   │  └─ image.ts                          fotocompressie, bestand downloaden
   ├─ integrations/
   │  ├─ types.ts                          ErpAdapter-interface
   │  ├─ adapters/                         mockBasis + exact, afas, twinfield, snelstart, generiek
   │  └─ sync.ts                           synclaag: store ↔ adapter ↔ synclog, retry, auto-sync
   ├─ components/                          ui.tsx, Layout (demo-balk, rolwisselaar, beheer/veld), ProcesBalk, FotoGrid, Handtekening, Tour
   │  └─ panels/                           herbruikbare panelen (werkbonnen, uren, materiaal, meerwerk, calculatie, facturen, tijdlijn)
   └─ pages/
      ├─ Start.tsx, KlantAkkoord.tsx
      ├─ beheer/                           Dashboard, Opdrachten, OpdrachtDetail, OpdrachtNieuw, OpdrachtImport, Werkbonnen, Uren, Meerwerk, Calculatie, Facturatie, FactuurDetail, Stamgegevens, Integraties
      └─ veld/                             MijnDag, VeldWerkbonnen, WerkbonVeld, Mij
```

---

## Van mock-datalaag naar Supabase

De UI praat uitsluitend met de interface `DataStore` in `src/data/store.ts` (`getOpdrachten`, `createWerkbon`, `checkIn`, `akkoordMeerwerk`, `createFactuur`, …). De huidige implementatie `LocalStore` is de enige plek die weet dat data in het geheugen/`localStorage` staat.

Stappenplan:

1. **Tabellen** – maak per type in `src/types/index.ts` een tabel (snake_case): `klanten`, `medewerkers`, `artikelen`, `opdrachten`, `calculatie_regels`, `werkbonnen`, `checklist_items`, `urenregels`, `materiaalregels`, `fotos`, `meerwerk`, `facturen`, `factuur_regels`, `koppelingen`, `sync_log`, `tijdlijn`. Foto's en handtekeningen gaan naar Storage (bucket `werkbon-fotos`), de tabel bewaart alleen het pad.
2. **RLS** – `organisatie_id` op elke tabel; projectleider/administratie ziet alles van de organisatie, medewerkers alleen werkbonnen waarin hun `medewerker_id` in `toegewezen_aan` staat (zoals model B in de huidige `supabase/migrations/rls_model_b.sql`). De klantakkoord-pagina werkt met een `akkoord_token` op `meerwerk` en een edge function zonder login.
3. **SupabaseStore** – implementeer `class SupabaseStore implements DataStore` met dezelfde methodes; maak ze `async` en pas het `DataStore`-type daarop aan (`Promise<…>`). De UI-componenten lezen dan via een data-hook (React Query/SWR of `useEffect`) in plaats van synchroon. Business-logica die nu in de store zit (meerwerk akkoord → calculatieregel, factuur → meerwerk gefactureerd, werkbon goedkeuren → uren goedkeuren) verhuist naar Postgres-functies/triggers of edge functions, zodat ze ook gelden buiten de UI.
4. **Nummering** – `volgendNummer()` wordt een Postgres-sequence per organisatie en type (`OPD-2026-###`, `WB-####`, `F-2026-###`, `MW-###`).
5. **Berekeningen** – `lib/calculatie.ts`, `lib/factuur.ts`, `lib/ubl.ts` en `lib/journaal.ts` zijn pure functies zonder store-afhankelijkheid (ze krijgen een `DataStore` of losse arrays mee) en kunnen ongewijzigd blijven of naar een edge function verhuizen.
6. **Vervang de singleton** – in `store.ts`: `export const store: DataStore = new SupabaseStore(supabaseClient)`. `resetDemo()` verdwijnt of wordt "demo-organisatie herstellen".

## Een ERP-adapter echt implementeren

De interface staat in `src/integrations/types.ts`:

```ts
interface ErpAdapter {
  verbind(): Promise<ErpResultaat<{ administratie: string }>>
  ontkoppel(): Promise<void>
  syncKlanten(klanten, verbinding): Promise<ErpResultaat<{ aantal; nieuw }>>
  syncArtikelen(artikelen, verbinding): Promise<ErpResultaat<{ aantal }>>
  pushFactuur(factuur, opdracht, klant, verbinding): Promise<ErpResultaat>   // → referentie in het pakket
  pushUren(uren, verbinding): Promise<ErpResultaat<{ aantal; totaalUren }>>
  haalBetaalstatus(facturen, verbinding): Promise<ErpResultaat<BetaalstatusUpdate[]>>
}
```

De mocks in `src/integrations/adapters/` simuleren vertraging en fouten. Een echte adapter (bijv. Exact Online):

1. **Autorisatie** – OAuth2 authorization-code flow via een Netlify/Supabase edge function (client secret nooit in de browser). Bewaar access/refresh-token per organisatie in een tabel `erp_tokens`; `verbind()` opent de autorisatie-URL en de callback-function slaat de tokens op. AFAS gebruikt een app-token, SnelStart een koppelsleutel, Twinfield OAuth2 via Wolters Kluwer.
2. **Uitvoering server-side** – alle `push*`/`sync*`/`haal*` roepen een edge function aan (`/erp/:pakket/:actie`) die met het token de externe API bevraagt. De browser ziet alleen `ErpResultaat`.
3. **Mapping** – `pushFactuur` vertaalt `Factuur` naar het pakketmodel: debiteur op `klant.debiteurnummer`, grootboek/dagboek/btw-code uit `KoppelingInstellingen`, kostenplaats = `opdracht.nummer` als `kostenplaatsIsOpdracht`, btw-code "verlegd" bij `factuur.btwVerlegd`. Bewaar de teruggekregen id in `factuur.erpReferentie`.
4. **Betaalstatus** – `haalBetaalstatus` vraagt openstaande posten op (Exact: `ReceivablesList`, Twinfield: `browse 100`), matcht op `erpReferentie` en levert `BetaalstatusUpdate[]`; `sync.ts` zet de facturen op betaald.
5. **Idempotentie en log** – `sync.ts` schrijft al elke actie naar `sync_log` en biedt *Opnieuw proberen*; houd in de adapter rekening met duplicaten (zoek eerst op `erpReferentie`/factuurnummer voordat je aanmaakt).
6. **Generiek (UBL/CSV)** – `lib/ubl.ts` en `lib/journaal.ts` zijn nu al productie-bruikbaar; voor Peppol-verzending hang je er een access point (bijv. via een Peppol-provider) achter en valideer je de XML met de Peppol BIS 3.0 schematron.

---

## Aannames in de demo

- Overwerk 125 % / 150 % en reistijd worden als factor op kost- én verkooptarief toegepast; reistijd factor 1.
- Termijnfactuur = voortgang% × aanneemsom − eerder gefactureerde termijnen; akkoord meerwerk wordt meegenomen op de eerstvolgende factuur.
- Btw 9 % is een keuze per opdracht (schilder-/stukadoorswerk aan woningen > 2 jaar) en per artikel; btw verlegd (onderaanneming, art. 12 lid 5 Wet OB) is een vlag per opdracht en zet de UBL op categorie AE.
- Voortgang (%) wordt door de projectleider bijgehouden en stuurt zowel de verwachte kosten in de nacalculatie als het termijnbedrag.
- Kosten van meerwerk zitten in de gewerkte uren en het geboekte materiaal; de meerwerkopbrengst telt apart als extra omzet.
- Seed-data schuift mee met de echte datum, zodat "afgelopen drie weken" en "vandaag" altijd kloppen.
- Camerafoto's worden gecomprimeerd tot max. 1600 px; als `localStorage` vol raakt worden alleen de foto-bytes niet bewaard (de rest wel).
