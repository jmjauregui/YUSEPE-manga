import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  BookOpenText,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import type { MangaProject, StoryChapter, StoryScene } from '../../../shared/types'
import { uuid } from '../lib/units'
import type { ProjectSession } from '../App'

interface StoryBuilderProps {
  session: ProjectSession
  /** Vuelve al editor con el proyecto actualizado */
  onExit: (project: MangaProject) => void
}

type SaveStatus = 'saved' | 'saving' | 'error' | 'loading'

/**
 * Constructor de historia: premisa, capítulos y escenas vinculadas a páginas.
 * Carga el proyecto desde disco (el editor guarda antes de navegar aquí).
 */
export default function StoryBuilder({ session, onExit }: StoryBuilderProps) {
  const [project, setProject] = useState<MangaProject | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading')
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const projectRef = useRef<MangaProject | null>(null)
  projectRef.current = project

  useEffect(() => {
    let cancelled = false
    window.yusepe.openProjectPath(session.filePath).then((result) => {
      if (cancelled) return
      if (result.project) {
        setProject(result.project)
        setSelectedChapterId(result.project.story.chapters[0]?.id ?? null)
        setSaveStatus('saved')
      } else {
        setSaveStatus('error')
      }
    })
    return () => {
      cancelled = true
    }
  }, [session.filePath])

  const mutate = useCallback((fn: (draft: MangaProject) => void) => {
    setProject((prev) => {
      if (!prev) return prev
      const draft = structuredClone(prev)
      fn(draft)
      return draft
    })
  }, [])

  // Guardado automático con debounce
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (!project) return
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      try {
        if (projectRef.current) await window.yusepe.saveProject(session.filePath, projectRef.current)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [project, session.filePath])

  const exit = async () => {
    if (projectRef.current) await window.yusepe.saveProject(session.filePath, projectRef.current)
    if (projectRef.current) onExit(projectRef.current)
  }

  // -------------------------------------------------------------------------

  const chapter = project?.story.chapters.find((c) => c.id === selectedChapterId) ?? null
  const chapterIndex = project?.story.chapters.findIndex((c) => c.id === selectedChapterId) ?? -1

  const addChapter = () => {
    const c: StoryChapter = {
      id: uuid(),
      title: `Capítulo ${(project?.story.chapters.length ?? 0) + 1}`,
      summary: '',
      scenes: [],
    }
    mutate((d) => {
      d.story.chapters.push(c)
    })
    setSelectedChapterId(c.id)
  }

  const deleteChapter = (id: string) => {
    mutate((d) => {
      d.story.chapters = d.story.chapters.filter((c) => c.id !== id)
    })
    if (selectedChapterId === id) setSelectedChapterId(null)
  }

  const moveChapter = (id: string, direction: -1 | 1) => {
    mutate((d) => {
      const i = d.story.chapters.findIndex((c) => c.id === id)
      const j = i + direction
      if (i < 0 || j < 0 || j >= d.story.chapters.length) return
      const [c] = d.story.chapters.splice(i, 1)
      d.story.chapters.splice(j, 0, c)
    })
  }

  const patchChapter = (id: string, patch: Partial<StoryChapter>) => {
    mutate((d) => {
      const c = d.story.chapters.find((ch) => ch.id === id)
      if (c) Object.assign(c, patch)
    })
  }

  const addScene = () => {
    if (!chapter) return
    const scene: StoryScene = { id: uuid(), text: '', pageId: null }
    mutate((d) => {
      d.story.chapters.find((c) => c.id === chapter.id)?.scenes.push(scene)
    })
  }

  const patchScene = (sceneId: string, patch: Partial<StoryScene>) => {
    if (!chapter) return
    mutate((d) => {
      const s = d.story.chapters.find((c) => c.id === chapter.id)?.scenes.find((sc) => sc.id === sceneId)
      if (s) Object.assign(s, patch)
    })
  }

  const deleteScene = (sceneId: string) => {
    if (!chapter) return
    mutate((d) => {
      const c = d.story.chapters.find((ch) => ch.id === chapter.id)
      if (c) c.scenes = c.scenes.filter((s) => s.id !== sceneId)
    })
  }

  // -------------------------------------------------------------------------

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-neutral-400">
        {saveStatus === 'error' ? (
          <>
            <AlertTriangle size={18} />
            <span className="text-sm">No se pudo cargar el proyecto.</span>
          </>
        ) : (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando historia…</span>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-neutral-100">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4">
        <button
          onClick={exit}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
        >
          <ChevronLeft size={16} />
          Volver al editor
        </button>
        <div className="h-6 w-px bg-neutral-200" />
        <div className="flex items-center gap-2">
          <BookOpenText size={17} className="text-indigo-600" />
          <div>
            <h1 className="text-sm font-semibold leading-tight">Constructor de historia</h1>
            <p className="text-xs leading-tight text-neutral-400">{project.name}</p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex w-24 items-center gap-1.5 text-xs">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-neutral-400">
              <Check size={14} />
              Guardado
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-neutral-500">
              <Loader2 size={14} className="animate-spin" />
              Guardando…
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-red-600">
              <AlertTriangle size={14} />
              Error
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Columna izquierda: premisa + capítulos */}
        <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-neutral-200 bg-white p-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Premisa
            </label>
            <textarea
              value={project.story.premise}
              onChange={(e) => mutate((d) => void (d.story.premise = e.target.value))}
              placeholder="De qué va tu historia en dos o tres frases…"
              rows={4}
              className="w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Capítulos · {project.story.chapters.length}
            </span>
            <button
              onClick={addChapter}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
            >
              <Plus size={13} />
              Añadir
            </button>
          </div>

          {project.story.chapters.length === 0 && (
            <p className="rounded-lg border-2 border-dashed border-neutral-200 p-4 text-center text-xs leading-relaxed text-neutral-400">
              Aún no hay capítulos. Crea el primero y empieza a estructurar tu trama.
            </p>
          )}

          <div className="space-y-1.5">
            {project.story.chapters.map((c, i) => (
              <div
                key={c.id}
                onClick={() => setSelectedChapterId(c.id)}
                className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition ${
                  c.id === selectedChapterId ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-neutral-100'
                }`}
              >
                <span className="w-5 shrink-0 text-xs font-bold text-neutral-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800">{c.title || 'Sin título'}</p>
                  <p className="text-xs text-neutral-400">
                    {c.scenes.length} {c.scenes.length === 1 ? 'escena' : 'escenas'}
                  </p>
                </div>
                <div className="hidden shrink-0 gap-0.5 group-hover:flex">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      moveChapter(c.id, -1)
                    }}
                    disabled={i === 0}
                    className="rounded p-1 text-neutral-400 transition hover:text-indigo-600 disabled:opacity-30"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      moveChapter(c.id, 1)
                    }}
                    disabled={i === project.story.chapters.length - 1}
                    className="rounded p-1 text-neutral-400 transition hover:text-indigo-600 disabled:opacity-30"
                  >
                    <ChevronDown size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteChapter(c.id)
                    }}
                    className="rounded p-1 text-neutral-400 transition hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Detalle del capítulo */}
        <main className="flex-1 overflow-y-auto">
          {chapter ? (
            <div className="mx-auto max-w-2xl px-8 py-8">
              <input
                type="text"
                value={chapter.title}
                onChange={(e) => patchChapter(chapter.id, { title: e.target.value })}
                placeholder="Título del capítulo"
                className="w-full rounded-lg border border-transparent bg-transparent px-3 py-2 text-xl font-semibold outline-none transition hover:border-neutral-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
              <textarea
                value={chapter.summary}
                onChange={(e) => patchChapter(chapter.id, { summary: e.target.value })}
                placeholder="Resumen del capítulo: qué ocurre, qué cambia, cliffhanger…"
                rows={3}
                className="mt-3 w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <div className="mt-8 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Escenas</h3>
                <button
                  onClick={addScene}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <Plus size={13} />
                  Añadir escena
                </button>
              </div>

              {chapter.scenes.length === 0 && (
                <p className="mt-4 rounded-xl border-2 border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
                  Divide el capítulo en escenas: cada una puede vincularse a una página del manga.
                </p>
              )}

              <div className="mt-4 space-y-3">
                {chapter.scenes.map((scene, i) => (
                  <div key={scene.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-400">
                        Escena {i + 1}
                        <span className="ml-2 font-normal text-neutral-300">
                          {chapterIndex >= 0 ? `Cap. ${chapterIndex + 1}` : ''}
                        </span>
                      </span>
                      <button
                        onClick={() => deleteScene(scene.id)}
                        className="rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <textarea
                      value={scene.text}
                      onChange={(e) => patchScene(scene.id, { text: e.target.value })}
                      placeholder="Qué pasa en esta escena: quién, dónde, acción, diálogo clave…"
                      rows={3}
                      className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-neutral-400">Página del manga:</span>
                      <select
                        value={scene.pageId ?? ''}
                        onChange={(e) => patchScene(scene.id, { pageId: e.target.value || null })}
                        className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs outline-none transition focus:border-indigo-500"
                      >
                        <option value="">Sin vincular</option>
                        {project.pages.map((p, pi) => (
                          <option key={p.id} value={p.id}>
                            Página {pi + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <BookOpenText size={32} className="text-neutral-300" />
              <p className="mt-3 max-w-xs text-sm text-neutral-500">
                Selecciona un capítulo de la lista o crea uno nuevo para empezar a estructurar la
                trama.
              </p>
              <button
                onClick={addChapter}
                className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                <Plus size={16} />
                Crear el primer capítulo
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
