import type { FotoCategorie } from '../types'

/**
 * Gegenereerde SVG-"foto's" per categorie. Geen externe afbeeldingen.
 * Elk plaatje heeft een eigen kleurstelling, een eenvoudige bouw-scène en een label,
 * zodat je in de demo direct ziet om welke categorie het gaat.
 */

const KLEUREN: Record<FotoCategorie, { bg: string; bg2: string; accent: string; label: string }> = {
  voor: { bg: '#d9d4c7', bg2: '#bfb9a8', accent: '#6b6b6b', label: 'VOOR' },
  tijdens: { bg: '#e6dcc8', bg2: '#c9b48c', accent: '#e8410a', label: 'TIJDENS' },
  na: { bg: '#dfe7dc', bg2: '#b8ccb2', accent: '#16a34a', label: 'NA' },
  schade: { bg: '#e9d5d0', bg2: '#d1a59a', accent: '#dc2626', label: 'SCHADE' },
  meerwerk: { bg: '#e3ddf0', bg2: '#c2b6dd', accent: '#7c3aed', label: 'MEERWERK' },
}

const SCENES: Record<string, (a: string) => string> = {
  // Wand met deurkozijn
  wand: (a) => `
    <rect x="0" y="0" width="800" height="600" fill="url(#g)"/>
    <rect x="0" y="420" width="800" height="180" fill="rgba(0,0,0,0.12)"/>
    <rect x="120" y="140" width="220" height="280" rx="4" fill="rgba(255,255,255,0.35)" stroke="rgba(0,0,0,0.2)" stroke-width="6"/>
    <rect x="470" y="190" width="200" height="150" rx="4" fill="rgba(180,210,230,0.5)" stroke="rgba(0,0,0,0.25)" stroke-width="6"/>
    <line x1="570" y1="190" x2="570" y2="340" stroke="rgba(0,0,0,0.25)" stroke-width="5"/>
    <line x1="470" y1="265" x2="670" y2="265" stroke="rgba(0,0,0,0.25)" stroke-width="5"/>
    <circle cx="310" cy="290" r="8" fill="${a}"/>`,
  // Badkamer / tegels
  tegels: (a) => `
    <rect x="0" y="0" width="800" height="600" fill="url(#g)"/>
    ${Array.from({ length: 6 }, (_, r) =>
      Array.from({ length: 8 }, (_, c) => `<rect x="${c * 100 + 4}" y="${r * 100 + 4}" width="92" height="92" fill="rgba(255,255,255,${0.25 + ((r + c) % 2) * 0.12})" stroke="rgba(0,0,0,0.12)" stroke-width="2"/>`).join(''),
    ).join('')}
    <rect x="520" y="330" width="180" height="120" rx="14" fill="rgba(255,255,255,0.7)" stroke="rgba(0,0,0,0.2)" stroke-width="4"/>
    <circle cx="610" cy="360" r="10" fill="${a}"/>`,
  // Steiger / gevel
  gevel: (a) => `
    <rect x="0" y="0" width="800" height="600" fill="url(#g)"/>
    <rect x="80" y="80" width="640" height="420" fill="rgba(200,120,90,0.35)"/>
    ${[0, 1, 2, 3].map((i) => `<line x1="80" y1="${160 + i * 90}" x2="720" y2="${160 + i * 90}" stroke="rgba(0,0,0,0.35)" stroke-width="6"/>`).join('')}
    ${[0, 1, 2, 3, 4].map((i) => `<line x1="${120 + i * 140}" y1="80" x2="${120 + i * 140}" y2="500" stroke="rgba(0,0,0,0.35)" stroke-width="6"/>`).join('')}
    <rect x="0" y="500" width="800" height="100" fill="rgba(0,0,0,0.18)"/>
    <rect x="300" y="200" width="60" height="100" fill="rgba(180,210,230,0.5)" stroke="rgba(0,0,0,0.3)" stroke-width="3"/>
    <rect x="440" y="200" width="60" height="100" fill="rgba(180,210,230,0.5)" stroke="rgba(0,0,0,0.3)" stroke-width="3"/>
    <circle cx="200" cy="400" r="9" fill="${a}"/>`,
  // Vloer / dakwerk
  vloer: (a) => `
    <rect x="0" y="0" width="800" height="600" fill="url(#g)"/>
    ${Array.from({ length: 10 }, (_, i) => `<polygon points="${i * 80},600 ${i * 80 + 80},600 ${400 + (i - 5) * 30 + 30},200 ${400 + (i - 5) * 30},200" fill="rgba(120,80,40,${0.15 + (i % 2) * 0.1})" stroke="rgba(0,0,0,0.2)" stroke-width="2"/>`).join('')}
    <rect x="0" y="0" width="800" height="200" fill="rgba(255,255,255,0.25)"/>
    <rect x="560" y="420" width="120" height="70" rx="6" fill="rgba(60,60,60,0.5)"/>
    <circle cx="300" cy="450" r="9" fill="${a}"/>`,
  // Leidingwerk / cv
  leidingen: (a) => `
    <rect x="0" y="0" width="800" height="600" fill="url(#g)"/>
    <rect x="0" y="0" width="800" height="600" fill="rgba(255,255,255,0.15)"/>
    <path d="M60 120 H400 V300 H700" fill="none" stroke="rgba(200,120,60,0.8)" stroke-width="22" stroke-linecap="round"/>
    <path d="M60 200 H300 V420 H740" fill="none" stroke="rgba(200,120,60,0.8)" stroke-width="22" stroke-linecap="round"/>
    <rect x="520" y="60" width="200" height="140" rx="10" fill="rgba(255,255,255,0.7)" stroke="rgba(0,0,0,0.2)" stroke-width="4"/>
    <circle cx="620" cy="130" r="30" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="6"/>
    <circle cx="400" cy="300" r="12" fill="${a}"/>`,
}

