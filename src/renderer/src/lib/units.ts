import type { PageMargins, PageSetup, Panel, PanelPoint } from '../../../shared/types'

/** Resolución base del editor: píxeles por milímetro a zoom 100% */
export const PX_PER_MM = 3

export interface PagePreset {
  id: string
  label: string
  width: number
  height: number
  description: string
}

export const PAGE_PRESETS: PagePreset[] = [
  {
    id: 'b5',
    label: 'B5 · Tankōbon',
    width: 182,
    height: 257,
    description: 'El formato clásico del manga japonés',
  },
  {
    id: 'a5',
    label: 'A5',
    width: 148,
    height: 210,
    description: 'Compacto, muy usado en doujinshi',
  },
  {
    id: 'a4',
    label: 'A4',
    width: 210,
    height: 297,
    description: 'Estándar para impresión casera',
  },
  {
    id: 'us',
    label: 'US Comic',
    width: 168,
    height: 260,
    description: 'Formato del cómic americano',
  },
  {
    id: 'custom',
    label: 'Personalizado',
    width: 182,
    height: 257,
    description: 'Define tus propias dimensiones',
  },
]

export const DEFAULT_MARGINS: PageMargins = { top: 20, right: 15, bottom: 20, left: 15 }

export function uuid(): string {
  return crypto.randomUUID()
}

/** URL servida por el protocolo ymg:// del proceso main */
export function assetUrl(relPath: string): string {
  return `ymg://project/${relPath.split('/').map(encodeURIComponent).join('/')}`
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Caja útil de la página: el área dentro de los márgenes (en mm) */
export function marginsBox(setup: PageSetup): Box {
  const { width, height, margins } = setup
  return {
    x: margins.left,
    y: margins.top,
    w: Math.max(0, width - margins.left - margins.right),
    h: Math.max(0, height - margins.top - margins.bottom),
  }
}

/** Rectángulo (mm) que encaja una imagen de proporción `ratio` dentro de una caja, centrado. */
export function fitIntoBox(ratio: number, box: Box): Box {
  let w = box.w
  let h = w / ratio
  if (h > box.h) {
    h = box.h
    w = h * ratio
  }
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h }
}

/** Carga una imagen y devuelve sus dimensiones naturales (fallback 4:3 si falla). */
export function loadImageSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth || 4, h: img.naturalHeight || 3 })
    img.onerror = () => resolve({ w: 4, h: 3 })
    img.src = url
  })
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    )
  } catch {
    return iso
  }
}

/** Fuentes japonesas de Google Fonts disponibles para globos y onomatopeyas */
export const MANGA_FONTS: { id: string; label: string; family: string }[] = [
  { id: 'noto', label: 'Noto Sans JP', family: "'Noto Sans JP', sans-serif" },
  { id: 'rampart', label: 'Rampart One', family: "'Rampart One', cursive" },
  { id: 'yomogi', label: 'Yomogi', family: "'Yomogi', cursive" },
  { id: 'reggae', label: 'Reggae One', family: "'Reggae One', cursive" },
  { id: 'mochiy', label: 'Mochiy Pop One', family: "'Mochiy Pop One', sans-serif" },
  { id: 'potta', label: 'Potta One', family: "'Potta One', cursive" },
  { id: 'yuji', label: 'Yuji Mai', family: "'Yuji Mai', serif" },
  { id: 'chalkboard', label: 'Manuscrita', family: "'Chalkboard SE', 'Segoe Print', 'Comic Sans MS', cursive" },
  { id: 'impact', label: 'Impacto', family: "Impact, 'Arial Black', sans-serif" },
]
export const DEFAULT_BALLOON_FONT = MANGA_FONTS[0].family

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// ---------------------------------------------------------------------------
// Viñetas y globos
// ---------------------------------------------------------------------------

/** Tamaño mínimo de una viñeta (mm) */
export const MIN_PANEL_MM = 15
/** Separación entre viñetas al dividirlas (mm) */
export const GUTTER_MM = 3
/** Grosor del borde de viñetas y globos (mm) */
export const STROKE_MM = 0.55
/** Tamaño mínimo de un globo (mm) */
export const MIN_BALLOON_MM = { w: 18, h: 12 }
/** Tamaño de fuente por defecto de los globos (mm) */
export const DEFAULT_BALLOON_FONT_MM = 4.2
export const MIN_BALLOON_FONT_MM = 2.5
export const MAX_BALLOON_FONT_MM = 9

/** Tamaños disponibles de timbre (mm de diámetro) */
export const STAMP_SIZES_MM = [10, 16, 24]
export const DEFAULT_STAMP_SIZE_MM = 16
/** Distancia entre timbres al arrastrar (mm) */
export const STAMP_SPACING_MM = 7

/** Onomatopeyas */
export const DEFAULT_SFX_FONT_MM = 12
export const MIN_SFX_FONT_MM = 5
export const MAX_SFX_FONT_MM = 40

/** Grosores de pluma disponibles (mm) */
export const PEN_WIDTHS_MM = [0.4, 0.8, 1.6]
/** Colores de pluma */
export const PEN_COLORS = ['#141414', '#ffffff', '#6b7280']

/** Vértices por defecto de una viñeta rectangular (relativos a su bounding box) */
export function defaultCorners(w: number, h: number): Panel['corners'] {
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ]
}

/** Vértices de una viñeta con fallback al rectángulo (datos antiguos) */
export function panelCorners(panel: Panel): Panel['corners'] {
  return panel.corners ?? defaultCorners(panel.w, panel.h)
}

/**
 * Comprueba que 4 puntos forman un cuadrilátero convexo (sin aristas cruzadas).
 * Se usa como guardarraíl al deformar viñetas: evita polígonos imposibles.
 */
export function isConvexQuad(pts: PanelPoint[]): boolean {
  let sign = 0
  for (let i = 0; i < 4; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % 4]
    const c = pts[(i + 2) % 4]
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (Math.abs(cross) < 1e-9) continue
    const s = Math.sign(cross)
    if (sign === 0) sign = s
    else if (s !== sign) return false
  }
  return true
}
