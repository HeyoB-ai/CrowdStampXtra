import { Eraser } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/** Tekenveld (canvas) voor handtekeningen; werkt met muis, pen en touch. */
export function Handtekening({ onChange, hoogte = 160 }: { onChange: (dataUrl: string | null) => void; hoogte?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const tekent = useRef(false)
  const laatste = useRef<{ x: number; y: number } | null>(null)
  const [leeg, setLeeg] = useState(true)
  const leegRef = useRef(true)

  useEffect(() => {
    const c = ref.current!
    const dpr = window.devicePixelRatio || 1
    const pas = () => {
      const w = c.clientWidth
      const oud = c.toDataURL()
      c.width = w * dpr
      c.height = hoogte * dpr
      const ctx = c.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0f0f0f'
      if (!leeg) {
        const img = new Image()
        img.onload = () => ctx.drawImage(img, 0, 0, w, hoogte)
        img.src = oud
      }
    }
    pas()
    window.addEventListener('resize', pas)
    return () => window.removeEventListener('resize', pas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoogte])

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const start = (e: React.PointerEvent) => {
    tekent.current = true
    laatste.current = pos(e)
    try {
      ref.current!.setPointerCapture(e.pointerId)
    } catch {
      /* synthetische events hebben geen geldige pointerId */
    }
  }
  const beweeg = (e: React.PointerEvent) => {
    if (!tekent.current || !laatste.current) return
    const ctx = ref.current!.getContext('2d')!
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(laatste.current.x, laatste.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    laatste.current = p
    if (leegRef.current) {
      leegRef.current = false
      setLeeg(false)
    }
  }
  const stop = () => {
    if (!tekent.current) return
    tekent.current = false
    laatste.current = null
    onChange(leegRef.current ? null : ref.current!.toDataURL('image/png'))
  }
  const wis = () => {
    const c = ref.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    leegRef.current = true
    setLeeg(true)
    onChange(null)
  }

  return (
    <div className="relative">
      <canvas
        ref={ref}
        className="w-full rounded-[12px] border border-dashed border-line-2 bg-paper touch-none cursor-crosshair"
        style={{ height: hoogte }}
        onPointerDown={start}
        onPointerMove={beweeg}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      />
      {leeg && <div className="absolute inset-0 flex items-center justify-center text-[13px] text-ink-4 pointer-events-none">Teken hier uw handtekening</div>}
      <div className="absolute bottom-2 left-3 right-3 border-t border-line pointer-events-none" />
      {!leeg && (
        <button type="button" onClick={wis} className="absolute top-2 right-2 btn-outline btn-sm !py-1 !px-2 bg-paper">
          <Eraser size={13} /> Wissen
        </button>
      )}
    </div>
  )
}