const SCENE_KEYS = Object.keys(SCENES)

export interface PlaceholderOpties {
  categorie: FotoCategorie
  scene?: keyof typeof SCENES | string
  tekst?: string
  tijd?: string
  seed?: number
}

export function fotoPlaceholder(o: PlaceholderOpties): string {
  const k = KLEUREN[o.categorie]
  const sceneKey = o.scene && SCENES[o.scene] ? o.scene : SCENE_KEYS[(o.seed ?? 0) % SCENE_KEYS.length]
  const scene = SCENES[sceneKey](k.accent)
  const tekst = escapeXml(o.tekst ?? '')
  const tijd = escapeXml(o.tijd ?? '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${k.bg}"/>
      <stop offset="1" stop-color="${k.bg2}"/>
    </linearGradient>
  </defs>
  ${scene}
  <rect x="24" y="24" width="${k.label.length * 17 + 34}" height="40" rx="8" fill="${k.accent}"/>
  <text x="41" y="52" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700" fill="white" letter-spacing="1">${k.label}</text>
  ${tekst ? `<rect x="0" y="536" width="800" height="64" fill="rgba(0,0,0,0.45)"/><text x="24" y="576" font-family="Inter, Arial, sans-serif" font-size="22" fill="white">${tekst}</text>` : ''}
  ${tijd ? `<text x="776" y="576" text-anchor="end" font-family="Inter Tight, Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.9)">${tijd}</text>` : ''}
</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Handtekening als SVG-krabbel (voor seed-data) */
export function handtekeningPlaceholder(naam: string): string {
  const seed = naam.length
  const pad = (i: number) => 40 + i * 45 + ((seed * (i + 3)) % 17)
  const d = Array.from({ length: 7 }, (_, i) => {
    const x = pad(i)
    const y = 70 + Math.sin(i * 1.7 + seed) * 28
    const cx = x + 20
    const cy = 70 + Math.cos(i * 2.3 + seed) * 40
    return i === 0 ? `M${x} ${y}` : `Q${cx} ${cy} ${x} ${y}`
  }).join(' ')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 140" width="400" height="140"><path d="${d}" fill="none" stroke="#0f0f0f" stroke-width="2.6" stroke-linecap="round"/><line x1="30" y1="120" x2="370" y2="120" stroke="rgba(0,0,0,0.15)"/></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
