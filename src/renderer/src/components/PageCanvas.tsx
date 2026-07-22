import { useRef, useState } from 'react'
import { Images } from 'lucide-react'
import type {
  Balloon,
  EditorTool,
  MangaPage,
  PageSetup,
  Panel,
  PlacedImage,
  Selection,
  Sfx,
  StampPattern,
} from '../../../shared/types'
import { MIN_PANEL_MM, STAMP_SPACING_MM, clamp } from '../lib/units'
import type { Box } from '../lib/units'
import { useWindowDrag } from '../lib/useDrag'
import PlacedImageItem from './PlacedImageItem'
import PanelItem from './PanelItem'
import BalloonItem from './BalloonItem'
import SfxItem from './SfxItem'

// Re-export para que las pantallas no importen de dos sitios
export type { Box }

interface PageCanvasProps {
  page: MangaPage
  setup: PageSetup
  /** píxeles por milímetro (ya incluye el zoom) */
  scale: number
  selection: Selection
  tool: EditorTool
  penColor: string
  penWidth: number
  stampPattern: StampPattern
  stampSize: number
  panelDeformMode: boolean
  editingBalloonId: string | null
  editingSfxId: string | null
  onSelect: (sel: Selection) => void
  onCreatePanel: (rect: Box) => void
  onChangePanel: (id: string, patch: Partial<Panel>) => void
  onShiftPanelImages: (panelId: string, dx: number, dy: number) => void
  onTogglePanelDeform: () => void
  onChangeImage: (id: string, patch: Partial<PlacedImage>) => void
  onChangeBalloon: (id: string, patch: Partial<Balloon>) => void
  onEditBalloon: (id: string | null) => void
  onChangeSfx: (id: string, patch: Partial<Sfx>) => void
  onEditSfx: (id: string | null) => void
  onAddStroke: (points: number[], color: string, width: number) => void
  onEraseAt: (x: number, y: number) => void
  onAddStamp: (x: number, y: number, pattern: StampPattern, size: number) => void
  onDropFiles: (paths: string[], panelId: string | null) => void
}

/** Distancia mínima entre puntos capturados de un trazo (mm) */
const PEN_STEP_MM = 0.25

