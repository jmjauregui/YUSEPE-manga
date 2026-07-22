import { useRef } from 'react'
import type { Sfx, SfxStyle } from '../../../shared/types'
import { clamp } from '../lib/units'
import { useWindowDrag } from '../lib/useDrag'

interface SfxItemProps {
  sfx: Sfx
  scale: number
  pageW: number
  pageH: number
  selected: boolean
  editing: boolean
  onSelect: () => void
  onChange: (patch: Partial<Sfx>) => void
  onEditStart: () => void
  onEditEnd: () => void
}

export const SFX_STYLES: { id: SfxStyle; label: string }[] = [
  { id: 'impact', label: 'Impacto' },
  { id: 'outline', label: 'Contorno' },
  { id: 'brush', label: 'Pincel' },
]
export const SFX_COLORS = ['#141414', '#ffffff', '#dc2626']

/** Estilo visual de la onomatopeya según tipo, color y fuente opcional */
export function sfxTextStyle(sfx: Sfx, scale: number): React.CSSProperties {
  const fs = sfx.fontSize * scale
  const base: React.CSSProperties = { fontSize: fs, lineHeight: 1.1 }
  const family = sfx.fontFamily
  if (sfx.style === 'outline') {
    return {
      ...base,
      fontFamily: family || '"Arial Black", Impact, sans-serif',
      color: '#ffffff',
      WebkitTextStroke: `${Math.max(1, fs * 0.09)}px ${sfx.color}`,
    }
  }
  if (sfx.style === 'brush') {
    return { ...base, fontFamily: family || "'Chalkboard SE', 'Segoe Print', 'Comic Sans MS', cursive", color: sfx.color }
  }
  // impact
  return {
    ...base,
    fontFamily: family || 'Impact, "Arial Black", sans-serif',
    fontStyle: 'italic',
    color: sfx.color,
    WebkitTextStroke: `${Math.max(0.75, fs * 0.045)}px ${sfx.color === '#141414' ? '#ffffff' : '#141414'}`,
    transform: 'skewX(-6deg)',
  }
}

/** Onomatopeya: se mueve arrastrando, doble clic edita el texto. */
export default function SfxItem({
  sfx,
  scale,
  pageW,
  pageH,
  selected,
  editing,
  onSelect,
  onChange,
  onEditStart,
  onEditEnd,
}: SfxItemProps) {
  const startPos = useRef({ x: 0, y: 0 })

  const { begin, active } = useWindowDrag((dx, dy) => {
    onChange({
      x: clamp(startPos.current.x + dx / scale, 0, pageW),
      y: clamp(startPos.current.y + dy / scale, 0, pageH),
    })
  })

  return (
    <div
      className="absolute touch-none"
      style={{
        left: sfx.x * scale,
        top: sfx.y * scale,
        transform: `translate(-50%, -50%) rotate(${sfx.rotation}deg)`,
        cursor: active ? 'grabbing' : 'grab',
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onSelect()
        startPos.current = { x: sfx.x, y: sfx.y }
        begin(e)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onEditStart()
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={sfx.text}
          onChange={(e) => onChange({ text: e.target.value })}
          onBlur={onEditEnd}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') onEditEnd()
            e.stopPropagation()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded bg-white/90 text-center outline-none ring-2 ring-indigo-500"
          style={{ ...sfxTextStyle(sfx, scale), WebkitTextStroke: undefined, minWidth: 120 }}
        />
      ) : (
        <span
          className={`whitespace-nowrap font-black ${selected ? 'rounded ring-2 ring-indigo-500 ring-offset-2' : ''}`}
          style={sfxTextStyle(sfx, scale)}
        >
          {sfx.text || '¡SFX!'}
        </span>
      )}
    </div>
  )
}
