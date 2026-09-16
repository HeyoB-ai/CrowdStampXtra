import type { GpsPunt, Locatie } from '../types'

/** Afstand in meters tussen twee coördinaten (haversine) */
export function afstandMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(s)))
}

export function afstandLabel(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`
}

/**
 * GPS ophalen met retry tot ≤30 m nauwkeurigheid (zelfde aanpak als app.html).
 * Weigert de browser of duurt het te lang, dan vallen we terug op de opdrachtlocatie
 * met een kleine afwijking, zodat de demo altijd doorloopt.
 */
export async function haalGps(fallback: Locatie): Promise<{ punt: GpsPunt; bron: 'gps' | 'fallback' }> {
  const nu = new Date().toISOString()
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { punt: fallbackPunt(fallback, nu), bron: 'fallback' }
  }
  try {
    const p = await new Promise<GeolocationPosition>((res, rej) => {
      let best: GeolocationPosition | null = null
      let attempts = 0
      const tryOnce = () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            attempts++
            if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos
            if (best.coords.accuracy <= 30 || attempts >= 2) res(best)
            else setTimeout(tryOnce, 1200)
          },
          (e) => rej(e),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
        )
      }
      tryOnce()
    })
    return {
      punt: { lat: p.coords.latitude, lng: p.coords.longitude, nauwkeurigheid: Math.round(p.coords.accuracy), tijd: nu },
      bron: 'gps',
    }
  } catch {
    return { punt: fallbackPunt(fallback, nu), bron: 'fallback' }
  }
}

function fallbackPunt(loc: Locatie, tijd: string): GpsPunt {
  // ±40 m jitter zodat het er realistisch uitziet
  const j = () => (Math.random() - 0.5) * 0.0007
  return { lat: loc.lat + j(), lng: loc.lng + j(), nauwkeurigheid: 18 + Math.round(Math.random() * 20), tijd }
}

export function navigatieUrl(loc: Locatie): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${loc.straat}, ${loc.postcode} ${loc.plaats}`)}`
}

/** Coördinaten van veelvoorkomende plaatsen in Midden-Nederland als fallback voor de demo */
const PLAATSEN: Record<string, [number, number]> = {
  woerden: [52.0855, 4.8833],
  utrecht: [52.0907, 5.1214],
  nieuwegein: [52.0296, 5.0851],
  houten: [52.0279, 5.1663],
  ijsselstein: [52.0203, 5.0431],
  montfoort: [52.0453, 4.9505],
  harmelen: [52.0917, 4.9615],
  amersfoort: [52.1561, 5.3878],
  zeist: [52.09, 5.2333],
  maarssen: [52.1383, 5.0394],
  vianen: [51.9911, 5.0931],
  culemborg: [51.955, 5.2276],
  leerdam: [51.8933, 5.0917],
  gouda: [52.0115, 4.7105],
  bodegraven: [52.0821, 4.7477],
}
export function coordsVoorPlaats(plaats: string): { lat: number; lng: number } {
  const k = plaats.toLowerCase().trim()
  const hit = Object.keys(PLAATSEN).find((p) => k.includes(p))
  const [lat, lng] = hit ? PLAATSEN[hit] : PLAATSEN.utrecht
  return { lat: lat + (Math.random() - 0.5) * 0.01, lng: lng + (Math.random() - 0.5) * 0.01 }
}

