import { useRef } from 'react'
import type { Balloon } from '../../../shared/types'
import { MIN_BALLOON_MM, STROKE_MM, clamp, DEFAULT_BALLOON_FONT } from '../lib/units'
import { useWindowDrag } from '../lib/useDrag'

interface BalloonItemProps {
  balloon: Balloon
  /** píxeles por milímetro */
  scale: number
  pageW: number
  pageH: number
  selected: boolean
  editing: boolean
  onSelect: () => void
  onChange: (patch: Partial<Balloon>) => void
  onEditStart: () => void
  onEditEnd: () => void
}

type Corner = 'nw' | 'ne' | 'sw' | 'se'

const HANDLE_STYLES: Record<Corner, React.CSSProperties> = {
  nw: { left: -5, top: -5, cursor: 'nwse-resize' },
  ne: { right: -5, top: -5, cursor: 'nesw-resize' },
  sw: { left: -5, bottom: -5, cursor: 'nesw-resize' },
  se: { right: -5, bottom: -5, cursor: 'nwse-resize' },
}

const INK = '#141414'

interface Pt {
  x: number
  y: number
}

/** Triángulo de cola desde el borde de una elipse hacia la punta. */
function tailPolygon(cx: number, cy: number, rx: number, ry: number, tip: Pt, spread: number, baseScale = 0.92) {
  const ang = Math.atan2(tip.y - cy, tip.x - cx)
  const b1 = { x: cx + rx * baseScale * Math.cos(ang - spread), y: cy + ry * baseScale * Math.sin(ang - spread) }
  const b2 = { x: cx + rx * baseScale * Math.cos(ang + spread), y: cy + ry * baseScale * Math.sin(ang + spread) }
  return `${b1.x.toFixed(1)},${b1.y.toFixed(1)} ${b2.x.toFixed(1)},${b2.y.toFixed(1)} ${tip.x.toFixed(1)},${tip.y.toFixed(1)}`
}

/** Cuerpo SVG del globo según su tipo, con sombra y estilo de marco opcionales. */
function BalloonShape({
  kind,
  w,
  h,
  stroke,
  tip,
  captionStyle = 'solid',
  shadowSize = 0,
}: {
  kind: Balloon['kind']
  w: number
  h: number
  stroke: number
  tip: Pt | null
  captionStyle?: Balloon['captionStyle']
  shadowSize?: number
}) {
  const cx = w / 2
  const cy = h / 2
  const rx = w / 2 - stroke / 2
  const ry = h / 2 - stroke / 2
  const filterId = `balloon-shadow-${Math.random().toString(36).slice(2, 6)}`
  const hasShadow = shadowSize > 0

  const shapes = (() => {
    if (kind === 'caption') {
      const inset = stroke / 2
      if (captionStyle === 'rounded') {
        return (
          <rect x={inset} y={inset} width={w - stroke} height={h - stroke} rx={Math.min(w, h) * 0.18} ry={Math.min(w, h) * 0.18}
            fill="#fff" stroke={INK} strokeWidth={stroke} />
        )
      }
      if (captionStyle === 'double') {
        return (
          <>
            <rect x={inset} y={inset} width={w - stroke} height={h - stroke} fill="#fff" stroke={INK} strokeWidth={stroke} />
            <rect x={stroke * 2.5} y={stroke * 2.5} width={w - stroke * 5} height={h - stroke * 5} fill="none" stroke={INK} strokeWidth={stroke * 0.7} />
          </>
        )
      }
      if (captionStyle === 'none') {
        return <rect x={0} y={0} width={w} height={h} fill="#fff" />
      }
      // solid (default)
      return <rect x={inset} y={inset} width={w - stroke} height={h - stroke} fill="#fff" stroke={INK} strokeWidth={stroke} />
    }

    if (kind === 'thought') {
      const circles: Pt[] = tip
        ? [0.55, 0.78, 0.97].map((t) => ({ x: cx + (tip.x - cx) * t, y: cy + (tip.y - cy) * t }))
        : []
      const radii = [stroke * 3.2, stroke * 2.3, stroke * 1.5]
      return (
        <>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" stroke={INK} strokeWidth={stroke} strokeDasharray={`${stroke * 3} ${stroke * 1.8}`} />
          {circles.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={radii[i]} fill="#fff" stroke={INK} strokeWidth={stroke} />)}
        </>
      )
    }

    if (kind === 'shout') {
      const spikes = 15
      let d = ''
      for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
        const f = i % 2 === 0 ? 1 : 0.74
        d += `${i === 0 ? 'M' : 'L'}${(cx + rx * f * Math.cos(a)).toFixed(1)},${(cy + ry * f * Math.sin(a)).toFixed(1)}`
      }
      d += 'Z'
      return (
        <>
          {tip && <polygon points={tailPolygon(cx, cy, rx, ry, tip, 0.32, 0.7)} fill="#fff" stroke={INK} strokeWidth={stroke} strokeLinejoin="round" />}
          <path d={d} fill="#fff" stroke={INK} strokeWidth={stroke} strokeLinejoin="round" />
        </>
      )
    }

    // speech (default)
    return (
      <>
        {tip && <polygon points={tailPolygon(cx, cy, rx, ry, tip, 0.42)} fill="#fff" stroke={INK} strokeWidth={stroke} strokeLinejoin="round" />}
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" stroke={INK} strokeWidth={stroke} />
      </>
    )
  })()

  if (!hasShadow) return shapes
  return (
    <>
      <defs>
        <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx={shadowSize * 0.4} dy={shadowSize * 0.5} stdDeviation={shadowSize * 0.3} floodColor="#000" floodOpacity={0.22} />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>{shapes}</g>
    </>
  )
}

