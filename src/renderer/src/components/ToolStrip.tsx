import {
  Eraser,
  ImagePlus,
  LibraryBig,
  MessageCircle,
  MessageCircleDashed,
  Captions,
  MousePointer2,
  PenTool,
  Sparkles,
  SquareDashed,
  Stamp,
  Zap,
} from 'lucide-react'
import type { BalloonKind, EditorTool } from '../../../shared/types'

interface ToolStripProps {
  tool: EditorTool
  onTool: (tool: EditorTool) => void
  hasPages: boolean
  balloonMenuOpen: boolean
  onBalloonMenu: (open: boolean) => void
  onAddBalloon: (kind: BalloonKind) => void
  onImportImages: () => void
  onAddSfx: () => void
  onOpenAiLibrary: () => void
}

const BALLOON_KINDS: { kind: BalloonKind; label: string; hint: string; icon: typeof MessageCircle }[] = [
  { kind: 'speech', label: 'Diálogo', hint: 'Lo que dicen los personajes', icon: MessageCircle },
  { kind: 'thought', label: 'Pensamiento', hint: 'Voz interior, borde punteado', icon: MessageCircleDashed },
  { kind: 'shout', label: 'Grito', hint: 'Énfasis, exclamaciones', icon: Zap },
  { kind: 'caption', label: 'Cartela', hint: 'Narración, sin cola', icon: Captions },
]

/** Barra vertical de herramientas del editor (estilo InDesign). */
export default function ToolStrip({
  tool,
  onTool,
  hasPages,
  balloonMenuOpen,
  onBalloonMenu,
  onAddBalloon,
  onImportImages,
  onAddSfx,
  onOpenAiLibrary,
}: ToolStripProps) {
  const toolButton = (
    id: EditorTool,
    title: string,
    Icon: typeof MousePointer2,
  ) => (
    <button
      onClick={() => onTool(id)}
      disabled={!hasPages && id !== 'select'}
      title={title}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition disabled:opacity-30 ${
        tool === id
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
      }`}
    >
      <Icon size={17} />
    </button>
  )

  const actionButton = (
    title: string,
    Icon: typeof MousePointer2,
    onClick: () => void,
    active = false,
  ) => (
    <button
      onClick={onClick}
      disabled={!hasPages}
      title={title}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition disabled:opacity-30 ${
        active
          ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400'
          : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
      }`}
    >
      <Icon size={17} />
    </button>
  )

  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-neutral-200 bg-white py-2">
      {toolButton('select', 'Seleccionar y mover (Esc para volver)', MousePointer2)}
      <div className="my-1 h-px w-6 bg-neutral-200" />
      {toolButton('panel', 'Dibujar viñeta', SquareDashed)}
      {toolButton('pen', 'Pluma a mano alzada', PenTool)}
      {toolButton('eraser', 'Borrador (trazos y timbres)', Eraser)}
      {toolButton('stamp', 'Timbre de trama (puntos, líneas)', Stamp)}
      <div className="my-1 h-px w-6 bg-neutral-200" />
      {actionButton('Importar imágenes', ImagePlus, onImportImages)}
      <div className="relative">
        {actionButton('Añadir globo de diálogo', MessageCircle, () => onBalloonMenu(!balloonMenuOpen), balloonMenuOpen)}
        {balloonMenuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => onBalloonMenu(false)} />
            <div className="absolute left-11 top-0 z-30 w-60 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl">
              {BALLOON_KINDS.map(({ kind, label, hint, icon: Icon }) => (
                <button
                  key={kind}
                  onClick={() => onAddBalloon(kind)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-indigo-50"
                >
                  <Icon size={17} className="shrink-0 text-indigo-600" />
                  <span>
                    <span className="block text-sm font-medium text-neutral-800">{label}</span>
                    <span className="block text-xs text-neutral-400">{hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {actionButton('Añadir onomatopeya (¡BOOM!)', Sparkles, onAddSfx)}
      <div className="my-1 h-px w-6 bg-neutral-200" />
      {actionButton('Biblioteca de imágenes generadas por IA', LibraryBig, onOpenAiLibrary)}
    </div>
  )
}
