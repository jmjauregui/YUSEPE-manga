import { useEffect, useState } from 'react'
import { Download, Loader2, Search, Sparkles, X } from 'lucide-react'
import type { AILibraryItem, PanelBackground } from '../../../shared/types'
import {
  buildPrompt,
  buildUrl,
  generateSeeds,
  stylesByCategory,
} from '../lib/aiImageService'
import { assetUrl, uuid } from '../lib/units'

interface AIBackgroundModalProps {
  open: boolean
  panelWidth: number
  panelHeight: number
  library: AILibraryItem[]
  defaultTab?: 'generate' | 'library'
  onClose: () => void
  onApply: (background: PanelBackground) => void
  onAddToLibrary: (item: AILibraryItem) => void
}

interface ResultImage {
  url: string
  seed: number
  loaded: boolean
  error: boolean
}

/** Selector de estilos IA con chips (radio buttons estilizados) */
function StyleChips({
  category,
  value,
  onChange,
}: {
  category: 'style' | 'color' | 'ambient' | 'lighting' | 'detail'
  value: string
  onChange: (id: string) => void
}) {
  const options = stylesByCategory(category)
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
            value === opt.id
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'border border-neutral-300 bg-white text-neutral-600 hover:border-indigo-400 hover:text-indigo-600'
          }`}
        >
          {opt.name}
        </button>
      ))}
      {category !== 'style' && category !== 'detail' && (
        <button
          type="button"
          onClick={() => onChange('')}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
            value === ''
              ? 'bg-neutral-200 text-neutral-700'
              : 'border border-neutral-200 bg-white text-neutral-400 hover:text-neutral-600'
          }`}
        >
          —
        </button>
      )}
    </div>
  )
}