/** Globo de diálogo: arrastrar el cuerpo lo mueve, las esquinas lo redimensionan,
 *  el punto de la cola se orienta arrastrando su asa y el texto se edita con doble clic. */
export default function BalloonItem({
  balloon,
  scale,
  pageW,
  pageH,
  selected,
  editing,
  onSelect,
  onChange,
  onEditStart,
  onEditEnd,
}: BalloonItemProps) {
  const startRect = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const startTail = useRef<Pt>({ x: 0, y: 0 })
  const mode = useRef<'move' | 'tail' | Corner>('move')

  const { begin, active } = useWindowDrag((dx, dy) => {
    const r = startRect.current
    const mx = dx / scale
    const my = dy / scale

    if (mode.current === 'move') {
      onChange({
        x: clamp(r.x + mx, 0, pageW - r.w),
        y: clamp(r.y + my, 0, pageH - r.h),
      })
      return
    }

    if (mode.current === 'tail') {
      onChange({
        tail: {
          x: clamp(startTail.current.x + mx, 0, pageW),
          y: clamp(startTail.current.y + my, 0, pageH),
        },
      })
      return
    }

    const corner = mode.current
    const anchorX = corner === 'se' || corner === 'ne' ? r.x : r.x + r.w
    const anchorY = corner === 'se' || corner === 'sw' ? r.y : r.y + r.h
    let w = corner === 'se' || corner === 'ne' ? r.w + mx : r.w - mx
    let h = corner === 'se' || corner === 'sw' ? r.h + my : r.h - my
    w = clamp(w, MIN_BALLOON_MM.w, corner === 'se' || corner === 'ne' ? pageW - anchorX : anchorX)
    h = clamp(h, MIN_BALLOON_MM.h, corner === 'se' || corner === 'sw' ? pageH - anchorY : anchorY)
    onChange({
      x: corner === 'se' || corner === 'ne' ? anchorX : anchorX - w,
      y: corner === 'se' || corner === 'sw' ? anchorY : anchorY - h,
      w,
      h,
    })
  })

  const startDrag = (e: React.PointerEvent, dragMode: 'move' | 'tail' | Corner) => {
    e.stopPropagation()
    e.preventDefault()
    onSelect()
    mode.current = dragMode
    startRect.current = { x: balloon.x, y: balloon.y, w: balloon.w, h: balloon.h }
    if (balloon.tail) startTail.current = { ...balloon.tail }
    begin(e)
  }

  const wPx = balloon.w * scale
  const hPx = balloon.h * scale
  const stroke = Math.max(1.25, STROKE_MM * scale)
  const tipLocal = balloon.tail
    ? { x: (balloon.tail.x - balloon.x) * scale, y: (balloon.tail.y - balloon.y) * scale }
    : null

  // Relleno interior del texto según la forma del globo
  const padX = balloon.kind === 'caption' ? wPx * 0.06 : wPx * 0.14
  const padY = balloon.kind === 'caption' ? hPx * 0.1 : hPx * 0.18

  return (
    <div
      className={`absolute touch-none ${selected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
      style={{
        left: balloon.x * scale,
        top: balloon.y * scale,
        width: wPx,
        height: hPx,
        cursor: active && mode.current === 'move' ? 'grabbing' : 'grab',
      }}
      onPointerDown={(e) => startDrag(e, 'move')}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onEditStart()
      }}
    >
      <svg
        width={wPx}
        height={hPx}
        viewBox={`0 0 ${wPx} ${hPx}`}
        className="pointer-events-none absolute inset-0 overflow-visible"
      >
        <BalloonShape kind={balloon.kind} w={wPx} h={hPx} stroke={stroke} tip={tipLocal}
          captionStyle={balloon.captionStyle}
          shadowSize={(balloon.shadow || 0) * scale} />
      </svg>

      {/* Texto / edición */}
      {editing ? (
        <textarea
          autoFocus
          value={balloon.text}
          placeholder="Escribe el diálogo…"
          onChange={(e) => onChange({ text: e.target.value })}
          onBlur={onEditEnd}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onEditEnd()
            e.stopPropagation()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="balloon-font absolute resize-none overflow-hidden bg-transparent text-center leading-snug outline-none"
          style={{
            left: padX,
            top: padY,
            width: wPx - padX * 2,
            height: hPx - padY * 2,
            fontSize: balloon.fontSize * scale,
            fontFamily: balloon.fontFamily || DEFAULT_BALLOON_FONT,
          }}
        />
      ) : (
        <div
          className="balloon-font pointer-events-none absolute flex items-center justify-center overflow-hidden text-center leading-snug"
          style={{
            left: padX,
            top: padY,
            width: wPx - padX * 2,
            height: hPx - padY * 2,
            fontSize: balloon.fontSize * scale,
            fontFamily: balloon.fontFamily || DEFAULT_BALLOON_FONT,
          }}
        >
          {balloon.text ? (
            <span className="whitespace-pre-wrap break-words">{balloon.text}</span>
          ) : (
            <span className="italic text-neutral-400" style={{ fontSize: balloon.fontSize * scale * 0.8 }}>
              Doble clic para escribir
            </span>
          )}
        </div>
      )}

      {/* Asas de redimensión */}
      {selected &&
        !editing &&
        (Object.keys(HANDLE_STYLES) as Corner[]).map((corner) => (
          <span
            key={corner}
            style={{ position: 'absolute', width: 10, height: 10, ...HANDLE_STYLES[corner] }}
            className="z-10 rounded-[3px] border border-indigo-600 bg-white shadow-sm"
            onPointerDown={(e) => startDrag(e, corner)}
          />
        ))}

      {/* Asa de la cola */}
      {selected && !editing && balloon.tail && tipLocal && (
        <span
          style={{
            position: 'absolute',
            left: tipLocal.x - 6,
            top: tipLocal.y - 6,
            width: 12,
            height: 12,
            cursor: 'crosshair',
          }}
          className="z-10 rounded-full border-2 border-indigo-600 bg-white shadow-sm"
          title="Arrastra para orientar la cola"
          onPointerDown={(e) => startDrag(e, 'tail')}
        />
      )}
    </div>
  )
}
