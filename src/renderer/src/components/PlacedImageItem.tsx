import { useRef } from 'react'
import type { PlacedImage } from '../../../shared/types'
import { clamp } from '../lib/units'
import { useWindowDrag } from '../lib/useDrag'
import PlacedImageContent from './PlacedImageContent'

interface PlacedImageItemProps {
  img: PlacedImage
  /** píxeles por milímetro */
  scale: number
  /** Límites del contenedor en mm (página o viñeta) */
  bounds: { w: number; h: number }
  selected: boolean
  onSelect: () => void
  onChange: (patch: Partial<PlacedImage>) => void
}

type Corner = 'nw' | 'ne' | 'sw' | 'se'
const MIN_IMAGE_MM = 10

const HANDLE_STYLES: Record<Corner, React.CSSProperties> = {
  nw: { left: -5, top: -5, cursor: 'nwse-resize' },
  ne: { right: -5, top: -5, cursor: 'nesw-resize' },
  sw: { left: -5, bottom: -5, cursor: 'nesw-resize' },
  se: { right: -5, bottom: -5, cursor: 'nwse-resize' },
}

/** Imagen colocada: se mueve arrastrando y se redimensiona desde las esquinas
 *  manteniendo la proporción. Siempre queda dentro de sus límites. */
export default function PlacedImageItem({
  img,
  scale,
  bounds,
  selected,
  onSelect,
  onChange,
}: PlacedImageItemProps) {
  const startRect = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const mode = useRef<'move' | Corner>('move')

  const { begin, active } = useWindowDrag((dx, dy) => {
    const r = startRect.current
    const mx = dx / scale
    const my = dy / scale

    if (mode.current === 'move') {
      onChange({
        x: clamp(r.x + mx, 0, bounds.w - r.w),
        y: clamp(r.y + my, 0, bounds.h - r.h),
      })
      return
    }

    // Redimensionar con proporción bloqueada y esquina opuesta fija
    const corner = mode.current
    const ratio = r.w / r.h
    let w = Math.max(
      corner === 'se' || corner === 'ne' ? r.w + mx : r.w - mx,
      MIN_IMAGE_MM,
    )
    let h = w / ratio
    const anchorX = corner === 'se' || corner === 'ne' ? r.x : r.x + r.w
    const anchorY = corner === 'se' || corner === 'sw' ? r.y : r.y + r.h
    const maxW = corner === 'se' || corner === 'ne' ? bounds.w - anchorX : anchorX
    const maxH = corner === 'se' || corner === 'sw' ? bounds.h - anchorY : anchorY
    if (w > maxW) {
      w = maxW
      h = w / ratio
    }
    if (h > maxH) {
      h = maxH
      w = h * ratio
    }
    onChange({
      x: corner === 'se' || corner === 'ne' ? anchorX : anchorX - w,
      y: corner === 'se' || corner === 'sw' ? anchorY : anchorY - h,
      w,
      h,
    })
  })

  const startDrag = (e: React.PointerEvent, dragMode: 'move' | Corner) => {
    e.stopPropagation()
    e.preventDefault()
    onSelect()
    mode.current = dragMode
    startRect.current = { x: img.x, y: img.y, w: img.w, h: img.h }
    begin(e)
  }

  return (
    <div
      className={`absolute touch-none ${
        selected ? 'ring-2 ring-indigo-500' : 'hover:ring-1 hover:ring-indigo-300'
      }`}
      style={{
        left: img.x * scale,
        top: img.y * scale,
        width: img.w * scale,
        height: img.h * scale,
        cursor: active && mode.current === 'move' ? 'grabbing' : 'grab',
      }}
      onPointerDown={(e) => startDrag(e, 'move')}
    >
      <PlacedImageContent img={img} />
      {selected &&
        (Object.keys(HANDLE_STYLES) as Corner[]).map((corner) => (
          <span
            key={corner}
            style={{ position: 'absolute', width: 10, height: 10, ...HANDLE_STYLES[corner] }}
            className="z-10 rounded-[3px] border border-indigo-600 bg-white shadow-sm"
            onPointerDown={(e) => startDrag(e, corner)}
          />
        ))}
    </div>
  )
}
