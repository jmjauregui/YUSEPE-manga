import type { CharacterConfig } from '../../../shared/types'

const INK = '#141414'

export const SKIN_COLORS = ['#ffe3c9', '#f7cda3', '#e0aa76', '#b07a4b', '#7c4f2a']
export const HAIR_COLORS = ['#2b2622', '#5b3a24', '#8c5a2b', '#d9a441', '#b5542c', '#e8e4dd', '#3d5a99']

export const FACE_SHAPES: { id: CharacterConfig['faceShape']; label: string }[] = [
  { id: 'round', label: 'Redonda' },
  { id: 'oval', label: 'Ovalada' },
  { id: 'square', label: 'Cuadrada' },
]
export const HAIR_STYLES: { id: CharacterConfig['hairStyle']; label: string }[] = [
  { id: 'short', label: 'Corto' },
  { id: 'spiky', label: 'Puntas' },
  { id: 'long', label: 'Largo' },
  { id: 'bob', label: 'Bob' },
  { id: 'ponytail', label: 'Coleta' },
  { id: 'bald', label: 'Calvo' },
]
export const EYE_STYLES: { id: CharacterConfig['eyeStyle']; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'big', label: 'Grandes' },
  { id: 'narrow', label: 'Entrecerrados' },
]
export const EXPRESSIONS: { id: CharacterConfig['expression']; label: string }[] = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'happy', label: 'Feliz' },
  { id: 'angry', label: 'Enojado' },
  { id: 'surprised', label: 'Sorprendido' },
  { id: 'sad', label: 'Triste' },
]

export const DEFAULT_CHARACTER: CharacterConfig = {
  faceShape: 'round',
  skin: SKIN_COLORS[1],
  hairStyle: 'short',
  hairColor: HAIR_COLORS[0],
  eyeStyle: 'normal',
  expression: 'neutral',
}

function FacePath({ shape, skin }: { shape: CharacterConfig['faceShape']; skin: string }) {
  const common = { fill: skin, stroke: INK, strokeWidth: 2.2, strokeLinejoin: 'round' as const }
  if (shape === 'oval') return <ellipse cx="50" cy="54" rx="24" ry="30" {...common} />
  if (shape === 'square')
    return (
      <path
        d="M28,44 Q28,26 50,26 Q72,26 72,44 L70,62 Q67,80 50,80 Q33,80 30,62 Z"
        {...common}
      />
    )
  return <ellipse cx="50" cy="52" rx="27" ry="29" {...common} />
}

function HairBack({ style, color }: { style: CharacterConfig['hairStyle']; color: string }) {
  const common = { fill: color, stroke: INK, strokeWidth: 2.2, strokeLinejoin: 'round' as const }
  if (style === 'long')
    return <path d="M24,52 Q16,18 50,16 Q84,18 76,52 L80,96 Q70,102 64,94 L64,60 Q58,40 50,38 Q42,40 36,60 L36,94 Q30,102 20,96 Z" {...common} />
  if (style === 'ponytail')
    return <path d="M72,38 Q92,42 88,68 Q84,86 72,84 Q80,68 72,52 Z" {...common} />
  return null
}

function HairTop({ style, color }: { style: CharacterConfig['hairStyle']; color: string }) {
  const common = { fill: color, stroke: INK, strokeWidth: 2.2, strokeLinejoin: 'round' as const }
  switch (style) {
    case 'short':
      return <path d="M25,54 Q17,20 50,18 Q83,20 75,54 Q73,36 63,31 Q65,41 58,34 Q50,25 42,31 Q36,28 34,40 Q28,42 25,54 Z" {...common} />
    case 'spiky':
      return <path d="M25,54 L17,34 L28,38 L26,18 L39,30 L43,12 L52,26 L62,10 L64,28 L79,20 L72,38 L82,36 L75,54 Q71,40 64,42 Q66,33 57,35 Q49,26 41,33 Q33,31 33,42 Q27,44 25,54 Z" {...common} />
    case 'long':
      return <path d="M25,52 Q21,24 50,22 Q79,24 75,52 Q68,36 59,37 L61,45 Q50,31 41,39 L39,35 Q31,40 25,52 Z" {...common} />
    case 'bob':
      return <path d="M24,54 Q16,18 50,16 Q84,18 76,54 L75,74 Q69,82 63,75 L65,54 Q61,38 50,36 Q39,38 35,54 L37,75 Q31,82 25,74 Z" {...common} />
    case 'ponytail':
      return <path d="M25,54 Q17,20 50,18 Q83,20 75,54 Q73,36 63,31 Q65,41 58,34 Q50,25 42,31 Q36,28 34,40 Q28,42 25,54 Z" {...common} />
    default:
      return null
  }
}

