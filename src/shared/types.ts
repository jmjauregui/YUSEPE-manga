/**
 * Tipos compartidos entre el proceso main, el preload y el renderer.
 *
 * Un proyecto YUSEPE manga es una carpeta en disco con esta estructura:
 *
 *   MiProyecto/
 *   ├── project.ymanga   (JSON con la definición del proyecto)
 *   └── assets/          (imágenes y recursos copiados dentro del proyecto)
 *
 * El archivo .ymanga referencia los assets mediante rutas relativas
 * (p. ej. "assets/mi-imagen.png"), que actúan como enlaces simbólicos
 * internos del proyecto.
 */

/** Márgenes de página en milímetros */
export interface PageMargins {
  top: number
  right: number
  bottom: number
  left: number
}

/** Configuración de página del proyecto (dimensiones en milímetros) */
export interface PageSetup {
  presetId: string
  width: number
  height: number
  margins: PageMargins
}

/** Configuración paramétrica de un personaje (constructor de personajes) */
export interface CharacterConfig {
  faceShape: 'round' | 'oval' | 'square'
  skin: string
  hairStyle: 'short' | 'spiky' | 'long' | 'bob' | 'ponytail' | 'bald'
  hairColor: string
  eyeStyle: 'normal' | 'big' | 'narrow'
  expression: 'neutral' | 'happy' | 'angry' | 'surprised' | 'sad'
}

/** Personaje guardado del proyecto (nombre + configuración) */
export interface Character {
  id: string
  name: string
  config: CharacterConfig
}

/** Elemento personalizado de la biblioteca (imagen importada por el usuario) */
export interface LibraryItem {
  id: string
  name: string
  /** Ruta relativa al asset, p. ej. "assets/mi-arbol.png" */
  src: string
}

/** Imagen colocada en una página o dentro de una viñeta. Posición y tamaño en mm
 *  respecto a la esquina superior izquierda de su contenedor (página o viñeta). */
export interface PlacedImage {
  id: string
  /**
   * Ruta relativa al asset ("assets/..."), un prefab de escenario ("prefab:<id>")
   * o "character" cuando es un personaje (ver `character`).
   */
  src: string
  x: number
  y: number
  w: number
  h: number
  /** Copia de la configuración del personaje cuando src === 'character' */
  character?: CharacterConfig
}

/** Punto en mm (coordenadas relativas al bounding box de la viñeta) */
export interface PanelPoint {
  x: number
  y: number
}

/**
 * Viñeta: cuadrilátero con borde que recorta (clip) las imágenes que contiene.
 * `x/y/w/h` describen el bounding box; `corners` son los 4 vértices del
 * cuadrilátero en orden [sup-izq, sup-der, inf-der, inf-izq], relativos al
 * bounding box. Una viñeta rectangular tiene corners = esquinas del bbox.
 */
export interface Panel {
  id: string
  /** Posición y tamaño del bounding box en mm respecto a la página */
  x: number
  y: number
  w: number
  h: number
  corners: [PanelPoint, PanelPoint, PanelPoint, PanelPoint]
  /** Fondo de trama (SVG en assets/tramas_vinetas/), sin espacio para aplicar como patrón repetitivo. undefined = relleno blanco sólido. */
  toneSrc?: string
  /** Fondo de viñeta generado por IA o aplicado manualmente (background-image) */
  background?: PanelBackground
  /** Imágenes dentro de la viñeta; x/y son relativos al origen del bounding box */
  images: PlacedImage[]
}

/** Fondo tipo background-image aplicable a una viñeta */
export interface PanelBackground {
  /** Ruta del asset local (assets/...) */
  src: string
  /** Posición en % (0-100) */
  posX: number
  posY: number
  /** 'cover' | 'contain' | porcentaje manual (número) */
  size: 'cover' | 'contain' | number
  repeat: boolean
  /** Metadatos de IA (opcional) */
  aiPrompt?: string
  aiGeneratedPrompt?: string
  aiSeed?: number
}

/** Imagen generada por IA guardada en la biblioteca del proyecto */
export interface AILibraryItem {
  id: string
  /** Prompt original escrito por el usuario */
  prompt: string
  /** Prompt final construido por el servicio */
  generatedPrompt: string
  date: string
  width: number
  height: number
  seed: number
  /** URL remota de Pollinations */
  url: string
  /** Ruta local (assets/...) si se descargó */
  localSrc?: string
}