/** Modal de generación de fondos con IA (Pollinations) + biblioteca de imágenes */
export default function AIBackgroundModal({
  open,
  panelWidth,
  panelHeight,
  library,
  defaultTab = 'generate',
  onClose,
  onApply,
  onAddToLibrary,
}: AIBackgroundModalProps) {
  const [tab, setTab] = useState<'generate' | 'library'>(defaultTab)
  const [aiToken, setAiToken] = useState('')

  // --- Generar ---
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('manga')
  const [color, setColor] = useState('bn')
  const [ambient, setAmbient] = useState('')
  const [lighting, setLighting] = useState('')
  const [detail, setDetail] = useState('normal')
  const [width, setWidth] = useState(Math.round(panelWidth * 3))
  const [height, setHeight] = useState(Math.round(panelHeight * 3))
  const [results, setResults] = useState<ResultImage[]>([])
  const [generating, setGenerating] = useState(false)
  const [lastGeneratedPrompt, setLastGeneratedPrompt] = useState('')

  // --- Biblioteca ---
  const [search, setSearch] = useState('')

  useEffect(() => {
    window.yusepe.getAiToken().then(setAiToken)
  }, [])

  if (!open) return null

  const generate = () => {
    if (!prompt.trim() || generating) return
    const builtPrompt = buildPrompt(prompt, { style, color, ambient, lighting, detail })
    setLastGeneratedPrompt(builtPrompt)
    const seeds = generateSeeds(3)
    const urls = seeds.map((s) => buildUrl(builtPrompt, width, height, s, aiToken || undefined))
    setResults(urls.map((url, i) => ({ url, seed: seeds[i], loaded: false, error: false })))
    setGenerating(true)
  }

  const onImageLoad = (index: number, hasError: boolean) => {
    setResults((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], loaded: true, error: hasError }
      const allDone = updated.every((r) => r.loaded)
      if (allDone) setGenerating(false)
      return updated
    })
  }

  const regenerate = (index: number) => {
    if (!lastGeneratedPrompt) return
    const newSeed = generateSeeds(1)[0]
    const url = buildUrl(lastGeneratedPrompt, width, height, newSeed, aiToken || undefined)
    setResults((prev) => {
      const updated = [...prev]
      updated[index] = { url, seed: newSeed, loaded: false, error: false }
      return updated
    })
    setGenerating(true)
  }

  const useResult = async (result: ResultImage) => {
    // Descargar la imagen remota a assets/ del proyecto
    const local = await window.yusepe.downloadImage(result.url)
    if (!local) return
    const bg: PanelBackground = {
      src: local.relPath,
      posX: 50,
      posY: 50,
      size: 'cover',
      repeat: false,
      aiGeneratedPrompt: lastGeneratedPrompt,
      aiSeed: result.seed,
    }
    // Guardar en biblioteca
    onAddToLibrary({
      id: uuid(),
      prompt: prompt.trim(),
      generatedPrompt: lastGeneratedPrompt,
      date: new Date().toISOString(),
      width,
      height,
      seed: result.seed,
      url: result.url,
      localSrc: local.relPath,
    })
    onApply(bg)
    onClose()
  }

  const useLibraryItem = (item: AILibraryItem) => {
    const src = item.localSrc ?? item.url
    onApply({
      src,
      posX: 50,
      posY: 50,
      size: 'cover',
      repeat: false,
      aiGeneratedPrompt: item.generatedPrompt,
      aiSeed: item.seed,
    })
    onClose()
  }

  const filteredLibrary = library.filter((item) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return item.prompt.toLowerCase().includes(q) || item.generatedPrompt.toLowerCase().includes(q)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onPointerDown={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold">Generar fondo con IA</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-neutral-200 px-6 pt-3">
          <button
            onClick={() => setTab('generate')}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === 'generate' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Generar
          </button>
          <button
            onClick={() => setTab('library')}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === 'library' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Biblioteca ({library.length})
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'generate' && (
            <div className="space-y-4">
              {/* Prompt */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">Describe el fondo</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej.: Escuela japonesa vista desde el exterior durante primavera"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Selectores */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Estilo</span>
                  <StyleChips category="style" value={style} onChange={setStyle} />
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Color</span>
                  <StyleChips category="color" value={color} onChange={setColor} />
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Ambiente</span>
                  <StyleChips category="ambient" value={ambient} onChange={setAmbient} />
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Iluminación</span>
                  <StyleChips category="lighting" value={lighting} onChange={setLighting} />
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Detalle</span>
                  <StyleChips category="detail" value={detail} onChange={setDetail} />
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Tamaño (px)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value) || 0)}
                      className="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                    />
                    <span className="text-neutral-400">×</span>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value) || 0)}
                      className="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Botón generar */}
              <button
                onClick={generate}
                disabled={!prompt.trim() || generating}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generating ? 'Generando…' : 'Generar 3 imágenes'}
              </button>

              {/* Grilla de resultados */}
              {results.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {results.map((result, i) => (
                    <div key={i} className="overflow-hidden rounded-lg border border-neutral-200">
                      <div className="relative aspect-[3/2] bg-neutral-100">
                        {!result.loaded && !result.error && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 size={20} className="animate-spin text-neutral-400" />
                          </div>
                        )}
                        {result.error && (
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-red-500">
                            Error al generar
                          </div>
                        )}
                        <img
                          src={result.url}
                          alt=""
                          className={`h-full w-full object-cover ${result.loaded ? 'block' : 'hidden'}`}
                          onLoad={() => onImageLoad(i, false)}
                          onError={() => onImageLoad(i, true)}
                          draggable={false}
                        />
                      </div>
                      {result.loaded && !result.error && (
                        <div className="flex border-t border-neutral-200 text-xs">
                          <button
                            onClick={() => useResult(result)}
                            className="flex-1 bg-indigo-50 py-2 font-medium text-indigo-700 transition hover:bg-indigo-100"
                          >
                            Usar
                          </button>
                          <button
                            onClick={() => regenerate(i)}
                            className="flex-1 border-l border-neutral-200 py-2 font-medium text-neutral-600 transition hover:bg-neutral-100"
                          >
                            Regenerar
                          </button>
                          <a
                            href={result.url}
                            download={`ai-bg-seed${result.seed}.png`}
                            className="flex-1 border-l border-neutral-200 py-2 text-center font-medium text-neutral-600 transition hover:bg-neutral-100"
                          >
                            <Download size={13} className="mx-auto" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Prompt construido (transparente para el usuario) */}
              {lastGeneratedPrompt && (
                <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-400">
                  Prompt construido: <span className="font-mono">{lastGeneratedPrompt}</span>
                </p>
              )}
            </div>
          )}

          {tab === 'library' && (
            <div className="space-y-4">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por prompt…"
                  className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {filteredLibrary.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-neutral-300 py-12 text-center text-sm text-neutral-400">
                  {search ? 'Sin resultados' : 'Aún no hay imágenes en la biblioteca. Genera la primera.'}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {filteredLibrary.map((item) => (
                    <div key={item.id} className="overflow-hidden rounded-lg border border-neutral-200">
                      <button
                        onClick={() => useLibraryItem(item)}
                        className="relative block aspect-[3/2] w-full bg-neutral-100"
                        title={item.prompt}
                      >
                        <img
                          src={item.localSrc ? assetUrl(item.localSrc) : item.url}
                          alt=""
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      </button>
                      <div className="border-t border-neutral-200 p-2">
                        <p className="truncate text-xs text-neutral-500" title={item.prompt}>
                          {item.prompt}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-400">
                          <span>{item.width}×{item.height}</span>
                          <span>seed {item.seed}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}