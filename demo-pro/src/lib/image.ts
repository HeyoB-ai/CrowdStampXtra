/** Foto's uit de camera comprimeren naar max. 1600 px (langste zijde), JPEG 0.82 */
export async function comprimeerAfbeelding(file: File, maxPx = 1600): Promise<string> {
  const dataUrl = await leesAlsDataUrl(file)
  const img = await laadAfbeelding(dataUrl)
  const schaal = Math.min(1, maxPx / Math.max(img.width, img.height))
  if (schaal === 1 && file.size < 900_000) return dataUrl
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * schaal)
  canvas.height = Math.round(img.height * schaal)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.82)
}

function leesAlsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(r.error)
    r.readAsDataURL(file)
  })
}

function laadAfbeelding(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

/** Bestand downloaden vanuit de browser */
export function downloadBestand(naam: string, inhoud: string | Blob, mime = 'text/plain;charset=utf-8') {
  const blob = inhoud instanceof Blob ? inhoud : new Blob([inhoud], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = naam
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
