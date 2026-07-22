import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, FolderOpen, Loader2 } from 'lucide-react'
import type { PageMargins, PageSetup } from '../../../shared/types'
import { DEFAULT_MARGINS, PAGE_PRESETS, clamp } from '../lib/units'
import type { ProjectSession } from '../App'

interface CreateProjectProps {
  onCancel: () => void
  onCreated: (session: ProjectSession) => void
}

const MIN_SIZE = 50
const MAX_SIZE = 500
const MAX_MARGIN = 80

export default function CreateProject({ onCancel, onCreated }: CreateProjectProps) {
  const [name, setName] = useState('')
  const [presetId, setPresetId] = useState('b5')
  const [customSize, setCustomSize] = useState({ width: 182, height: 257 })
  const [margins, setMargins] = useState<PageMargins>({ ...DEFAULT_MARGINS })
  const [folder, setFolder] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const preset = PAGE_PRESETS.find((p) => p.id === presetId) ?? PAGE_PRESETS[0]
  const isCustom = presetId === 'custom'
  const pageWidth = isCustom ? customSize.width : preset.width
  const pageHeight = isCustom ? customSize.height : preset.height

  const nameValid = name.trim().length > 0
  const sizeValid =
    pageWidth >= MIN_SIZE && pageWidth <= MAX_SIZE && pageHeight >= MIN_SIZE && pageHeight <= MAX_SIZE
  const marginsValid =
    margins.top + margins.bottom < pageHeight - 20 && margins.left + margins.right < pageWidth - 20
  const canSubmit = nameValid && sizeValid && marginsValid && !!folder && !submitting

  const summary = useMemo(
    () => `${pageWidth} × ${pageHeight} mm · márgenes ${margins.top}/${margins.right}/${margins.bottom}/${margins.left} mm`,
    [pageWidth, pageHeight, margins],
  )

  const pickFolder = async () => {
    const selected = await window.yusepe.selectFolder()
    if (selected) {
      setFolder(selected)
      setError(null)
    }
  }

  const setMargin = (key: keyof PageMargins, raw: string) => {
    const value = clamp(Math.round(Number(raw) || 0), 0, MAX_MARGIN)
    setMargins((m) => ({ ...m, [key]: value }))
  }

  const setCustom = (key: 'width' | 'height', raw: string) => {
    const value = clamp(Math.round(Number(raw) || 0), 0, MAX_SIZE)
    setCustomSize((s) => ({ ...s, [key]: value }))
  }

  const submit = async () => {
    setTouched(true)
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    const page: PageSetup = {
      presetId,
      width: pageWidth,
      height: pageHeight,
      margins,
    }

    try {
      const result = await window.yusepe.createProject({ name: name.trim(), folder: folder!, page })
      if (result.error || !result.project || !result.folder) {
        setError('No se pudo crear el proyecto. Inténtalo de nuevo.')
        return
      }
      onCreated({ project: result.project, filePath: result.filePath, folder: result.folder })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (message.includes('PROJECT_EXISTS')) {
        setError('Esa carpeta ya contiene un proyecto (project.ymanga). Elige otra carpeta.')
      } else {
        setError('No se pudo crear el proyecto: ' + message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const marginField = (key: keyof PageMargins, label: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-500">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={0}
          max={MAX_MARGIN}
          value={margins[key]}
          onChange={(e) => setMargin(key, e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-10 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-neutral-400">
          mm
        </span>
      </div>
    </label>
  )

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center border-b border-neutral-200 bg-white px-6">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
        >
          <ChevronLeft size={16} />
          Volver
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-10">
          <h2 className="text-xl font-semibold">Nuevo proyecto</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Define lo básico. Todo podrá ajustarse después excepto la carpeta del proyecto.
          </p>

          <div className="mt-8 space-y-8">
            {/* Nombre */}
            <section>
              <label className="mb-1.5 block text-sm font-medium">
                Nombre del proyecto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                autoFocus
                placeholder="Ej.: Crónicas del barrio, Vol. 1"
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              {touched && !nameValid && (
                <p className="mt-1.5 text-xs text-red-600">El nombre es obligatorio.</p>
              )}
            </section>

            {/* Tamaño de página */}
            <section>
              <span className="mb-1.5 block text-sm font-medium">Tamaño de página</span>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {PAGE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPresetId(p.id)}
                    className={`rounded-xl border bg-white p-3.5 text-left transition ${
                      presetId === p.id
                        ? 'border-indigo-500 ring-2 ring-indigo-100'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="text-sm font-semibold">{p.label}</div>
                    <div className="mt-0.5 text-xs text-neutral-500">
                      {p.width} × {p.height} mm
                    </div>
                    <div className="mt-1 text-xs leading-snug text-neutral-400">{p.description}</div>
                  </button>
                ))}
              </div>

              {isCustom && (
                <div className="mt-3 flex gap-3">
                  {(['width', 'height'] as const).map((key) => (
                    <label key={key} className="block flex-1">
                      <span className="mb-1 block text-xs font-medium text-neutral-500">
                        {key === 'width' ? 'Ancho' : 'Alto'}
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min={MIN_SIZE}
                          max={MAX_SIZE}
                          value={customSize[key]}
                          onChange={(e) => setCustom(key, e.target.value)}
                          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-10 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-neutral-400">
                          mm
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {touched && !sizeValid && (
                <p className="mt-1.5 text-xs text-red-600">
                  Las dimensiones deben estar entre {MIN_SIZE} y {MAX_SIZE} mm.
                </p>
              )}
            </section>

            {/* Márgenes */}
            <section>
              <span className="mb-1.5 block text-sm font-medium">Márgenes de seguridad</span>
              <p className="mb-3 text-xs text-neutral-500">
                Marcan la zona útil para tus viñetas: nada importante debería salir de ahí.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {marginField('top', 'Superior')}
                {marginField('right', 'Derecho')}
                {marginField('bottom', 'Inferior')}
                {marginField('left', 'Izquierdo')}
              </div>
              {touched && !marginsValid && (
                <p className="mt-1.5 text-xs text-red-600">
                  Los márgenes son demasiado grandes para este tamaño de página.
                </p>
              )}
            </section>

            {/* Carpeta */}
            <section>
              <span className="mb-1.5 block text-sm font-medium">
                Carpeta del proyecto <span className="text-red-500">*</span>
              </span>
              <p className="mb-3 text-xs text-neutral-500">
                Ahí se guardarán el archivo <code className="rounded bg-neutral-100 px-1">.ymanga</code>{' '}
                y la carpeta <code className="rounded bg-neutral-100 px-1">assets/</code> con tus
                imágenes.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={pickFolder}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50"
                >
                  <FolderOpen size={16} />
                  {folder ? 'Cambiar carpeta' : 'Seleccionar carpeta'}
                </button>
                {folder ? (
                  <span className="truncate text-sm text-neutral-600" title={folder}>
                    {folder}
                  </span>
                ) : (
                  <span className="text-sm text-neutral-400">Ninguna carpeta seleccionada</span>
                )}
              </div>
              {touched && !folder && (
                <p className="mt-1.5 text-xs text-red-600">
                  Debes seleccionar (o crear) una carpeta para continuar.
                </p>
              )}
            </section>
          </div>

          {error && (
            <div className="mt-8 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Acciones */}
          <div className="mt-10 flex items-center justify-between border-t border-neutral-200 pt-6">
            <span className="text-xs text-neutral-400">{summary}</span>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
              >
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                Crear proyecto
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
