import type { ReactNode } from 'react'

export interface Prefab {
  id: string
  label: string
  category: 'Naturaleza' | 'Ciudad'
  /** Arte SVG en viewBox 0 0 100 100 (línea estilo manga) */
  art: ReactNode
}

const INK = '#141414'
const S = { stroke: INK, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/**
 * Elementos prefabricados del constructor de escenarios.
 * Se dibujan como arte lineal SVG y se colocan como PlacedImage con src "prefab:<id>".
 */
export const PREFABS: Prefab[] = [
  // ------------------------------- Naturaleza -------------------------------
  {
    id: 'tree',
    label: 'Árbol',
    category: 'Naturaleza',
    art: (
      <g {...S} fill="#fff">
        <path d="M44,95 L44,58 L56,58 L56,95 Z" />
        <circle cx="33" cy="44" r="17" />
        <circle cx="67" cy="44" r="17" />
        <circle cx="50" cy="28" r="19" />
      </g>
    ),
  },
  {
    id: 'pine',
    label: 'Pino',
    category: 'Naturaleza',
    art: (
      <g {...S} fill="#fff">
        <path d="M45,95 L45,82 L55,82 L55,95 Z" />
        <path d="M50,6 L27,40 L73,40 Z" />
        <path d="M50,26 L23,64 L77,64 Z" />
        <path d="M50,48 L19,86 L81,86 Z" />
      </g>
    ),
  },
  {
    id: 'bush',
    label: 'Arbusto',
    category: 'Naturaleza',
    art: (
      <g {...S} fill="#fff">
        <path d="M14,88 Q8,64 28,60 Q33,46 50,50 Q67,44 72,60 Q92,62 86,88 Z" />
        <path d="M30,72 Q40,66 50,72" fill="none" />
        <path d="M55,78 Q65,72 74,78" fill="none" />
      </g>
    ),
  },
  {
    id: 'rock',
    label: 'Piedra',
    category: 'Naturaleza',
    art: (
      <g {...S} fill="#fff">
        <path d="M18,84 L10,62 L30,44 L60,42 L84,60 L78,84 Z" />
        <path d="M30,44 L44,62 L60,42" fill="none" />
      </g>
    ),
  },
  {
    id: 'rocks',
    label: 'Piedras',
    category: 'Naturaleza',
    art: (
      <g {...S} fill="#fff">
        <path d="M8,86 L14,70 L34,64 L46,76 L42,86 Z" />
        <path d="M48,86 L52,66 L74,58 L90,72 L86,86 Z" />
      </g>
    ),
  },
  {
    id: 'cloud',
    label: 'Nube',
    category: 'Naturaleza',
    art: (
      <g {...S} fill="#fff">
        <path d="M22,72 Q6,72 9,59 Q12,48 25,48 Q29,33 45,36 Q59,27 69,40 Q85,40 83,55 Q94,59 87,69 Q84,72 78,72 Z" />
      </g>
    ),
  },
  {
    id: 'mountain',
    label: 'Montaña',
    category: 'Naturaleza',
    art: (
      <g {...S} fill="#fff">
        <path d="M6,90 L38,28 L58,62 L70,44 L94,90 Z" />
        <path d="M30,42 L38,28 L46,42 L41,49 L36,44 Z" />
      </g>
    ),
  },
  {
    id: 'sun',
    label: 'Sol',
    category: 'Naturaleza',
    art: (
      <g {...S} fill="#fff">
        <circle cx="50" cy="48" r="17" />
        <path d="M50,18 L50,10 M50,86 L50,78 M20,48 L12,48 M88,48 L80,48 M29,27 L23,21 M77,75 L71,69 M29,69 L23,75 M77,21 L71,27" fill="none" />
      </g>
    ),
  },
  // --------------------------------- Ciudad ---------------------------------
  {
    id: 'building',
    label: 'Edificio',
    category: 'Ciudad',
    art: (
      <g {...S} fill="#fff">
        <path d="M24,92 L24,18 L76,18 L76,92 Z" />
        <path d="M34,28 L42,28 L42,36 L34,36 Z M49,28 L57,28 L57,36 L49,36 Z M64,28 L72,28 L72,36 L64,36 Z" />
        <path d="M34,44 L42,44 L42,52 L34,52 Z M49,44 L57,44 L57,52 L49,52 Z M64,44 L72,44 L72,52 L64,52 Z" />
        <path d="M34,60 L42,60 L42,68 L34,68 Z M64,60 L72,60 L72,68 L64,68 Z" />
        <path d="M45,92 L45,72 L59,72 L59,92 Z" />
      </g>
    ),
  },
  {
    id: 'tower',
    label: 'Torre',
    category: 'Ciudad',
    art: (
      <g {...S} fill="#fff">
        <path d="M34,94 L34,12 L66,12 L66,94 Z" />
        <path d="M50,12 L50,2 M46,6 L54,6" fill="none" />
        <path d="M41,20 L46,20 L46,25 L41,25 Z M54,20 L59,20 L59,25 L54,25 Z M41,33 L46,33 L46,38 L41,38 Z M54,33 L59,33 L59,38 L54,38 Z M41,46 L46,46 L46,51 L41,51 Z M54,46 L59,46 L59,51 L54,51 Z M41,59 L46,59 L46,64 L41,64 Z M54,59 L59,59 L59,64 L54,64 Z M41,72 L46,72 L46,77 L41,77 Z M54,72 L59,72 L59,77 L54,77 Z" />
      </g>
    ),
  },
  {
    id: 'house',
    label: 'Casa',
    category: 'Ciudad',
    art: (
      <g {...S} fill="#fff">
        <path d="M22,92 L22,48 L78,48 L78,92 Z" />
        <path d="M12,50 L50,16 L88,50 Z" />
        <path d="M44,92 L44,68 L58,68 L58,92 Z" />
        <path d="M28,58 L38,58 L38,68 L28,68 Z M62,58 L72,58 L72,68 L62,68 Z" />
      </g>
    ),
  },
  {
    id: 'stairs',
    label: 'Escaleras',
    category: 'Ciudad',
    art: (
      <g {...S} fill="none">
        <path d="M14,88 L14,72 L30,72 L30,56 L46,56 L46,40 L62,40 L62,24 L78,24 L78,8" />
        <path d="M14,88 L88,88" />
        <path d="M20,60 L80,0" />
      </g>
    ),
  },
  {
    id: 'lamp',
    label: 'Farola',
    category: 'Ciudad',
    art: (
      <g {...S} fill="#fff">
        <path d="M46,94 L46,26 L54,26 L54,94 Z" />
        <path d="M58,12 L72,12 L68,26 L62,26 Z" />
        <path d="M50,26 Q50,12 62,12" fill="none" />
        <path d="M60,34 L56,30 M68,36 L68,31 M76,34 L80,30" fill="none" />
      </g>
    ),
  },
  {
    id: 'fence',
    label: 'Valla',
    category: 'Ciudad',
    art: (
      <g {...S} fill="#fff">
        <path d="M17,92 L17,38 L23,38 L23,92 Z M37,92 L37,38 L43,38 L43,92 Z M57,92 L57,38 L63,38 L63,92 Z M77,92 L77,38 L83,38 L83,92 Z" />
        <path d="M10,52 L90,52 L90,58 L10,58 Z M10,70 L90,70 L90,76 L10,76 Z" />
      </g>
    ),
  },
]

export const PREFAB_MAP = new Map(PREFABS.map((p) => [p.id, p]))

export function isPrefabSrc(src: string): boolean {
  return src.startsWith('prefab:')
}

export function prefabIdFromSrc(src: string): string {
  return src.slice('prefab:'.length)
}
