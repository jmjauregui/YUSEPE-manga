import { useState } from 'react'
import { ImagePlus, Pencil, Plus, Trash2, Trees, Users, X } from 'lucide-react'
import type { Character, LibraryItem } from '../../../shared/types'
import { PREFABS } from '../lib/prefabs'
import { assetUrl } from '../lib/units'
import CharacterFace from './CharacterFace'

interface LibraryPanelProps {
  characters: Character[]
  library: LibraryItem[]
  onClose: () => void
  onPlacePrefab: (prefabId: string) => void
  onPlaceCharacter: (character: Character) => void
  onNewCharacter: () => void
  onEditCharacter: (character: Character) => void
  onDeleteCharacter: (id: string) => void
  onImportCustom: () => void
  onPlaceCustom: (item: LibraryItem) => void
  onDeleteCustom: (id: string) => void
}

type Tab = 'scenes' | 'characters' | 'custom'

/** Biblioteca: escenarios prefabricados, personajes del proyecto y elementos propios. */
export default function LibraryPanel({
  characters,
  library,
  onClose,
  onPlacePrefab,
  onPlaceCharacter,
  onNewCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onImportCustom,
  onPlaceCustom,
  onDeleteCustom,
}: LibraryPanelProps) {
  const [tab, setTab] = useState<Tab>('scenes')

  const categories = [...new Set(PREFABS.map((p) => p.category))]

  const tabButton = (id: Tab, label: string, Icon: typeof Trees) => (
    <button
      onClick={() => setTab(id)}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition ${
        tab === id ? 'bg-indigo-100 text-indigo-700' : 'text-neutral-500 hover:bg-neutral-100'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  )

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-neutral-200 bg-white">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Biblioteca</h2>
        <button onClick={onClose} className="rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700">
          <X size={15} />
        </button>
      </div>

      <div className="flex gap-1 px-3 pb-2">
        {tabButton('scenes', 'Escenarios', Trees)}
        {tabButton('characters', 'Personajes', Users)}
        {tabButton('custom', 'Míos', ImagePlus)}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* ------------------------- Escenarios prefabricados ------------------------- */}
        {tab === 'scenes' && (
          <div className="space-y-4">
            <p className="px-1 text-xs leading-relaxed text-neutral-400">
              Haz clic para colocar el elemento en la página (o en la viñeta seleccionada).
            </p>
            {categories.map((category) => (
              <div key={category}>
                <h3 className="mb-1.5 px-1 text-xs font-semibold text-neutral-500">{category}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {PREFABS.filter((p) => p.category === category).map((prefab) => (
                    <button
                      key={prefab.id}
                      onClick={() => onPlacePrefab(prefab.id)}
                      title={`Colocar «${prefab.label}»`}
                      className="flex flex-col items-center gap-1 rounded-lg border border-neutral-200 bg-white p-2 transition hover:border-indigo-400 hover:shadow-sm"
                    >
                      <svg viewBox="0 0 100 100" className="h-12 w-12">
                        {prefab.art}
                      </svg>
                      <span className="text-[10px] leading-tight text-neutral-500">{prefab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ------------------------------- Personajes ------------------------------- */}
        {tab === 'characters' && (
          <div className="space-y-3">
            <button
              onClick={onNewCharacter}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-neutral-300 py-2.5 text-xs font-medium text-neutral-500 transition hover:border-indigo-400 hover:text-indigo-600"
            >
              <Plus size={14} />
              Nuevo personaje
            </button>
            {characters.length === 0 && (
              <p className="px-1 text-xs leading-relaxed text-neutral-400">
                Crea personajes con cara, ojos, expresión y cabello. Luego colócalos en tus viñetas
                para componer escenas en segundos.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className="group relative rounded-lg border border-neutral-200 bg-white p-2 transition hover:border-indigo-400 hover:shadow-sm"
                >
                  <button onClick={() => onPlaceCharacter(character)} className="w-full" title={`Colocar a «${character.name}»`}>
                    <div className="mx-auto h-16 w-16">
                      <CharacterFace config={character.config} />
                    </div>
                    <span className="mt-1 block truncate text-center text-xs font-medium text-neutral-700">
                      {character.name}
                    </span>
                  </button>
                  <div className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
                    <button
                      onClick={() => onEditCharacter(character)}
                      title="Editar personaje"
                      className="rounded-md border border-neutral-200 bg-white p-1 text-neutral-500 shadow-sm transition hover:text-indigo-600"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => onDeleteCharacter(character.id)}
                      title="Eliminar personaje"
                      className="rounded-md border border-neutral-200 bg-white p-1 text-neutral-500 shadow-sm transition hover:text-red-600"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ----------------------------- Mis elementos ----------------------------- */}
        {tab === 'custom' && (
          <div className="space-y-3">
            <button
              onClick={onImportCustom}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-neutral-300 py-2.5 text-xs font-medium text-neutral-500 transition hover:border-indigo-400 hover:text-indigo-600"
            >
              <ImagePlus size={14} />
              Importar imágenes a la biblioteca
            </button>
            {library.length === 0 && (
              <p className="px-1 text-xs leading-relaxed text-neutral-400">
                Guarda aquí tus propios elementos (fondos, objetos, texturas) para reutilizarlos en
                cualquier página sin volver a importarlos.
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {library.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-lg border border-neutral-200 bg-white p-1.5 transition hover:border-indigo-400 hover:shadow-sm"
                >
                  <button onClick={() => onPlaceCustom(item)} title={`Colocar «${item.name}»`} className="w-full">
                    <img
                      src={assetUrl(item.src)}
                      alt={item.name}
                      draggable={false}
                      className="h-14 w-full rounded object-contain"
                    />
                    <span className="mt-1 block truncate text-center text-[10px] text-neutral-500">
                      {item.name}
                    </span>
                  </button>
                  <button
                    onClick={() => onDeleteCustom(item.id)}
                    title="Quitar de la biblioteca"
                    className="absolute right-1 top-1 hidden rounded-md border border-neutral-200 bg-white p-1 text-neutral-500 shadow-sm transition hover:text-red-600 group-hover:block"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