export type BalloonKind = 'speech' | 'thought' | 'shout' | 'caption'

/** Globo de diálogo. Posición y tamaño en mm respecto a la página. */
export interface Balloon {
  id: string
  kind: BalloonKind
  x: number
  y: number
  w: number
  h: number
  text: string
  /** Tamaño de fuente en mm */
  fontSize: number
  /** Familia tipográfica (Google Font o del sistema). undefined = hereda balloon-font */
  fontFamily?: string
  /** Tamaño de sombra en mm (0 = sin sombra) */
  shadow?: number
  /** Estilo de borde para cartelas (ignorado en otros tipos) */
  captionStyle?: 'solid' | 'rounded' | 'double' | 'none'
  /** Punta de la cola (mm, coordenadas de página). null = sin cola (cartelas) */
  tail: { x: number; y: number } | null
}

/** Trazo de dibujo a mano alzada (coords de página en mm, aplanadas x1,y1,x2,y2,...) */
export interface Stroke {
  id: string
  points: number[]
  color: string
  /** Grosor en mm */
  width: number
}

export type StampPattern = 'dots' | 'dotsDense' | 'dashes' | 'crosshatch' | 'linesV' | 'linesH' | 'stars' | 'bricks'

/** Timbre de trama/screentone: círculo estampado con un patrón */
export interface Stamp {
  id: string
  pattern: StampPattern
  /** Centro en mm (coords de página) */
  x: number
  y: number
  /** Diámetro en mm */
  size: number
}

export type SfxStyle = 'impact' | 'outline' | 'brush'

/** Onomatopeya: texto de efecto de sonido con estilo */
export interface Sfx {
  id: string
  text: string
  /** Centro en mm (coords de página) */
  x: number
  y: number
  /** Tamaño de fuente en mm */
  fontSize: number
  /** Familia tipográfica (Google Font o del sistema) */
  fontFamily?: string
  /** Rotación en grados */
  rotation: number
  style: SfxStyle
  color: string
}

export interface MangaPage {
  id: string
  /** Imágenes libres a nivel de página (fondos, a sangre) */
  images: PlacedImage[]
  panels: Panel[]
  balloons: Balloon[]
  /** Trazos a mano alzada (encima de viñetas e imágenes) */
  strokes: Stroke[]
  /** Timbres de trama (debajo de los trazos) */
  stamps: Stamp[]
  /** Onomatopeyas (capa superior, junto a los globos) */
  sfx: Sfx[]
}

/** Escena de la trama; puede vincularse a una página del proyecto */
export interface StoryScene {
  id: string
  text: string
  pageId: string | null
}

export interface StoryChapter {
  id: string
  title: string
  summary: string
  scenes: StoryScene[]
}

export interface Story {
  premise: string
  chapters: StoryChapter[]
}

/** Selección actual del editor (solo en renderer) */
export type Selection =
  | { kind: 'image'; id: string }
  | { kind: 'panel'; id: string }
  | { kind: 'balloon'; id: string }
  | { kind: 'sfx'; id: string }
  | null

/** Herramienta activa del editor (solo en renderer) */
export type EditorTool = 'select' | 'panel' | 'pen' | 'eraser' | 'stamp'

/** Contenido del archivo .ymanga */
export interface MangaProject {
  version: number
  name: string
  createdAt: string
  page: PageSetup
  pages: MangaPage[]
  /** Constructor de historia */
  story: Story
  /** Personajes guardados del proyecto */
  characters: Character[]
  /** Elementos personalizados de la biblioteca */
  library: LibraryItem[]
  /** Biblioteca de imágenes generadas por IA (Pollinations) */
  aiLibrary: AILibraryItem[]
}

export interface CreateProjectPayload {
  name: string
  folder: string
  page: PageSetup
}

export interface OpenProjectResult {
  project?: MangaProject
  filePath: string
  folder?: string
  error?: 'MISSING' | 'INVALID'
}

export interface RecentProject {
  name: string
  filePath: string
  lastOpened: string
  pageCount?: number
  /** Calculado al listar: true si el archivo .ymanga ya no existe en disco */
  missing?: boolean
}

export interface ImportedAsset {
  fileName: string
  /** Ruta relativa dentro del proyecto, p. ej. "assets/pagina-1.png" */
  relPath: string
}
