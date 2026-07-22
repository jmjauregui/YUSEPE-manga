import { useEffect, useRef, useState } from 'react'
import type { Panel, PanelPoint, PlacedImage, Selection } from '../../../shared/types'
import {
  MIN_PANEL_MM,
  STROKE_MM,
  clamp,
  defaultCorners,
  isConvexQuad,
  panelCorners,
} from '../lib/units'
import { assetUrl } from '../lib/units'
import { useWindowDrag } from '../lib/useDrag'
import PlacedImageItem from './PlacedImageItem'

/**
 * Fondo de trama: levanta el SVG, le inyecta `preserveAspectRatio="none"` y
 * `width/height="100%"` para forzar el estiramiento al tamaño exacto de la viñeta
 * sin importar la relación de aspecto del viewBox original.
 */
function PanelTone({ toneSrc }: { toneSrc: string }) {
  const [svg, setSvg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(assetUrl(toneSrc))
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return
        // Quitar preserveAspectRatio existente y forzar el nuestro
        let modified = text.replace(/preserveAspectRatio="[^"]*"/gi, '')
        modified = modified.replace(
          /<svg\b/i,
          '<svg preserveAspectRatio="none" width="100%" height="100%"',
        )
        setSvg(modified)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [toneSrc])

  if (!svg) return null
  return (
    <div
      className="pointer-events-none absolute inset-0"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

interface PanelItemProps {
  panel: Panel
  scale: number
  /** Dimensiones de la página en mm (límites de la viñeta) */
  pageW: number
  pageH: number
  selection: Selection
  /** Modo deformar: los asas de las esquinas mueven vértices en vez de redimensionar */
  deformMode: boolean
  onSelect: (sel: Selection) => void
  onChangePanel: (patch: Partial<Panel>) => void
  onChangeImage: (imgId: string, patch: Partial<PlacedImage>) => void
  /** Desplaza todas las imágenes de la viñeta (mantiene su posición absoluta al deformar) */
  onShiftImages: (dx: number, dy: number) => void
  onToggleDeform: () => void
}

type Corner = 'nw' | 'ne' | 'sw' | 'se'
type Mode = 'move' | 'resize' | 'vertex'

const HANDLE_STYLES: Record<Corner, React.CSSProperties> = {
  nw: { left: -6, top: -6, cursor: 'nwse-resize' },
  ne: { right: -6, top: -6, cursor: 'nesw-resize' },
  sw: { left: -6, bottom: -6, cursor: 'nesw-resize' },
  se: { right: -6, bottom: -6, cursor: 'nwse-resize' },
}

const INK = '#141414'

/**
 * Viñeta poligonal: cuadrilátero con borde que recorta sus imágenes.
 * Arrastrar el fondo la mueve; en modo normal las esquinas redimensionan el
 * bounding box; en modo deformar cada vértice se estira libremente (convexo).
 */
export default function PanelItem({
  panel,
  scale,
  pageW,
  pageH,
  selection,
  deformMode,
  onSelect,
  onChangePanel,
  onChangeImage,
  onShiftImages,
  onToggleDeform,
}: PanelItemProps) {
  const startRect = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const startCorners = useRef<Panel['corners'] | null>(null)
  const appliedShift = useRef({ x: 0, y: 0 })
  const mode = useRef<Mode>('move')
  const resizeCorner = useRef<Corner>('se')
  const vertexIndex = useRef(0)

  const selected = selection?.kind === 'panel' && selection.id === panel.id
  const corners = panelCorners(panel)

  const { begin, active } = useWindowDrag((dx, dy) => {
    const r = startRect.current
    const mx = dx / scale
    const my = dy / scale

    if (mode.current === 'move') {
      onChangePanel({
        x: clamp(r.x + mx, 0, pageW - r.w),
        y: clamp(r.y + my, 0, pageH - r.h),
      })
      return
    }

    if (mode.current === 'vertex') {
      const sc = startCorners.current
      if (!sc) return
      // Vértice arrastrado en coordenadas absolutas de página
      const abs: PanelPoint[] = sc.map((c) => ({ x: c.x + r.x, y: c.y + r.y }))
      const i = vertexIndex.current
      abs[i] = {
        x: clamp(abs[i].x + mx, 0, pageW),
        y: clamp(abs[i].y + my, 0, pageH),
      }
      // Guardarraíl: solo cuadriláteros convexos (sin aristas cruzadas)
      if (!isConvexQuad(abs)) return

      const minX = Math.min(...abs.map((p) => p.x))
      const minY = Math.min(...abs.map((p) => p.y))
      const maxX = Math.max(...abs.map((p) => p.x))
      const maxY = Math.max(...abs.map((p) => p.y))
      if (maxX - minX < MIN_PANEL_MM || maxY - minY < MIN_PANEL_MM) return

      onChangePanel({
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
        corners: abs.map((p) => ({ x: p.x - minX, y: p.y - minY })) as Panel['corners'],
      })

      // El origen del bounding box pudo moverse: compensar las imágenes para
      // que el contenido no salte (delta incremental respecto al gesto)
      const totalSx = r.x - minX
      const totalSy = r.y - minY
      const dsx = totalSx - appliedShift.current.x
      const dsy = totalSy - appliedShift.current.y
      if (dsx !== 0 || dsy !== 0) {
        onShiftImages(dsx, dsy)
        appliedShift.current = { x: totalSx, y: totalSy }
      }
      return
    }

    // Redimensionar bounding box con esquina opuesta fija; los vértices
    // escalan proporcionalmente (una viñeta rectangular sigue rectangular)
    const corner = resizeCorner.current
    const anchorX = corner === 'se' || corner === 'ne' ? r.x : r.x + r.w
    const anchorY = corner === 'se' || corner === 'sw' ? r.y : r.y + r.h
    let w = corner === 'se' || corner === 'ne' ? r.w + mx : r.w - mx
    let h = corner === 'se' || corner === 'sw' ? r.h + my : r.h - my
    w = clamp(w, MIN_PANEL_MM, corner === 'se' || corner === 'ne' ? pageW - anchorX : anchorX)
    h = clamp(h, MIN_PANEL_MM, corner === 'se' || corner === 'sw' ? pageH - anchorY : anchorY)

    const fx = w / r.w
    const fy = h / r.h
    onChangePanel({
      x: corner === 'se' || corner === 'ne' ? anchorX : anchorX - w,
      y: corner === 'se' || corner === 'sw' ? anchorY : anchorY - h,
      w,
      h,
      corners: (startCorners.current ?? defaultCorners(r.w, r.h)).map((c) => ({
        x: c.x * fx,
        y: c.y * fy,
      })) as Panel['corners'],
    })
  })

  const startDrag = (e: React.PointerEvent, dragMode: Mode, extra?: Corner | number) => {
    e.stopPropagation()
    e.preventDefault()
    onSelect({ kind: 'panel', id: panel.id })
    mode.current = dragMode
    if (dragMode === 'resize') resizeCorner.current = extra as Corner
    if (dragMode === 'vertex') vertexIndex.current = extra as number
    startRect.current = { x: panel.x, y: panel.y, w: panel.w, h: panel.h }
    startCorners.current = panelCorners(panel).map((c) => ({ ...c })) as Panel['corners']
    appliedShift.current = { x: 0, y: 0 }
    begin(e)
  }

  const wPx = panel.w * scale
  const hPx = panel.h * scale
  const stroke = Math.max(1.25, STROKE_MM * scale)
  const cornersPx = corners.map((c) => ({ x: c.x * scale, y: c.y * scale }))
  const pointsAttr = cornersPx.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  const clipPath = `polygon(${cornersPx.map((p) => `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`).join(', ')})`

  return (
    <div
      className={`absolute touch-none ${!selected ? 'hover:ring-1 hover:ring-indigo-300' : ''}`}
      style={{
        left: panel.x * scale,
        top: panel.y * scale,
        width: wPx,
        height: hPx,
        cursor: active && mode.current === 'move' ? 'grabbing' : 'grab',
      }}
      onPointerDown={(e) => startDrag(e, 'move')}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onSelect({ kind: 'panel', id: panel.id })
        onToggleDeform()
      }}
    >
      {/* Relleno del cuadrilátero */}
      <svg
        width={wPx}
        height={hPx}
        viewBox={`0 0 ${wPx} ${hPx}`}
        className="pointer-events-none absolute inset-0 overflow-visible"
      >
        {!panel.toneSrc && !panel.background && <polygon points={pointsAttr} fill="#fff" />}
      </svg>

      {/* Contenido recortado al cuadrilátero */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath }}
      >
        {/* Fondo de trama (SVG estirado para llenar la viñeta sin repetir) */}
        {panel.toneSrc && <PanelTone toneSrc={panel.toneSrc} />}

        {/* Fondo de IA o background-image aplicado manualmente */}
        {panel.background && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url(${assetUrl(panel.background.src)})`,
              backgroundSize:
                panel.background.size === 'cover' || panel.background.size === 'contain'
                  ? panel.background.size
                  : `${panel.background.size}%`,
              backgroundPosition: `${panel.background.posX}% ${panel.background.posY}%`,
              backgroundRepeat: panel.background.repeat ? 'repeat' : 'no-repeat',
            }}
          />
        )}
        {panel.images.map((img) => (
          <PlacedImageItem
            key={img.id}
            img={img}
            scale={scale}
            bounds={{ w: panel.w, h: panel.h }}
            selected={selection?.kind === 'image' && selection.id === img.id}
            onSelect={() => onSelect({ kind: 'image', id: img.id })}
            onChange={(patch) => onChangeImage(img.id, patch)}
          />
        ))}
      </div>

      {/* Borde del cuadrilátero (encima del contenido) */}
      <svg
        width={wPx}
        height={hPx}
        viewBox={`0 0 ${wPx} ${hPx}`}
        className="pointer-events-none absolute inset-0 overflow-visible"
      >
        <polygon
          points={pointsAttr}
          fill="none"
          stroke={INK}
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
        {selected && (
          <polygon
            points={pointsAttr}
            fill="none"
            stroke="#6366f1"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* Asas: redimensión del bbox (modo normal) o vértices (modo deformar) */}
      {selected &&
        !deformMode &&
        (Object.keys(HANDLE_STYLES) as Corner[]).map((corner) => (
          <span
            key={corner}
            style={{ position: 'absolute', width: 12, height: 12, ...HANDLE_STYLES[corner] }}
            className="z-10 rounded-[3px] border-2 border-indigo-600 bg-white shadow-sm"
            onPointerDown={(e) => startDrag(e, 'resize', corner)}
          />
        ))}

      {selected &&
        deformMode &&
        cornersPx.map((p, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: p.x - 6,
              top: p.y - 6,
              width: 13,
              height: 13,
              cursor: 'crosshair',
            }}
            className="z-10 rounded-full border-2 border-indigo-600 bg-white shadow"
            title="Arrastra para deformar la viñeta"
            onPointerDown={(e) => startDrag(e, 'vertex', i)}
          />
        ))}
    </div>
  )
}