export default function PageCanvas({
  page,
  setup,
  scale,
  selection,
  tool,
  penColor,
  penWidth,
  stampPattern,
  stampSize,
  panelDeformMode,
  editingBalloonId,
  editingSfxId,
  onSelect,
  onCreatePanel,
  onChangePanel,
  onShiftPanelImages,
  onTogglePanelDeform,
  onChangeImage,
  onChangeBalloon,
  onEditBalloon,
  onChangeSfx,
  onEditSfx,
  onAddStroke,
  onEraseAt,
  onAddStamp,
  onDropFiles,
}: PageCanvasProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [marquee, setMarquee] = useState<Box | null>(null)
  const [penPreview, setPenPreview] = useState<number[] | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const marqueeStart = useRef({ x: 0, y: 0 })
  const marqueeRect = useRef<Box | null>(null)
  const penPoints = useRef<number[]>([])
  const lastStampAt = useRef({ x: 0, y: 0 })
  const gestureStart = useRef({ x: 0, y: 0 })

  const W = setup.width
  const H = setup.height
  const m = setup.margins

  const pagePointFromEvent = (clientX: number, clientY: number) => {
    const bounds = rootRef.current!.getBoundingClientRect()
    return {
      x: clamp((clientX - bounds.left) / scale, 0, W),
      y: clamp((clientY - bounds.top) / scale, 0, H),
    }
  }

  // Gesto de herramientas sobre el fondo de página: marquee, pluma, borrador, timbre
  const toolDrag = useWindowDrag(
    (dx, dy, e) => {
      const current = {
        x: clamp(gestureStart.current.x + dx / scale, 0, W),
        y: clamp(gestureStart.current.y + dy / scale, 0, H),
      }
      if (tool === 'panel') {
        const s = marqueeStart.current
        const rect = {
          x: Math.min(s.x, current.x),
          y: Math.min(s.y, current.y),
          w: Math.abs(current.x - s.x),
          h: Math.abs(current.y - s.y),
        }
        marqueeRect.current = rect
        setMarquee(rect)
        return
      }
      if (tool === 'pen') {
        const pts = penPoints.current
        const lx = pts[pts.length - 2]
        const ly = pts[pts.length - 1]
        if (Math.hypot(current.x - lx, current.y - ly) >= PEN_STEP_MM) {
          pts.push(current.x, current.y)
          setPenPreview([...pts])
        }
        return
      }
      if (tool === 'eraser') {
        onEraseAt(current.x, current.y)
        return
      }
      if (tool === 'stamp') {
        if (Math.hypot(current.x - lastStampAt.current.x, current.y - lastStampAt.current.y) >= STAMP_SPACING_MM) {
          lastStampAt.current = current
          onAddStamp(current.x, current.y, stampPattern, stampSize)
        }
      }
    },
    () => {
      if (tool === 'panel') {
        const rect = marqueeRect.current
        marqueeRect.current = null
        setMarquee(null)
        if (rect && rect.w >= MIN_PANEL_MM && rect.h >= MIN_PANEL_MM) onCreatePanel(rect)
        return
      }
      if (tool === 'pen') {
        const pts = penPoints.current
        penPoints.current = []
        setPenPreview(null)
        if (pts.length >= 4) onAddStroke(pts, penColor, penWidth)
      }
    },
  )

  const rootPointerDown = (e: React.PointerEvent) => {
    if (tool === 'select') {
      onSelect(null)
      return
    }
    const pt = pagePointFromEvent(e.clientX, e.clientY)
    gestureStart.current = pt

    if (tool === 'panel') {
      marqueeStart.current = pt
      const initial = { x: pt.x, y: pt.y, w: 0, h: 0 }
      marqueeRect.current = initial
      setMarquee(initial)
    } else if (tool === 'pen') {
      penPoints.current = [pt.x, pt.y]
      setPenPreview([pt.x, pt.y])
    } else if (tool === 'eraser') {
      onEraseAt(pt.x, pt.y)
    } else if (tool === 'stamp') {
      lastStampAt.current = pt
      onAddStamp(pt.x, pt.y, stampPattern, stampSize)
    }
    toolDrag.begin(e)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const paths = Array.from(e.dataTransfer.files)
      .map((f) => window.yusepe.getPathForFile(f))
      .filter((p) => !!p)
    if (paths.length === 0) return

    const mmX = (e.clientX - rootRef.current!.getBoundingClientRect().left) / scale
    const mmY = (e.clientY - rootRef.current!.getBoundingClientRect().top) / scale
    const target = [...page.panels]
      .reverse()
      .find((p) => mmX >= p.x && mmX <= p.x + p.w && mmY >= p.y && mmY <= p.y + p.h)
    onDropFiles(paths, target?.id ?? null)
  }

  // Fallbacks defensivos para páginas de proyectos antiguos en memoria
  const strokes = page.strokes ?? []
  const stamps = page.stamps ?? []
  const sfxList = page.sfx ?? []

  const isEmpty =
    page.images.length === 0 &&
    page.panels.length === 0 &&
    page.balloons.length === 0 &&
    strokes.length === 0 &&
    stamps.length === 0 &&
    sfxList.length === 0

  const cursorClass = tool !== 'select' ? 'cursor-crosshair' : ''

  return (
    <div
      ref={rootRef}
      className={`relative shadow-xl ring-1 ring-neutral-300 ${cursorClass}`}
      style={{ width: W * scale, height: H * scale }}
      onPointerDown={rootPointerDown}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Papel */}
      <div className="absolute inset-0 bg-white" />

      {/* Guía de márgenes */}
      <div
        className="pointer-events-none absolute border border-dashed border-indigo-400/60"
        style={{
          left: m.left * scale,
          top: m.top * scale,
          right: m.right * scale,
          bottom: m.bottom * scale,
        }}
      />

      {/* Capa interactiva: cuando hay una herramienta de dibujo activa (pluma, borrador,
           timbre o viñeta) los elementos se vuelven transparentes al puntero para que los
           trazos / tramas / marquee atraviesen las viñetas sin que estas los capturen. */}
      <div className={tool !== 'select' ? 'pointer-events-none' : ''}>
        {/* Imágenes libres (fondos, a sangre) */}
        {page.images.map((img) => (
          <PlacedImageItem
            key={img.id}
            img={img}
            scale={scale}
            bounds={{ w: W, h: H }}
            selected={selection?.kind === 'image' && selection.id === img.id}
            onSelect={() => onSelect({ kind: 'image', id: img.id })}
            onChange={(patch) => onChangeImage(img.id, patch)}
          />
        ))}

        {/* Viñetas */}
        {page.panels.map((panel) => (
          <PanelItem
            key={panel.id}
            panel={panel}
            scale={scale}
            pageW={W}
            pageH={H}
            selection={selection}
            deformMode={panelDeformMode && selection?.kind === 'panel' && selection.id === panel.id}
            onSelect={onSelect}
            onChangePanel={(patch) => onChangePanel(panel.id, patch)}
            onChangeImage={(imgId, patch) => onChangeImage(imgId, patch)}
            onShiftImages={(dx, dy) => onShiftPanelImages(panel.id, dx, dy)}
            onToggleDeform={onTogglePanelDeform}
          />
        ))}

        {/* Timbres de trama */}
        {stamps.length > 0 && (
          <svg
            width={W * scale}
            height={H * scale}
            viewBox={`0 0 ${W * scale} ${H * scale}`}
            className="pointer-events-none absolute inset-0"
          >
            <defs>
              <pattern id="st-dots" patternUnits="userSpaceOnUse" width={4 * scale} height={4 * scale}>
                <circle cx={2 * scale} cy={2 * scale} r={0.75 * scale} fill="#141414" />
              </pattern>
              <pattern id="st-dotsDense" patternUnits="userSpaceOnUse" width={2.6 * scale} height={2.6 * scale}>
                <circle cx={1.3 * scale} cy={1.3 * scale} r={0.85 * scale} fill="#141414" />
              </pattern>
              <pattern id="st-dashes" patternUnits="userSpaceOnUse" width={5 * scale} height={5 * scale}>
                <path d={`M0,${5 * scale} L${5 * scale},0`} stroke="#141414" strokeWidth={0.8 * scale} />
              </pattern>
            <pattern id="st-crosshatch" patternUnits="userSpaceOnUse" width={4.5 * scale} height={4.5 * scale}>
              <path d={`M0,${4.5 * scale} L${4.5 * scale},0 M0,0 L${4.5 * scale},${4.5 * scale}`} stroke="#141414" strokeWidth={0.6 * scale} />
            </pattern>
            <pattern id="st-linesV" patternUnits="userSpaceOnUse" width={3 * scale} height={6 * scale}>
              <line x1={1.5 * scale} y1={0} x2={1.5 * scale} y2={6 * scale} stroke="#141414" strokeWidth={0.45 * scale} />
            </pattern>
            <pattern id="st-linesH" patternUnits="userSpaceOnUse" width={6 * scale} height={3 * scale}>
              <line x1={0} y1={1.5 * scale} x2={6 * scale} y2={1.5 * scale} stroke="#141414" strokeWidth={0.45 * scale} />
            </pattern>
            <pattern id="st-stars" patternUnits="userSpaceOnUse" width={7 * scale} height={7 * scale}>
              <path d={`M${3.5 * scale},${1 * scale} Q${3.8 * scale},${3.5 * scale} ${6 * scale},${3.5 * scale} Q${3.8 * scale},${3.8 * scale} ${3.5 * scale},${6 * scale} Q${3.2 * scale},${3.8 * scale} ${1 * scale},${3.5 * scale} Q${3.2 * scale},${3.2 * scale} Z`} fill="#141414" />
            </pattern>
            <pattern id="st-bricks" patternUnits="userSpaceOnUse" width={7 * scale} height={4.5 * scale}>
              <rect x={0.3 * scale} y={0.3 * scale} width={3.1 * scale} height={1.8 * scale} fill="none" stroke="#141414" strokeWidth={0.5 * scale} />
              <rect x={3.7 * scale} y={2.5 * scale} width={3.1 * scale} height={1.8 * scale} fill="none" stroke="#141414" strokeWidth={0.5 * scale} />
              <rect x={-3.3 * scale} y={2.5 * scale} width={3.1 * scale} height={1.8 * scale} fill="none" stroke="#141414" strokeWidth={0.5 * scale} />
            </pattern>
            </defs>
            {stamps.map((stamp) => (
              <circle
                key={stamp.id}
                cx={stamp.x * scale}
                cy={stamp.y * scale}
                r={(stamp.size / 2) * scale}
                fill={`url(#st-${stamp.pattern})`}
              />
            ))}
          </svg>
        )}

        {/* Trazos a mano alzada */}
        <svg
          width={W * scale}
          height={H * scale}
          viewBox={`0 0 ${W * scale} ${H * scale}`}
          className="pointer-events-none absolute inset-0"
        >
          {strokes.map((stroke) => (
            <polyline
              key={stroke.id}
              points={stroke.points.map((p) => (p * scale).toFixed(2)).join(' ')}
              fill="none"
              stroke={stroke.color}
              strokeWidth={stroke.width * scale}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {penPreview && penPreview.length >= 4 && (
            <polyline
              points={penPreview.map((p) => (p * scale).toFixed(2)).join(' ')}
              fill="none"
              stroke={penColor}
              strokeWidth={penWidth * scale}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.7}
            />
          )}
        </svg>

        {/* Globos de diálogo */}
        {page.balloons.map((balloon) => (
          <BalloonItem
            key={balloon.id}
            balloon={balloon}
            scale={scale}
            pageW={W}
            pageH={H}
            selected={selection?.kind === 'balloon' && selection.id === balloon.id}
            editing={editingBalloonId === balloon.id}
            onSelect={() => onSelect({ kind: 'balloon', id: balloon.id })}
            onChange={(patch) => onChangeBalloon(balloon.id, patch)}
            onEditStart={() => onEditBalloon(balloon.id)}
            onEditEnd={() => onEditBalloon(null)}
          />
        ))}

        {/* Onomatopeyas (capa superior) */}
        {sfxList.map((sfx) => (
          <SfxItem
            key={sfx.id}
            sfx={sfx}
            scale={scale}
            pageW={W}
            pageH={H}
            selected={selection?.kind === 'sfx' && selection.id === sfx.id}
            editing={editingSfxId === sfx.id}
            onSelect={() => onSelect({ kind: 'sfx', id: sfx.id })}
            onChange={(patch) => onChangeSfx(sfx.id, patch)}
            onEditStart={() => onEditSfx(sfx.id)}
            onEditEnd={() => onEditSfx(null)}
          />
        ))}
      </div>

      {/* Marquee de dibujo de viñeta */}
      {marquee && (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-indigo-500 bg-indigo-500/10"
          style={{
            left: marquee.x * scale,
            top: marquee.y * scale,
            width: marquee.w * scale,
            height: marquee.h * scale,
          }}
        />
      )}

      {/* Estado vacío de la página */}
      {isEmpty && !isDragOver && tool === 'select' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center text-neutral-300">
            <Images size={36} />
            <p className="mt-2 max-w-60 text-center text-xs leading-relaxed">
              Página en blanco. Dibuja viñetas, coloca escenarios y personajes desde la biblioteca,
              o añade imágenes y globos.
            </p>
          </div>
        </div>
      )}

      {/* Overlay de arrastre de archivos */}
      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-indigo-500/10 ring-4 ring-inset ring-indigo-500/50">
          <span className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow">
            Suelta sobre una viñeta o sobre la página
          </span>
        </div>
      )}
    </div>
  )
}
