import type { PlacedImage } from '../../../shared/types'
import { assetUrl } from '../lib/units'
import { PREFAB_MAP, isPrefabSrc, prefabIdFromSrc } from '../lib/prefabs'
import CharacterFace from './CharacterFace'

/**
 * Contenido visual de una imagen colocada, según su origen:
 * - `character` presente → retrato paramétrico del personaje
 * - `src` "prefab:<id>"  → arte vectorial del constructor de escenarios
 * - resto                → imagen importada (asset del proyecto)
 */
export default function PlacedImageContent({ img }: { img: PlacedImage }) {
  if (img.character) {
    return (
      <div className="pointer-events-none h-full w-full bg-white">
        <CharacterFace config={img.character} />
      </div>
    )
  }
  if (isPrefabSrc(img.src)) {
    const prefab = PREFAB_MAP.get(prefabIdFromSrc(img.src))
    if (prefab) {
      return (
        <svg viewBox="0 0 100 100" className="pointer-events-none h-full w-full" preserveAspectRatio="xMidYMid meet">
          {prefab.art}
        </svg>
      )
    }
  }
  return (
    <img
      src={assetUrl(img.src)}
      alt=""
      draggable={false}
      className="pointer-events-none h-full w-full object-fill"
    />
  )
}