function Eyes({ style, expression }: { style: CharacterConfig['eyeStyle']; expression: CharacterConfig['expression'] }) {
  if (expression === 'happy' && style !== 'big') {
    // Ojos cerrados de alegría
    return (
      <g stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round">
        <path d="M34,53 Q39,48 44,53" />
        <path d="M56,53 Q61,48 66,53" />
      </g>
    )
  }
  if (style === 'narrow') {
    return (
      <g stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round">
        <path d="M34,52 Q39,49.5 44,52" />
        <path d="M56,52 Q61,49.5 66,52" />
        <circle cx="39" cy="54.5" r="1.6" fill={INK} stroke="none" />
        <circle cx="61" cy="54.5" r="1.6" fill={INK} stroke="none" />
      </g>
    )
  }
  const big = style === 'big'
  const rx = big ? 6 : 5
  const ry = big ? 6.5 : 3.8
  const iris = big ? 3 : 2.1
  return (
    <g>
      <ellipse cx="39" cy="53" rx={rx} ry={ry} fill="#fff" stroke={INK} strokeWidth={2} />
      <ellipse cx="61" cy="53" rx={rx} ry={ry} fill="#fff" stroke={INK} strokeWidth={2} />
      <circle cx="39" cy="54" r={iris} fill={INK} />
      <circle cx="61" cy="54" r={iris} fill={INK} />
      {big && (
        <>
          <circle cx="40.2" cy="52.6" r="1" fill="#fff" />
          <circle cx="62.2" cy="52.6" r="1" fill="#fff" />
        </>
      )}
    </g>
  )
}

function Brows({ expression }: { expression: CharacterConfig['expression'] }) {
  const common = { stroke: INK, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const }
  switch (expression) {
    case 'angry':
      return (
        <g {...common}>
          <path d="M33,41 L45,45.5" />
          <path d="M67,41 L55,45.5" />
        </g>
      )
    case 'surprised':
      return (
        <g {...common}>
          <path d="M34,40 Q39,37.5 44,40" />
          <path d="M56,40 Q61,37.5 66,40" />
        </g>
      )
    case 'sad':
      return (
        <g {...common}>
          <path d="M34,45.5 Q39,42 44,41" />
          <path d="M66,45.5 Q61,42 56,41" />
        </g>
      )
    case 'happy':
      return (
        <g {...common}>
          <path d="M34,42 Q39,40 44,42" />
          <path d="M56,42 Q61,40 66,42" />
        </g>
      )
    default:
      return (
        <g {...common}>
          <path d="M34,43 Q39,42 44,43" />
          <path d="M56,43 Q61,42 66,43" />
        </g>
      )
  }
}

function Mouth({ expression }: { expression: CharacterConfig['expression'] }) {
  const line = { stroke: INK, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' as const }
  switch (expression) {
    case 'happy':
      return <path d="M42,65 Q50,76 58,65 Z" fill={INK} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
    case 'angry':
      return <path d="M42,70 Q50,65 58,70" {...line} />
    case 'surprised':
      return <ellipse cx="50" cy="68" rx="4.2" ry="5.4" fill={INK} />
    case 'sad':
      return <path d="M43,69 Q50,64.5 57,69" {...line} />
    default:
      return <path d="M44,66 Q50,67.2 56,66" {...line} />
  }
}

/** Contenido del retrato (sin el <svg> contenedor) — útil para componer en otros SVG. */
export function FaceContent({ config }: { config: CharacterConfig }) {
  return (
    <>
      {/* Hombros */}
      <path
        d="M50,84 C40,84 37,90 28,93 C17,97 13,103 13,112 L87,112 C87,103 83,97 72,93 C63,90 60,84 50,84 Z"
        fill={config.skin}
        stroke={INK}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <HairBack style={config.hairStyle} color={config.hairColor} />
      <FacePath shape={config.faceShape} skin={config.skin} />
      <HairTop style={config.hairStyle} color={config.hairColor} />
      <Brows expression={config.expression} />
      <Eyes style={config.eyeStyle} expression={config.expression} />
      <path d="M49,59 Q50,61.5 51.5,61" stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Mouth expression={config.expression} />
    </>
  )
}

/** Retrato paramétrico del personaje (SVG 0 0 100 100). */
export default function CharacterFace({ config }: { config: CharacterConfig }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <FaceContent config={config} />
    </svg>
  )
}
