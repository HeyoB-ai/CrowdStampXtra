/** Formattering in Nederlandse notatie */

const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
const num = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 })
const num0 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 })

/** € 1.234,56 */
export function euro(bedrag: number): string {
  // Intl geeft "€ 1.234,56" met een non-breaking space; dat is precies de NL-notatie.
  return eur.format(Math.round(bedrag * 100) / 100)
}

/** € 1.234 (zonder centen) – voor KPI's */
export function euroKort(bedrag: number): string {
  return '€ ' + num0.format(Math.round(bedrag))
}

export function getal(n: number, decimalen = 2): string {
  return new Intl.NumberFormat('nl-NL', { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen }).format(n)
}

export function getalKort(n: number): string {
  return num.format(n)
}

export function procent(n: number, decimalen = 0): string {
  return getal(n, decimalen) + '%'
}

/** yyyy-mm-dd of ISO → dd-mm-jjjj */
export function datum(iso: string | Date | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? parseDatum(iso) : iso
  if (!d || isNaN(d.getTime())) return '—'
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}

/** dd-mm-jjjj HH:mm */
export function datumTijd(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return `${datum(d)} ${tijd(iso)}`
}

export function tijd(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "ma 16 sep" */
export function datumKort(iso: string): string {
  const d = parseDatum(iso)
  if (!d) return '—'
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** "maandag 16 september 2026" */
export function datumLang(iso: string): string {
  const d = parseDatum(iso)
  if (!d) return '—'
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** yyyy-mm-dd string (lokale tijd) */
export function isoDatum(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDatum(iso: string): Date | null {
  if (!iso) return null
  // yyyy-mm-dd → lokale middernacht (niet UTC, anders schuift de dag)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

export function vandaag(): string {
  return isoDatum(new Date())
}

export function dagenTerug(n: number, vanaf = new Date()): string {
  const d = new Date(vanaf)
  d.setDate(d.getDate() - n)
  return isoDatum(d)
}

export function dagenVooruit(n: number, vanaf = new Date()): string {
  return dagenTerug(-n, vanaf)
}

/** ISO-weeknummer */
export function weekNummer(iso: string): number {
  const d = parseDatum(iso)
  if (!d) return 0
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** Maandag van de week waarin de datum valt */
export function weekStart(iso: string): string {
  const d = parseDatum(iso)!
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return isoDatum(d)
}

export function weekDagen(maandag: string): string[] {
  const d = parseDatum(maandag)!
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d)
    x.setDate(d.getDate() + i)
    return isoDatum(x)
  })
}

/** "07:30" + "16:15" − pauze → uren (decimaal) */
export function urenTussen(start: string, eind: string | undefined, pauzeMinuten = 0): number {
  if (!eind) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = eind.split(':').map(Number)
  const minuten = eh * 60 + em - (sh * 60 + sm) - pauzeMinuten
  return Math.max(0, Math.round((minuten / 60) * 100) / 100)
}

export function urenLabel(u: number): string {
  const h = Math.floor(u)
  const m = Math.round((u - h) * 60)
  return `${h}:${pad(m)}`
}

export function nuTijd(): string {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function kapitaliseer(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** Komma-getallen uit CSV ("1.234,56") naar number */
export function parseNlGetal(v: string | number | undefined | null): number {
  if (v === undefined || v === null || v === '') return 0
  if (typeof v === 'number') return v
  let s = String(v).trim().replace(/€/g, '').replace(/\s/g, '')
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.')
  else if (s.includes(',')) s = s.replace(',', '.')
  const n = Number(s)
  return isNaN(n) ? 0 : n
}

/** dd-mm-jjjj of jjjj-mm-dd of Excel-serial → yyyy-mm-dd */
export function parseNlDatum(v: string | number | undefined | null): string {
  if (v === undefined || v === null || v === '') return ''
  if (typeof v === 'number') {
    // Excel serial
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return isoDatum(d)
  }
  const s = String(v).trim()
  let m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(s)
  if (m) return `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`
  m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s)
  if (m) return `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`
  return ''
}
