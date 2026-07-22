import { useState } from 'react'
import { X } from 'lucide-react'
import type { Character, CharacterConfig } from '../../../shared/types'
import CharacterFace, {
  DEFAULT_CHARACTER,
  EXPRESSIONS,
  EYE_STYLES,
  FACE_SHAPES,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_COLORS,
} from './CharacterFace'

interface CharacterBuilderModalProps {
  open: boolean
  /** Personaje a editar (null = crear uno nuevo) */
  initial: Character | null
  onSave: (name: string, config: CharacterConfig, id?: string) => void
  onClose: () => void
}

function OptionChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            value === opt.id
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'border border-neutral-300 bg-white text-neutral-600 hover:border-indigo-400 hover:text-indigo-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function ColorSwatches({
  colors,
  value,
  onChange,
}: {
  colors: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          title={color}
          style={{ backgroundColor: color }}
          className={`h-7 w-7 rounded-full border border-black/15 transition ${
            value === color ? 'ring-2 ring-indigo-500 ring-offset-2' : 'hover:scale-110'
          }`}
        />
      ))}
    </div>
  )
}

/** Constructor de personajes: cara, ojos, expresión, cabello y nombre. */
export default function CharacterBuilderModal({ open, initial, onSave, onClose }: CharacterBuilderModalProps) {
  const [config, setConfig] = useState<CharacterConfig>(initial?.config ?? { ...DEFAULT_CHARACTER })
  const [name, setName] = useState(initial?.name ?? '')

  if (!open) return null

  const patch = (p: Partial<CharacterConfig>) => setConfig((c) => ({ ...c, ...p }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onPointerDown={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-base font-semibold">
            {initial ? 'Editar personaje' : 'Nuevo personaje'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 gap-6 overflow-y-auto p-6">
          {/* Vista previa */}
          <div className="shrink-0">
            <div className="h-44 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <CharacterFace config={config} />
            </div>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-neutral-500">Nombre</span>
              <input
                type="text"
                value={name}
                autoFocus={!initial}
                placeholder="Ej.: Akira, La Maestra…"
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          {/* Opciones */}
          <div className="flex-1 space-y-4">
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Forma de cara</span>
              <OptionChips options={FACE_SHAPES} value={config.faceShape} onChange={(v) => patch({ faceShape: v })} />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Piel</span>
              <ColorSwatches colors={SKIN_COLORS} value={config.skin} onChange={(v) => patch({ skin: v })} />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Cabello</span>
              <OptionChips options={HAIR_STYLES} value={config.hairStyle} onChange={(v) => patch({ hairStyle: v })} />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Color de cabello</span>
              <ColorSwatches colors={HAIR_COLORS} value={config.hairColor} onChange={(v) => patch({ hairColor: v })} />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Ojos</span>
              <OptionChips options={EYE_STYLES} value={config.eyeStyle} onChange={(v) => patch({ eyeStyle: v })} />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Expresión</span>
              <OptionChips options={EXPRESSIONS} value={config.expression} onChange={(v) => patch({ expression: v })} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
          >
            Cancelar
          </button>
          <button
            onClick={() => name.trim() && onSave(name.trim(), config, initial?.id)}
            disabled={!name.trim()}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {initial ? 'Guardar cambios' : 'Crear personaje'}
          </button>
        </div>
      </div>
    </div>
  )
}
