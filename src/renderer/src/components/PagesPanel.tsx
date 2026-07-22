import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import type { MangaPage, PageSetup } from '../../../shared/types'
import { assetUrl, panelCorners } from '../lib/units'
import PlacedImageContent from './PlacedImageContent'

interface PagesPanelProps {
  pages: MangaPage[]
  setup: PageSetup
  selectedPageId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onMove: (id: string, direction: -1 | 1) => void
  onDelete: (id: string) => void
}

const THUMB_WIDTH = 108 // px

export default function PagesPanel({
  pages,
  setup,
  selectedPageId,
  onSelect,
  onAdd,
  onMove,
  onDelete,
}: PagesPanelProps) {
  const scale = THUMB_WIDTH / setup.width
  const thumbHeight = Math.round(setup.height * scale)
  const m = setup.margins

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Páginas · {pages.length}
        </h2>
      </div>

      <div className="px-4">
        <button
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-500 transition hover:border-indigo-400 hover:text-indigo-600"
        >
          <Plus size={14} />
          Añadir página
        </button>
      </div>

      <div className="mt-3 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {pages.map((page, index) => {
          const selected = page.id === selectedPageId
          return (
            <div
              key={page.id}
              onClick={() => onSelect(page.id)}
              className={`group relative cursor-pointer rounded-lg p-1.5 transition ${
                selected ? 'bg-indigo-50 ring-2 ring-indigo-500' : 'hover:bg-neutral-100'
              }`}
            >
              {/* Acciones al pasar el ratón */}
              <div className="absolute -right-1.5 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-0.5 group-hover:flex">
                <button
                  title="Subir página"
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMove(page.id, -1)
                  }}
                  className="rounded-md border border-neutral-200 bg-white p-1 text-neutral-500 shadow-sm transition hover:text-indigo-600 disabled:opacity-30"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  title="Bajar página"
                  disabled={index === pages.length - 1}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMove(page.id, 1)
                  }}
                  className="rounded-md border border-neutral-200 bg-white p-1 text-neutral-500 shadow-sm transition hover:text-indigo-600 disabled:opacity-30"
                >
                  <ChevronDown size={13} />
                </button>
                <button
                  title="Eliminar página"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(page.id)
                  }}
                  className="rounded-md border border-neutral-200 bg-white p-1 text-neutral-500 shadow-sm transition hover:text-red-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Miniatura */}
              <div
                className="relative mx-auto overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-neutral-200"
                style={{ width: THUMB_WIDTH, height: thumbHeight }}
              >
                <div
                  className="absolute border border-dashed border-indigo-300/70"
                  style={{
                    left: m.left * scale,
                    top: m.top * scale,
                    right: m.right * scale,
                    bottom: m.bottom * scale,
                  }}
                />

                {/* Imágenes libres */}
                {page.images.map((img) => (
                  <div
                    key={img.id}
                    className="absolute"
                    style={{
                      left: img.x * scale,
                      top: img.y * scale,
                      width: img.w * scale,
                      height: img.h * scale,
                    }}
                  >
                    <PlacedImageContent img={img} />
                  </div>
                ))}

                {/* Viñetas con su contenido */}
                {page.panels.map((panel) => {
                  const wPx = panel.w * scale
                  const hPx = panel.h * scale
                  const pts = panelCorners(panel)
                    .map((c) => `${(c.x * scale).toFixed(1)},${(c.y * scale).toFixed(1)}`)
                    .join(' ')
                  const clip = `polygon(${panelCorners(panel)
                    .map((c) => `${(c.x * scale).toFixed(1)}px ${(c.y * scale).toFixed(1)}px`)
                    .join(', ')})`
                  return (
                    <div
                      key={panel.id}
                      className="absolute"
                      style={{ left: panel.x * scale, top: panel.y * scale, width: wPx, height: hPx }}
                    >
                      <svg width={wPx} height={hPx} viewBox={`0 0 ${wPx} ${hPx}`} className="absolute inset-0 overflow-visible">
                        {!panel.toneSrc && !panel.background && <polygon points={pts} fill="#fff" />}
                      </svg>
                      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: clip }}>
                        {/* Trama SVG de fondo */}
                        {panel.toneSrc && (
                          <img
                            src={assetUrl(panel.toneSrc)}
                            alt=""
                            className="pointer-events-none absolute inset-0 h-full w-full"
                            style={{ objectFit: 'fill' }}
                            draggable={false}
                          />
                        )}
                        {/* Fondo de IA o background-image */}
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
                          <div
                            key={img.id}
                            className="absolute"
                            style={{
                              left: img.x * scale,
                              top: img.y * scale,
                              width: img.w * scale,
                              height: img.h * scale,
                            }}
                          >
                            <PlacedImageContent img={img} />
                          </div>
                        ))}
                      </div>
                      <svg width={wPx} height={hPx} viewBox={`0 0 ${wPx} ${hPx}`} className="absolute inset-0 overflow-visible">
                        <polygon
                          points={pts}
                          fill="none"
                          stroke="#141414"
                          strokeWidth={Math.max(1, 0.55 * scale)}
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )
                })}

                {/* Timbres y trazos */}
                <svg
                  width={THUMB_WIDTH}
                  height={thumbHeight}
                  viewBox={`0 0 ${THUMB_WIDTH} ${thumbHeight}`}
                  className="absolute inset-0"
                >
                  {(page.stamps ?? []).map((stamp) => (
                    <circle
                      key={stamp.id}
                      cx={stamp.x * scale}
                      cy={stamp.y * scale}
                      r={(stamp.size / 2) * scale}
                      fill="#141414"
                      opacity={0.25}
                    />
                  ))}
                  {(page.strokes ?? []).map((stroke) => (
                    <polyline
                      key={stroke.id}
                      points={stroke.points.map((p) => (p * scale).toFixed(1)).join(' ')}
                      fill="none"
                      stroke={stroke.color}
                      strokeWidth={Math.max(0.5, stroke.width * scale)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </svg>

                {/* Globos (representación simplificada) */}
                {page.balloons.map((balloon) => (
                  <div
                    key={balloon.id}
                    className={`absolute bg-white ${balloon.kind === 'caption' ? '' : 'rounded-[50%]'}`}
                    style={{
                      left: balloon.x * scale,
                      top: balloon.y * scale,
                      width: balloon.w * scale,
                      height: balloon.h * scale,
                      border: `${Math.max(0.75, 0.55 * scale)}px ${balloon.kind === 'thought' ? 'dashed' : 'solid'} #141414`,
                    }}
                  />
                ))}

                {/* Onomatopeyas */}
                {(page.sfx ?? []).map((sfx) => (
                  <span
                    key={sfx.id}
                    className="absolute font-black"
                    style={{
                      left: sfx.x * scale,
                      top: sfx.y * scale,
                      transform: `translate(-50%, -50%) rotate(${sfx.rotation}deg)`,
                      fontSize: Math.max(4, sfx.fontSize * scale),
                      color: sfx.color,
                      fontFamily: 'Impact, "Arial Black", sans-serif',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sfx.text}
                  </span>
                ))}
              </div>

              <div className="mt-1.5 text-center text-xs font-medium text-neutral-600">
                Página {index + 1}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
