import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Clock,
  FilePlus2,
  FolderOpen,
  Loader2,
  Trash2,
} from 'lucide-react'
import type { RecentProject } from '../../../shared/types'
import { formatDate } from '../lib/units'
import type { ProjectSession } from '../App'

interface OverviewProps {
  onNewProject: () => void
  onOpenProject: (session: ProjectSession) => void
}

export default function Overview({ onNewProject, onOpenProject }: OverviewProps) {
  const [recents, setRecents] = useState<RecentProject[] | null>(null)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setRecents(await window.yusepe.listRecents())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleResult = (result: Awaited<ReturnType<typeof window.yusepe.openProjectPath>> | null) => {
    if (!result) return
    if (result.error || !result.project || !result.folder) {
      if (result.error === 'MISSING') {
        setError('No se encontró el archivo del proyecto en disco.')
      } else {
        setError('El archivo seleccionado no es un proyecto válido de YUSEPE manga.')
      }
      refresh()
      return
    }
    onOpenProject({ project: result.project, filePath: result.filePath, folder: result.folder })
  }

  const openRecent = async (recent: RecentProject) => {
    if (recent.missing || opening) return
    setOpening(true)
    setError(null)
    try {
      handleResult(await window.yusepe.openProjectPath(recent.filePath))
    } finally {
      setOpening(false)
    }
  }

  const openViaDialog = async () => {
    if (opening) return
    setOpening(true)
    setError(null)
    try {
      handleResult(await window.yusepe.openProjectDialog())
    } finally {
      setOpening(false)
    }
  }

  const removeRecent = async (filePath: string) => {
    await window.yusepe.removeRecent(filePath)
    refresh()
  }

  const hasRecents = !!recents && recents.length > 0

  return (
    <div className="flex h-full flex-col">
      {/* Barra superior */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <BookOpen size={18} />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight">YUSEPE manga</h1>
          <p className="text-xs leading-tight text-neutral-500">Crea tu manga sin saber dibujar</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Tus proyectos</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Retoma donde lo dejaste o empieza una nueva historia.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={openViaDialog}
                disabled={opening}
                className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
              >
                <FolderOpen size={16} />
                Abrir proyecto
              </button>
              <button
                onClick={onNewProject}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                <FilePlus2 size={16} />
                Nuevo proyecto
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Estado de carga */}
          {recents === null && (
            <div className="mt-16 flex items-center justify-center gap-2 text-neutral-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Cargando proyectos…</span>
            </div>
          )}

          {/* Estado vacío */}
          {recents !== null && !hasRecents && (
            <div className="mt-10 flex flex-col items-center rounded-2xl border-2 border-dashed border-neutral-300 bg-white/60 px-8 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                <BookOpen size={28} />
              </div>
              <h3 className="mt-4 text-base font-semibold">Aún no tienes proyectos</h3>
              <p className="mt-1 max-w-sm text-sm text-neutral-500">
                Crea tu primer proyecto para empezar a maquetar las páginas de tu historia. Solo
                necesitas tu guion e imágenes; del dibujo ya te encargas tú… como puedas.
              </p>
              <button
                onClick={onNewProject}
                className="mt-6 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                <FilePlus2 size={16} />
                Crear mi primer proyecto
              </button>
            </div>
          )}

          {/* Lista de recientes */}
          {hasRecents && (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recents!.map((recent) => (
                <div
                  key={recent.filePath}
                  onClick={() => openRecent(recent)}
                  className={`group relative rounded-xl border bg-white p-5 text-left shadow-sm transition ${
                    recent.missing
                      ? 'border-neutral-200 opacity-60'
                      : 'cursor-pointer border-neutral-200 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeRecent(recent.filePath)
                    }}
                    title="Quitar de la lista"
                    className="absolute right-3 top-3 rounded-md p-1.5 text-neutral-400 opacity-0 transition hover:bg-neutral-100 hover:text-red-600 group-hover:opacity-100"
                  >
                    <Trash2 size={15} />
                  </button>

                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <BookOpen size={20} />
                  </div>
                  <h3 className="mt-3 truncate pr-6 text-sm font-semibold">{recent.name}</h3>
                  <p className="mt-0.5 truncate text-xs text-neutral-400" title={recent.filePath}>
                    {recent.filePath}
                  </p>

                  <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(recent.lastOpened)}
                    </span>
                    {typeof recent.pageCount === 'number' && (
                      <span>
                        {recent.pageCount} {recent.pageCount === 1 ? 'página' : 'páginas'}
                      </span>
                    )}
                  </div>

                  {recent.missing && (
                    <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      <AlertTriangle size={11} />
                      No encontrado en disco
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
