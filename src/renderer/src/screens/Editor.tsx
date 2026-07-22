import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  BookOpenText,
  Check,
  ChevronLeft,
  Columns2,
  FolderOpen,
  Frame,
  Loader2,
  Wand,
  Maximize2,
  Palette,
  PaintBucket,
  Plus,
  RotateCcw,
  RotateCw,
  Rows2,
  Spline,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type {
  AILibraryItem,
  Balloon,
  BalloonKind,
  Character,
  CharacterConfig,
  EditorTool,
  ImportedAsset,
  LibraryItem,
  MangaPage,
  MangaProject,
  Panel,
  PanelBackground,
  PlacedImage,
  Selection,
  Sfx,
  SfxStyle,
  StampPattern,
} from '../../../shared/types'
import type { Box } from '../lib/units'
import {
  DEFAULT_BALLOON_FONT_MM,
  DEFAULT_SFX_FONT_MM,
  GUTTER_MM,
  MANGA_FONTS,
  MAX_BALLOON_FONT_MM,
  MAX_SFX_FONT_MM,
  MIN_BALLOON_FONT_MM,
  MIN_PANEL_MM,
  MIN_SFX_FONT_MM,
  PEN_COLORS,
  PEN_WIDTHS_MM,
  PX_PER_MM,
  DEFAULT_STAMP_SIZE_MM,
  assetUrl,
  clamp,
  defaultCorners,
  fitIntoBox,
  loadImageSize,
  marginsBox,
  uuid,
} from '../lib/units'
import PagesPanel from '../components/PagesPanel'
import PageCanvas from '../components/PageCanvas'
import Modal from '../components/Modal'
import ToolStrip from '../components/ToolStrip'
import CharacterBuilderModal from '../components/CharacterBuilderModal'
import AIBackgroundModal from '../components/AIBackgroundModal'
import { SFX_COLORS, SFX_STYLES } from '../components/SfxItem'
import type { ProjectSession } from '../App'

interface EditorProps {
  session: ProjectSession
  onExit: () => void
  onOpenStory: () => void
}

type SaveStatus = 'saved' | 'saving' | 'error'

const MIN_ZOOM = 0.2
const MAX_ZOOM = 3

const STAMP_PATTERNS: { id: StampPattern; label: string }[] = [
  { id: 'dots', label: 'Puntos' },
  { id: 'dotsDense', label: 'Puntos densos' },
  { id: 'dashes', label: 'Líneas diagonal' },
  { id: 'crosshatch', label: 'Cruzado' },
  { id: 'linesV', label: 'Vertical' },
  { id: 'linesH', label: 'Horizontal' },
  { id: 'stars', label: 'Estrellas' },
  { id: 'bricks', label: 'Ladrillos' },
]

const TOOL_HINTS: Partial<Record<EditorTool, string>> = {
  panel: 'Arrastra sobre la página para dibujar una viñeta · Esc para cancelar',
  pen: 'Dibuja a mano alzada sobre la página · Esc para salir',
  eraser: 'Pasa sobre trazos y timbres para borrarlos · Esc para salir',
  stamp: 'Haz clic o arrastra para estampar la trama · Esc para salir',
}

export default function Editor({ session, onExit, onOpenStory }: EditorProps) {
  const [project, setProject] = useState<MangaProject>(session.project)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(session.project.pages[0]?.id ?? null)
  const [selection, setSelection] = useState<Selection>(null)
  const [editingBalloonId, setEditingBalloonId] = useState<string | null>(null)
  const [editingSfxId, setEditingSfxId] = useState<string | null>(null)
  const [tool, setTool] = useState<EditorTool>('select')
  const [panelDeformMode, setPanelDeformMode] = useState(false)
  const [balloonMenuOpen, setBalloonMenuOpen] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiDefaultTab, setAiDefaultTab] = useState<'generate' | 'library'>('generate')
  const [characterBuilder, setCharacterBuilder] = useState<{ open: boolean; initial: Character | null }>({
    open: false,
    initial: null,
  })
  const [penColor, setPenColor] = useState(PEN_COLORS[0])
  const [penWidth, setPenWidth] = useState(PEN_WIDTHS_MM[1])
  const [stampPattern, setStampPattern] = useState<StampPattern>('dots')
  const [stampSize, setStampSize] = useState(DEFAULT_STAMP_SIZE_MM)
  const [zoom, setZoom] = useState(1)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [pageToDelete, setPageToDelete] = useState<string | null>(null)
  const [panelToDelete, setPanelToDelete] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [toneMenuOpen, setToneMenuOpen] = useState(false)
  const [tramas, setTramas] = useState<{ name: string; relPath: string }[]>([])

  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const projectRef = useRef(project)
  projectRef.current = project

  useEffect(() => {
    window.yusepe.listTramas().then((list) =>
      setTramas(list.map((a) => ({ name: a.fileName, relPath: a.relPath }))),
    )
  }, [session.filePath])

  const pageIndex = project.pages.findIndex((p) => p.id === selectedPageId)
  const selectedPage: MangaPage | null = pageIndex >= 0 ? project.pages[pageIndex] : null

  const selectedPanel: Panel | null =
    selection?.kind === 'panel' ? selectedPage?.panels.find((p) => p.id === selection.id) ?? null : null

  const selectedBalloon: Balloon | null =
    selection?.kind === 'balloon' ? selectedPage?.balloons.find((b) => b.id === selection.id) ?? null : null

  const selectedSfx: Sfx | null =
    selection?.kind === 'sfx' ? selectedPage?.sfx.find((s) => s.id === selection.id) ?? null : null

  const selectedImageInfo: { img: PlacedImage; panel: Panel | null } | null = (() => {
    if (selection?.kind !== 'image' || !selectedPage) return null
    const free = selectedPage.images.find((i) => i.id === selection.id)
    if (free) return { img: free, panel: null }
    for (const panel of selectedPage.panels) {
      const inside = panel.images.find((i) => i.id === selection.id)
      if (inside) return { img: inside, panel }
    }
    return null
  })()

  // El modo deformar solo vive mientras la misma viñeta sigue seleccionada
  useEffect(() => {
    setPanelDeformMode(false)
  }, [selection?.kind, selection?.kind === 'panel' ? selection.id : null])

  // -------------------------------------------------------------------------
  // Mutación del proyecto + guardado automático con debounce
  // -------------------------------------------------------------------------

  const mutate = useCallback((fn: (draft: MangaProject) => void) => {
    setProject((prev) => {
      const draft = structuredClone(prev)
      fn(draft)
      return draft
    })
  }, [])

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      try {
        await window.yusepe.saveProject(session.filePath, projectRef.current)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [project, session.filePath])

  const flushSave = useCallback(async () => {
    try {
      await window.yusepe.saveProject(session.filePath, projectRef.current)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }, [session.filePath])

  // -------------------------------------------------------------------------
  // Zoom
  // -------------------------------------------------------------------------

  const fitZoom = useCallback(() => {
    const el = canvasAreaRef.current
    if (!el) return 1
    const z = Math.min(
      (el.clientWidth - 96) / (project.page.width * PX_PER_MM),
      (el.clientHeight - 96) / (project.page.height * PX_PER_MM),
    )
    return clamp(z, MIN_ZOOM, MAX_ZOOM)
  }, [project.page.width, project.page.height])

  useEffect(() => {
    setZoom(fitZoom())
  }, [fitZoom])

  const scale = PX_PER_MM * zoom

  // -------------------------------------------------------------------------
  // Herramienta activa
  // -------------------------------------------------------------------------

  const changeTool = (t: EditorTool) => {
    setTool(t)
    if (t !== 'select') {
      setSelection(null)
      setPanelDeformMode(false)
    }
  }

  // -------------------------------------------------------------------------
  // Gestión de páginas
  // -------------------------------------------------------------------------

  const addPage = () => {
    const page: MangaPage = { id: uuid(), images: [], panels: [], balloons: [], strokes: [], stamps: [], sfx: [] }
    mutate((d) => {
      const at = pageIndex >= 0 ? pageIndex + 1 : d.pages.length
      d.pages.splice(at, 0, page)
    })
    setSelectedPageId(page.id)
    setSelection(null)
    setEditingBalloonId(null)
    setEditingSfxId(null)
  }

  const confirmDeletePage = () => {
    if (!pageToDelete) return
    const id = pageToDelete
    setPageToDelete(null)
    mutate((d) => {
      d.pages = d.pages.filter((p) => p.id !== id)
    })
    if (selectedPageId === id) {
      const remaining = project.pages.filter((p) => p.id !== id)
      const oldIndex = project.pages.findIndex((p) => p.id === id)
      setSelectedPageId(remaining[Math.max(0, oldIndex - 1)]?.id ?? null)
      setSelection(null)
      setEditingBalloonId(null)
      setEditingSfxId(null)
    }
  }

  const movePage = (id: string, direction: -1 | 1) => {
    mutate((d) => {
      const i = d.pages.findIndex((p) => p.id === id)
      const j = i + direction
      if (i < 0 || j < 0 || j >= d.pages.length) return
      const [page] = d.pages.splice(i, 1)
      d.pages.splice(j, 0, page)
    })
  }

  // -------------------------------------------------------------------------
  // Viñetas
  // -------------------------------------------------------------------------

  const createPanel = (rect: Box) => {
    if (!selectedPageId) return
    const panel: Panel = { id: uuid(), ...rect, corners: defaultCorners(rect.w, rect.h), images: [] }
    mutate((d) => {
      d.pages[pageIndex]?.panels.push(panel)
    })
    setSelection({ kind: 'panel', id: panel.id })
    setTool('select')
  }

  const changePanel = useCallback(
    (id: string, patch: Partial<Panel>) => {
      mutate((d) => {
        for (const page of d.pages) {
          const panel = page.panels.find((p) => p.id === id)
          if (panel) {
            Object.assign(panel, patch)
            return
          }
        }
      })
    },
    [mutate],
  )

  const shiftPanelImages = useCallback(
    (panelId: string, dx: number, dy: number) => {
      mutate((d) => {
        for (const page of d.pages) {
          const panel = page.panels.find((p) => p.id === panelId)
          if (panel) {
            for (const img of panel.images) {
              img.x += dx
              img.y += dy
            }
            return
          }
        }
      })
    },
    [mutate],
  )

  const togglePanelDeform = useCallback(() => {
    setPanelDeformMode((v) => !v)
  }, [])

  /** Aplica un fondo (IA o manual) a la viñeta seleccionada */
  const applyPanelBackground = useCallback(
    (background: PanelBackground) => {
      if (!selectedPanel) return
      changePanel(selectedPanel.id, { background })
    },
    [selectedPanel, changePanel],
  )

  /** Ajusta un parámetro del fondo de la viñeta seleccionada */
  const patchPanelBackground = useCallback(
    (patch: Partial<PanelBackground>) => {
      if (!selectedPanel?.background) return
      changePanel(selectedPanel.id, {
        background: { ...selectedPanel.background, ...patch },
      })
    },
    [selectedPanel, changePanel],
  )

  /** Quita el fondo de la viñeta seleccionada */
  const removePanelBackground = useCallback(() => {
    if (!selectedPanel) return
    changePanel(selectedPanel.id, { background: undefined })
  }, [selectedPanel, changePanel])

  /** Añade una imagen generada por IA a la biblioteca del proyecto */
  const addAILibraryItem = useCallback(
    (item: AILibraryItem) => {
      mutate((d) => {
        d.aiLibrary ??= []
        d.aiLibrary.unshift(item)
      })
    },
    [mutate],
  )

  const splitSelectedPanel = (direction: 'vertical' | 'horizontal') => {
    if (!selectedPanel) return
    const min = MIN_PANEL_MM * 2 + GUTTER_MM
    const id = selectedPanel.id
    mutate((d) => {
      for (const page of d.pages) {
        const i = page.panels.findIndex((p) => p.id === id)
        if (i < 0) continue
        const p = page.panels[i]
        if (direction === 'vertical') {
          if (p.w < min) return
          const w = (p.w - GUTTER_MM) / 2
          const first: Panel = { ...p, w, corners: defaultCorners(w, p.h) }
          const second: Panel = { id: uuid(), x: p.x + w + GUTTER_MM, y: p.y, w, h: p.h, corners: defaultCorners(w, p.h), images: [] }
          page.panels.splice(i, 1, first, second)
        } else {
          if (p.h < min) return
          const h = (p.h - GUTTER_MM) / 2
          const first: Panel = { ...p, h, corners: defaultCorners(p.w, h) }
          const second: Panel = { id: uuid(), x: p.x, y: p.y + h + GUTTER_MM, w: p.w, h, corners: defaultCorners(p.w, h), images: [] }
          page.panels.splice(i, 1, first, second)
        }
        return
      }
    })
  }

  const fitSelectedPanelToMargins = () => {
    if (!selectedPanel) return
    const box = marginsBox(project.page)
    changePanel(selectedPanel.id, { ...box, corners: defaultCorners(box.w, box.h) })
  }

  const deletePanelNow = useCallback(
    (id: string) => {
      mutate((d) => {
        for (const page of d.pages) page.panels = page.panels.filter((p) => p.id !== id)
      })
      setSelection((s) => (s?.kind === 'panel' && s.id === id ? null : s))
    },
    [mutate],
  )

  const requestDeletePanel = useCallback(
    (id: string) => {
      const panel = projectRef.current.pages.flatMap((p) => p.panels).find((p) => p.id === id)
      if (!panel) return
      if (panel.images.length > 0) setPanelToDelete(id)
      else deletePanelNow(id)
    },
    [deletePanelNow],
  )

  const confirmDeletePanel = () => {
    if (!panelToDelete) return
    deletePanelNow(panelToDelete)
    setPanelToDelete(null)
  }

  // -------------------------------------------------------------------------
  // Globos de diálogo
  // -------------------------------------------------------------------------

  const addBalloon = (kind: BalloonKind) => {
    setBalloonMenuOpen(false)
    if (!selectedPageId || pageIndex < 0) return
    const box = marginsBox(project.page)
    const size = kind === 'caption' ? { w: 58, h: 16 } : { w: 46, h: 30 }
    const x = box.x + (box.w - size.w) / 2
    const y = box.y + (box.h - size.h) / 3
    const balloon: Balloon = {
      id: uuid(),
      kind,
      x,
      y,
      ...size,
      text: '',
      fontSize: DEFAULT_BALLOON_FONT_MM,
      tail: kind === 'caption' ? null : { x: x + size.w * 0.3, y: y + size.h + 14 },
    }
    mutate((d) => {
      d.pages[pageIndex]?.balloons.push(balloon)
    })
    setSelection({ kind: 'balloon', id: balloon.id })
    setEditingBalloonId(balloon.id)
  }

  const changeBalloon = useCallback(
    (id: string, patch: Partial<Balloon>) => {
      mutate((d) => {
        for (const page of d.pages) {
          const balloon = page.balloons.find((b) => b.id === id)
          if (balloon) {
            Object.assign(balloon, patch)
            return
          }
        }
      })
    },
    [mutate],
  )

  const deleteBalloon = useCallback(
    (id: string) => {
      mutate((d) => {
        for (const page of d.pages) page.balloons = page.balloons.filter((b) => b.id !== id)
      })
      setSelection((s) => (s?.kind === 'balloon' && s.id === id ? null : s))
      setEditingBalloonId((e) => (e === id ? null : e))
    },
    [mutate],
  )

  const adjustSelectedBalloonFont = (delta: number) => {
    if (!selectedBalloon) return
    changeBalloon(selectedBalloon.id, {
      fontSize: clamp(selectedBalloon.fontSize + delta, MIN_BALLOON_FONT_MM, MAX_BALLOON_FONT_MM),
    })
  }

  // -------------------------------------------------------------------------
  // Onomatopeyas
  // -------------------------------------------------------------------------

  const addSfx = () => {
    if (pageIndex < 0) return
    const box = marginsBox(project.page)
    const sfx: Sfx = {
      id: uuid(),
      text: '¡BOOM!',
      x: box.x + box.w / 2,
      y: box.y + box.h / 2,
      fontSize: DEFAULT_SFX_FONT_MM,
      rotation: -8,
      style: 'impact',
      color: SFX_COLORS[0],
    }
    mutate((d) => {
      d.pages[pageIndex]?.sfx.push(sfx)
    })
    setSelection({ kind: 'sfx', id: sfx.id })
    setEditingSfxId(sfx.id)
  }

  const changeSfx = useCallback(
    (id: string, patch: Partial<Sfx>) => {
      mutate((d) => {
        for (const page of d.pages) {
          const sfx = page.sfx.find((s) => s.id === id)
          if (sfx) {
            Object.assign(sfx, patch)
            return
          }
        }
      })
    },
    [mutate],
  )

  const deleteSfx = useCallback(
    (id: string) => {
      mutate((d) => {
        for (const page of d.pages) page.sfx = page.sfx.filter((s) => s.id !== id)
      })
      setSelection((s) => (s?.kind === 'sfx' && s.id === id ? null : s))
      setEditingSfxId((e) => (e === id ? null : e))
    },
    [mutate],
  )

  const cycleSfxStyle = () => {
    if (!selectedSfx) return
    const ids = SFX_STYLES.map((s) => s.id)
    const next = ids[(ids.indexOf(selectedSfx.style) + 1) % ids.length]
    changeSfx(selectedSfx.id, { style: next as SfxStyle })
  }

  const cycleSfxColor = () => {
    if (!selectedSfx) return
    const next = SFX_COLORS[(SFX_COLORS.indexOf(selectedSfx.color) + 1) % SFX_COLORS.length]
    changeSfx(selectedSfx.id, { color: next })
  }

  // -------------------------------------------------------------------------
  // Dibujo a mano alzada y timbres
  // -------------------------------------------------------------------------

  const addStroke = useCallback(
    (points: number[], color: string, width: number) => {
      mutate((d) => {
        d.pages[pageIndex]?.strokes.push({ id: uuid(), points, color, width })
      })
    },
    [mutate, pageIndex],
  )

  const eraseAt = useCallback(
    (x: number, y: number) => {
      const radius = 2.2
      mutate((d) => {
        const page = d.pages[pageIndex]
        if (!page) return
        page.strokes = page.strokes.filter((stroke) => {
          for (let i = 0; i < stroke.points.length; i += 2) {
            if (Math.hypot(stroke.points[i] - x, stroke.points[i + 1] - y) <= radius) return false
          }
          return true
        })
        page.stamps = page.stamps.filter((st) => Math.hypot(st.x - x, st.y - y) > st.size / 2 + 1.5)
      })
    },
    [mutate, pageIndex],
  )

  const addStamp = useCallback(
    (x: number, y: number, pattern: StampPattern, size: number) => {
      mutate((d) => {
        d.pages[pageIndex]?.stamps.push({ id: uuid(), pattern, x, y, size })
      })
    },
    [mutate, pageIndex],
  )

  // -------------------------------------------------------------------------
  // Imágenes y elementos de biblioteca (escenarios, personajes, propios)
  // -------------------------------------------------------------------------

  /** Coloca un elemento en la viñeta seleccionada o en la página libre */
  const placeOnPage = useCallback(
    (makeImages: (box: { x: number; y: number; w: number; h: number }) => PlacedImage[]) => {
      const proj = projectRef.current
      const targetPageId = selectedPageId ?? proj.pages[0]?.id
      if (!targetPageId) return
      const page = proj.pages.find((p) => p.id === targetPageId)
      if (!page) return

      const targetPanel =
        selection?.kind === 'panel' ? page.panels.find((p) => p.id === selection.id) ?? null : null

      const box = targetPanel
        ? { x: 0, y: 0, w: targetPanel.w, h: targetPanel.h }
        : marginsBox(proj.page)

      const placed = makeImages(box)
      if (placed.length === 0) return

      mutate((d) => {
        const draftPage = d.pages.find((p) => p.id === targetPageId)
        if (!draftPage) return
        if (targetPanel) {
          const panel = draftPage.panels.find((p) => p.id === targetPanel.id)
          if (panel) panel.images.push(...placed)
        } else {
          draftPage.images.push(...placed)
        }
      })
      setSelectedPageId(targetPageId)
      setSelection({ kind: 'image', id: placed[placed.length - 1].id })
    },
    [mutate, selectedPageId, selection],
  )

  const addAssetsToPage = useCallback(
    async (assets: ImportedAsset[]) => {
      if (assets.length === 0) return
      const sizes: { w: number; h: number }[] = []
      for (const asset of assets) sizes.push(await loadImageSize(assetUrl(asset.relPath)))
      placeOnPage((box) =>
        assets.map((asset, i) => ({
          id: uuid(),
          src: asset.relPath,
          ...fitIntoBox(sizes[i].w / sizes[i].h, box),
        })),
      )
    },
    [placeOnPage],
  )

  const importViaDialog = async () => {
    setImporting(true)
    try {
      const assets = await window.yusepe.importImages()
      await addAssetsToPage(assets)
    } finally {
      setImporting(false)
    }
  }

  const importDroppedPaths = async (paths: string[], panelId: string | null) => {
    const assets = await window.yusepe.importImagePaths(paths)
    if (assets.length === 0) return
    const sizes: { w: number; h: number }[] = []
    for (const asset of assets) sizes.push(await loadImageSize(assetUrl(asset.relPath)))
    // Con drop explícito respetamos la viñeta de destino aunque no esté seleccionada
    const proj = projectRef.current
    const targetPageId = selectedPageId ?? proj.pages[0]?.id
    const page = proj.pages.find((p) => p.id === targetPageId)
    if (!page || !targetPageId) return
    const explicitPanel = panelId ? page.panels.find((p) => p.id === panelId) ?? null : null
    if (explicitPanel) {
      const box = { x: 0, y: 0, w: explicitPanel.w, h: explicitPanel.h }
      const placed = assets.map((asset, i) => ({
        id: uuid(),
        src: asset.relPath,
        ...fitIntoBox(sizes[i].w / sizes[i].h, box),
      }))
      mutate((d) => {
        const panel = d.pages.find((p) => p.id === targetPageId)?.panels.find((p) => p.id === explicitPanel.id)
        if (panel) panel.images.push(...placed)
      })
      setSelection({ kind: 'image', id: placed[placed.length - 1].id })
    } else {
      await addAssetsToPage(assets)
    }
  }

  const placePrefab = (prefabId: string) => {
    placeOnPage((box) => {
      const size = Math.min(45, box.w * 0.6, box.h * 0.6)
      return [
        {
          id: uuid(),
          src: `prefab:${prefabId}`,
          x: box.x + (box.w - size) / 2,
          y: box.y + (box.h - size) / 2,
          w: size,
          h: size,
        },
      ]
    })
  }

  const placeCharacter = (character: Character) => {
    const configCopy = structuredClone(character.config)
    placeOnPage((box) => {
      const size = Math.min(45, box.w * 0.6, box.h * 0.6)
      return [
        {
          id: uuid(),
          src: 'character',
          character: configCopy,
          x: box.x + (box.w - size) / 2,
          y: box.y + box.h - size - 2,
          w: size,
          h: size,
        },
      ]
    })
  }

  const placeCustom = (item: LibraryItem) => {
    loadImageSize(assetUrl(item.src)).then(({ w, h }) => {
      placeOnPage((box) => [{ id: uuid(), src: item.src, ...fitIntoBox(w / h, box) }])
    })
  }

  // -------------------------------------------------------------------------
  // Biblioteca: personajes y elementos propios
  // -------------------------------------------------------------------------

  const saveCharacter = (name: string, config: CharacterConfig, id?: string) => {
    mutate((d) => {
      if (id) {
        const c = d.characters.find((ch) => ch.id === id)
        if (c) {
          c.name = name
          c.config = config
        }
      } else {
        d.characters.push({ id: uuid(), name, config })
      }
    })
    setCharacterBuilder({ open: false, initial: null })
  }

  const deleteCharacter = (id: string) => {
    mutate((d) => {
      d.characters = d.characters.filter((c) => c.id !== id)
    })
  }

  const importCustomToLibrary = async () => {
    const assets = await window.yusepe.importImages()
    if (assets.length === 0) return
    mutate((d) => {
      for (const asset of assets) {
        d.library.push({
          id: uuid(),
          name: asset.fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
          src: asset.relPath,
        })
      }
    })
  }

  const deleteCustom = (id: string) => {
    mutate((d) => {
      d.library = d.library.filter((item) => item.id !== id)
    })
  }

  // -------------------------------------------------------------------------
  // Imágenes colocadas: cambios, borrado, ajuste
  // -------------------------------------------------------------------------

  const changeImage = useCallback(
    (id: string, patch: Partial<PlacedImage>) => {
      mutate((d) => {
        for (const page of d.pages) {
          const free = page.images.find((i) => i.id === id)
          if (free) {
            Object.assign(free, patch)
            return
          }
          for (const panel of page.panels) {
            const inside = panel.images.find((i) => i.id === id)
            if (inside) {
              Object.assign(inside, patch)
              return
            }
          }
        }
      })
    },
    [mutate],
  )

  const deleteImage = useCallback(
    (id: string) => {
      mutate((d) => {
        for (const page of d.pages) {
          const fi = page.images.findIndex((i) => i.id === id)
          if (fi >= 0) {
            page.images.splice(fi, 1)
            return
          }
          for (const panel of page.panels) {
            const ii = panel.images.findIndex((i) => i.id === id)
            if (ii >= 0) {
              panel.images.splice(ii, 1)
              return
            }
          }
        }
      })
      setSelection((s) => (s?.kind === 'image' && s.id === id ? null : s))
    },
    [mutate],
  )

  const fitSelectedImage = () => {
    if (!selectedImageInfo) return
    const { img, panel } = selectedImageInfo
    const box = panel ? { x: 0, y: 0, w: panel.w, h: panel.h } : marginsBox(project.page)
    changeImage(img.id, fitIntoBox(img.w / img.h, box))
  }

  // -------------------------------------------------------------------------
  // Teclado
  // -------------------------------------------------------------------------

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return

      if (e.key === 'Escape') {
        if (balloonMenuOpen) setBalloonMenuOpen(false)
        else if (toneMenuOpen) setToneMenuOpen(false)
        else if (panelDeformMode) setPanelDeformMode(false)
        else if (tool !== 'select') setTool('select')
        else setSelection(null)
        return
      }

      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (!selection) return
      e.preventDefault()
      if (selection.kind === 'image') deleteImage(selection.id)
      else if (selection.kind === 'balloon') deleteBalloon(selection.id)
      else if (selection.kind === 'sfx') deleteSfx(selection.id)
      else requestDeletePanel(selection.id)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selection, balloonMenuOpen, toneMenuOpen, panelDeformMode, tool, deleteImage, deleteBalloon, deleteSfx, requestDeletePanel])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const pageToDeleteIndex = pageToDelete ? project.pages.findIndex((p) => p.id === pageToDelete) : -1
  const panelToDeleteObj = panelToDelete
    ? selectedPage?.panels.find((p) => p.id === panelToDelete)
    : null

  const hasPages = project.pages.length > 0
  const splitMin = MIN_PANEL_MM * 2 + GUTTER_MM
  const toolHint = tool !== 'select' ? TOOL_HINTS[tool] : null

  return (
    <div className="flex h-full flex-col bg-neutral-100">
      {/* Barra superior */}
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-neutral-200 bg-white px-4">
        <button
          onClick={async () => {
            await flushSave()
            onExit()
          }}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
        >
          <ChevronLeft size={16} />
          Proyectos
        </button>

        <div className="h-6 w-px bg-neutral-200" />

        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold leading-tight">{project.name}</h1>
          <p className="text-xs leading-tight text-neutral-400">
            {project.page.width} × {project.page.height} mm · {project.pages.length}{' '}
            {project.pages.length === 1 ? 'página' : 'páginas'}
          </p>
        </div>

        <button
          onClick={async () => {
            await flushSave()
            onOpenStory()
          }}
          title="Constructor de historia"
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
        >
          <BookOpenText size={15} />
          Historia
        </button>

        <div className="flex-1" />

        {/* Acciones contextuales: viñeta */}
        {selectedPanel && (
          <>
            <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
              <button
                onClick={() => splitSelectedPanel('vertical')}
                disabled={selectedPanel.w < splitMin}
                title="Dividir la viñeta en dos columnas"
                className="rounded-md p-1.5 text-neutral-600 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm disabled:opacity-30"
              >
                <Columns2 size={15} />
              </button>
              <button
                onClick={() => splitSelectedPanel('horizontal')}
                disabled={selectedPanel.h < splitMin}
                title="Dividir la viñeta en dos filas"
                className="rounded-md p-1.5 text-neutral-600 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm disabled:opacity-30"
              >
                <Rows2 size={15} />
              </button>
              <button
                onClick={fitSelectedPanelToMargins}
                title="Ajustar la viñeta a los márgenes"
                className="rounded-md p-1.5 text-neutral-600 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm"
              >
                <Frame size={15} />
              </button>
              <button
                onClick={togglePanelDeform}
                title="Deformar esquinas (o doble clic en la viñeta)"
                className={`rounded-md p-1.5 transition hover:shadow-sm ${
                  panelDeformMode
                    ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400'
                    : 'text-neutral-600 hover:bg-white hover:text-indigo-600'
                }`}
              >
                <Spline size={15} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setToneMenuOpen((v) => !v)}
                  title="Aplicar una trama de fondo a la viñeta"
                  className={`rounded-md p-1.5 transition hover:shadow-sm ${
                    toneMenuOpen
                      ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400'
                      : 'text-neutral-600 hover:bg-white hover:text-indigo-600'
                  }`}
                >
                  <PaintBucket size={15} />
                </button>
                {toneMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setToneMenuOpen(false)} />
                    <div className="absolute right-0 z-30 mt-1.5 max-h-64 w-52 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl">
                      <button
                        onClick={() => {
                          changePanel(selectedPanel.id, { toneSrc: undefined })
                          setToneMenuOpen(false)
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-neutral-100 ${
                          !selectedPanel.toneSrc ? 'bg-indigo-50 text-indigo-700' : 'text-neutral-600'
                        }`}
                      >
                        Sin trama (blanco)
                      </button>
                      <div className="my-1 h-px bg-neutral-100" />
                      {tramas.map((trama) => (
                          <button
                            key={trama.relPath}
                            onClick={() => {
                              changePanel(selectedPanel.id, { toneSrc: trama.relPath })
                              setToneMenuOpen(false)
                            }}
                            title={trama.name}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-indigo-50 ${
                              selectedPanel.toneSrc === trama.relPath
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-neutral-600'
                            }`}
                          >
                            <span className="h-6 w-6 shrink-0 rounded border border-neutral-200" style={{ backgroundImage: `url(${assetUrl(trama.relPath)})`, backgroundRepeat: 'repeat', backgroundSize: '48px' }} />
                            <span className="truncate">{trama.name}</span>
                          </button>
                        ))
                      }
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => { setAiDefaultTab('generate'); setAiModalOpen(true) }}
                title="Generar fondo con IA (Pollinations)"
                className="rounded-md p-1.5 text-neutral-600 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm"
              >
                <Wand size={15} />
              </button>
              <button
                onClick={() => requestDeletePanel(selectedPanel.id)}
                title="Eliminar viñeta (Supr)"
                className="rounded-md p-1.5 text-neutral-600 transition hover:bg-white hover:text-red-600 hover:shadow-sm"
              >
                <Trash2 size={15} />
              </button>
            </div>

            {/* Ajustes del fondo de IA (si la viñeta tiene fondo) */}
            {selectedPanel.background && (
              <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
                <span className="text-xs font-medium text-neutral-500">Fondo</span>
                <select
                  value={
                    typeof selectedPanel.background.size === 'number'
                      ? 'percent'
                      : selectedPanel.background.size
                  }
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === 'cover' || v === 'contain') patchPanelBackground({ size: v })
                    else patchPanelBackground({ size: 100 })
                  }}
                  className="rounded-md border border-neutral-300 bg-white px-1.5 py-1 text-xs outline-none"
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="percent">%</option>
                </select>
                {typeof selectedPanel.background.size === 'number' && (
                  <input
                    type="range"
                    min={10}
                    max={300}
                    step={5}
                    value={selectedPanel.background.size}
                    onChange={(e) => patchPanelBackground({ size: Number(e.target.value) })}
                    className="h-1.5 w-14 accent-indigo-600"
                  />
                )}
                <span className="text-xs text-neutral-400">X</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={selectedPanel.background.posX}
                  onChange={(e) => patchPanelBackground({ posX: Number(e.target.value) })}
                  className="h-1.5 w-12 accent-indigo-600"
                  title="Posición X"
                />
                <span className="text-xs text-neutral-400">Y</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={selectedPanel.background.posY}
                  onChange={(e) => patchPanelBackground({ posY: Number(e.target.value) })}
                  className="h-1.5 w-12 accent-indigo-600"
                  title="Posición Y"
                />
                <button
                  onClick={() => patchPanelBackground({ repeat: !selectedPanel.background!.repeat })}
                  title={selectedPanel.background.repeat ? 'Repetir: ON' : 'Repetir: OFF'}
                  className={`rounded-md px-2 py-1 text-xs transition ${
                    selectedPanel.background.repeat
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-neutral-500 hover:bg-white'
                  }`}
                >
                  ⟳
                </button>
                <button
                  onClick={removePanelBackground}
                  title="Quitar fondo"
                  className="rounded-md p-1 text-neutral-500 transition hover:bg-white hover:text-red-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
            <div className="h-6 w-px bg-neutral-200" />
          </>
        )}

        {/* Acciones contextuales: globo */}
        {selectedBalloon && (
          <>
            <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
              <button
                onClick={() => adjustSelectedBalloonFont(-0.5)}
                title="Reducir tamaño de letra"
                className="rounded-md px-1.5 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm"
              >
                A−
              </button>
              <button
                onClick={() => adjustSelectedBalloonFont(0.5)}
                title="Aumentar tamaño de letra"
                className="rounded-md px-1.5 py-1.5 text-sm font-semibold text-neutral-600 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm"
              >
                A+
              </button>
              <select
                value={selectedBalloon.fontFamily || ''}
                onChange={(e) => changeBalloon(selectedBalloon.id, { fontFamily: e.target.value || undefined })}
                title="Tipo de letra"
                className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600 outline-none transition hover:border-indigo-400"
              >
                <option value="">Predeterminada</option>
                {MANGA_FONTS.map((f) => (
                  <option key={f.id} value={f.family}>
                    {f.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => changeBalloon(selectedBalloon.id, { shadow: Math.max(0, (selectedBalloon.shadow || 0) - 0.3) })}
                title="Reducir sombra"
                className="rounded-md px-1.5 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm"
              >
                ◻︎−
              </button>
              <button
                onClick={() => changeBalloon(selectedBalloon.id, { shadow: Math.min(4, (selectedBalloon.shadow || 0) + 0.3) })}
                title="Aumentar sombra"
                className="rounded-md px-1.5 py-1.5 text-sm font-semibold text-neutral-600 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm"
              >
                ◻︎+
              </button>
              {selectedBalloon.kind === 'caption' && (
                <select
                  value={selectedBalloon.captionStyle || 'solid'}
                  onChange={(e) => changeBalloon(selectedBalloon.id, { captionStyle: e.target.value as Balloon['captionStyle'] })}
                  title="Estilo de marco"
                  className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600 outline-none transition hover:border-indigo-400"
                >
                  <option value="solid">Sólido</option>
                  <option value="rounded">Redondeado</option>
                  <option value="double">Doble línea</option>
                  <option value="none">Sin marco</option>
                </select>
              )}
              <button
                onClick={() => deleteBalloon(selectedBalloon.id)}
                title="Eliminar globo (Supr)"
                className="rounded-md p-1.5 text-neutral-600 transition hover:bg-white hover:text-red-600 hover:shadow-sm"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="h-6 w-px bg-neutral-200" />
          </>
        )}

        {/* Acciones contextuales: onomatopeya */}
        {selectedSfx && (
          <>
            <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
              <button
                onClick={() => changeSfx(selectedSfx.id, { fontSize: clamp(selectedSfx.fontSize - 1.5, MIN_SFX_FONT_MM, MAX_SFX_FONT_MM) })}
                title="Reducir tamaño"
                className="rounded-md px-1.5 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm"
              >
                A−
              </button>
              <button
                onClick={() => changeSfx(selectedSfx.id, { fontSize: clamp(selectedSfx.fontSize + 1.5, MIN_SFX_FONT_MM, MAX_SFX_FONT_MM) })}
                title="Aumentar tamaño"
                className="rounded-md px-1.5 py-1.5 text-sm font-semibold text-neutral-600 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm"
              >
                A+
              </button>
              <button
                onClick={() => changeSfx(selectedSfx.id, { rotation: selectedSfx.rotation - 15 })}
                title="Girar −15°"
                className="rounded-md p-1.5 text-neutral-600 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => changeSfx(selectedSfx.id, { rotation: selectedSfx.rotation + 15 })}
                title="Girar +15°"
                className="rounded-md p-1.5 text-neutral-600 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm"
              >
                <RotateCw size={14} />
              </button>
              <button
                onClick={cycleSfxStyle}
                title={`Estilo: ${SFX_STYLES.find((s) => s.id === selectedSfx.style)?.label} (clic para cambiar)`}
                className="rounded-md p-1.5 text-neutral-600 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm"
              >
                <Type size={14} />
              </button>
              <select
                value={selectedSfx.fontFamily || ''}
                onChange={(e) => changeSfx(selectedSfx.id, { fontFamily: e.target.value || undefined })}
                title="Tipo de letra"
                className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600 outline-none transition hover:border-indigo-400"
              >
                <option value="">Por estilo</option>
                {MANGA_FONTS.map((f) => (
                  <option key={f.id} value={f.family}>
                    {f.label}
                  </option>
                ))}
              </select>
              <button
                onClick={cycleSfxColor}
                title="Cambiar color"
                className="rounded-md p-1.5 transition hover:bg-white hover:shadow-sm"
                style={{ color: selectedSfx.color === '#ffffff' ? '#9ca3af' : selectedSfx.color }}
              >
                <Palette size={14} />
              </button>
              <button
                onClick={() => deleteSfx(selectedSfx.id)}
                title="Eliminar onomatopeya (Supr)"
                className="rounded-md p-1.5 text-neutral-600 transition hover:bg-white hover:text-red-600 hover:shadow-sm"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="h-6 w-px bg-neutral-200" />
          </>
        )}

        {/* Acciones contextuales: imagen */}
        {selectedImageInfo && (
          <>
            <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
              <button
                onClick={fitSelectedImage}
                title={selectedImageInfo.panel ? 'Ajustar la imagen a la viñeta' : 'Ajustar la imagen a los márgenes'}
                className="rounded-md p-1.5 text-neutral-600 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm"
              >
                <Frame size={15} />
              </button>
              <button
                onClick={() => deleteImage(selectedImageInfo.img.id)}
                title="Eliminar imagen (Supr)"
                className="rounded-md p-1.5 text-neutral-600 transition hover:bg-white hover:text-red-600 hover:shadow-sm"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="h-6 w-px bg-neutral-200" />
          </>
        )}

        {/* Ajustes de la pluma */}
        {tool === 'pen' && !selection && (
          <>
            <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-1.5">
              {PEN_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setPenColor(color)}
                  title={`Tinta ${color}`}
                  style={{ backgroundColor: color }}
                  className={`h-5 w-5 rounded-full border border-black/20 transition ${
                    penColor === color ? 'ring-2 ring-indigo-500 ring-offset-1' : 'hover:scale-110'
                  }`}
                />
              ))}
              <div className="mx-1 h-5 w-px bg-neutral-300" />
              {PEN_WIDTHS_MM.map((width, i) => (
                <button
                  key={width}
                  onClick={() => setPenWidth(width)}
                  title={`Grosor ${width} mm`}
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
                    penWidth === width ? 'bg-indigo-100 ring-1 ring-indigo-400' : 'hover:bg-white'
                  }`}
                >
                  <span className="rounded-full bg-neutral-700" style={{ width: 3 + i * 3, height: 3 + i * 3 }} />
                </button>
              ))}
            </div>
            <div className="h-6 w-px bg-neutral-200" />
          </>
        )}

        {/* Ajustes del timbre */}
        {tool === 'stamp' && !selection && (
          <>
            <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
              {STAMP_PATTERNS.map((pattern) => (
                <button
                  key={pattern.id}
                  onClick={() => setStampPattern(pattern.id)}
                  title={pattern.label}
                  className={`rounded-md px-2 py-1.5 text-xs font-medium transition ${
                    stampPattern === pattern.id
                      ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400'
                      : 'text-neutral-600 hover:bg-white hover:text-indigo-600'
                  }`}
                >
                  {pattern.label}
                </button>
              ))}
              <div className="mx-1 h-5 w-px bg-neutral-300" />
              <div className="flex items-center gap-1.5 rounded px-1.5">
                <input
                  type="range"
                  min={5}
                  max={40}
                  step={1}
                  value={stampSize}
                  onChange={(e) => setStampSize(Number(e.target.value))}
                  className="h-1.5 w-16 accent-indigo-600"
                />
                <span className="w-10 text-center text-xs tabular-nums text-neutral-600">
                  {stampSize}mm
                </span>
              </div>
            </div>
            <div className="h-6 w-px bg-neutral-200" />
          </>
        )}

        {/* Zoom */}
        <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
          <button
            onClick={() => setZoom((z) => clamp(z / 1.2, MIN_ZOOM, MAX_ZOOM))}
            className="rounded-md p-1.5 text-neutral-500 transition hover:bg-white hover:text-neutral-800 hover:shadow-sm"
            title="Alejar"
          >
            <ZoomOut size={15} />
          </button>
          <span className="w-11 text-center text-xs font-medium tabular-nums text-neutral-600">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => clamp(z * 1.2, MIN_ZOOM, MAX_ZOOM))}
            className="rounded-md p-1.5 text-neutral-500 transition hover:bg-white hover:text-neutral-800 hover:shadow-sm"
            title="Acercar"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => setZoom(fitZoom())}
            className="rounded-md p-1.5 text-neutral-500 transition hover:bg-white hover:text-neutral-800 hover:shadow-sm"
            title="Ajustar a la ventana"
          >
            <Maximize2 size={15} />
          </button>
        </div>

        <button
          onClick={() => window.yusepe.openProjectFolder()}
          title="Abrir carpeta del proyecto"
          className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-500 shadow-sm transition hover:text-indigo-600"
        >
          <FolderOpen size={16} />
        </button>

        {/* Estado de guardado */}
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
        {/* Barra de herramientas */}
        <ToolStrip
          tool={tool}
          onTool={changeTool}
          hasPages={hasPages}
          balloonMenuOpen={balloonMenuOpen}
          onBalloonMenu={setBalloonMenuOpen}
          onAddBalloon={addBalloon}
          onImportImages={importViaDialog}
          onAddSfx={addSfx}
          onOpenAiLibrary={() => {
            setAiDefaultTab('library')
            setAiModalOpen(true)
          }}
        />

        {/* Panel de páginas */}
        <aside className="w-44 shrink-0 border-r border-neutral-200 bg-white">
          <PagesPanel
            pages={project.pages}
            setup={project.page}
            selectedPageId={selectedPageId}
            onSelect={(id) => {
              setSelectedPageId(id)
              setSelection(null)
              setEditingBalloonId(null)
              setEditingSfxId(null)
            }}
            onAdd={addPage}
            onMove={movePage}
            onDelete={setPageToDelete}
          />
        </aside>

        {/* Lienzo */}
        <main ref={canvasAreaRef} className="relative flex-1 overflow-auto bg-neutral-200/70">
          {selectedPage ? (
            <div className="m-auto w-fit p-10">
              <PageCanvas
                page={selectedPage}
                setup={project.page}
                scale={scale}
                selection={selection}
                tool={tool}
                penColor={penColor}
                penWidth={penWidth}
                stampPattern={stampPattern}
                stampSize={stampSize}
                panelDeformMode={panelDeformMode}
                editingBalloonId={editingBalloonId}
                editingSfxId={editingSfxId}
                onSelect={setSelection}
                onCreatePanel={createPanel}
                onChangePanel={changePanel}
                onShiftPanelImages={shiftPanelImages}
                onTogglePanelDeform={togglePanelDeform}
                onChangeImage={changeImage}
                onChangeBalloon={changeBalloon}
                onEditBalloon={setEditingBalloonId}
                onChangeSfx={changeSfx}
                onEditSfx={setEditingSfxId}
                onAddStroke={addStroke}
                onEraseAt={eraseAt}
                onAddStamp={addStamp}
                onDropFiles={importDroppedPaths}
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm text-neutral-500">Este proyecto no tiene páginas todavía.</p>
              <button
                onClick={addPage}
                className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                <Plus size={16} />
                Añadir la primera página
              </button>
            </div>
          )}

          {/* Ayudas de modo */}
          {(toolHint || (panelDeformMode && selectedPanel)) && (
            <div className="pointer-events-none sticky bottom-4 z-10 flex justify-center">
              <span className="rounded-full bg-neutral-900/85 px-4 py-1.5 text-xs font-medium text-white shadow-lg">
                {panelDeformMode && selectedPanel
                  ? 'Arrastra las esquinas de la viñeta para deformarla · Esc para salir'
                  : toolHint}
              </span>
            </div>
          )}
        </main>
      </div>

      {/* Constructor de personajes */}
      <CharacterBuilderModal
        key={characterBuilder.initial?.id ?? 'new'}
        open={characterBuilder.open}
        initial={characterBuilder.initial}
        onSave={saveCharacter}
        onClose={() => setCharacterBuilder({ open: false, initial: null })}
      />

      {/* Modal de generación de fondos con IA */}
      <AIBackgroundModal
        open={aiModalOpen}
        panelWidth={selectedPanel?.w ?? project.page.width}
        panelHeight={selectedPanel?.h ?? project.page.height}
        library={project.aiLibrary ?? []}
        defaultTab={aiDefaultTab}
        onApply={applyPanelBackground}
        onAddToLibrary={addAILibraryItem}
        onClose={() => setAiModalOpen(false)}
      />

      {/* Confirmación de borrado de página */}
      <Modal
        open={pageToDelete !== null}
        title="Eliminar página"
        confirmLabel="Eliminar"
        danger
        onConfirm={confirmDeletePage}
        onCancel={() => setPageToDelete(null)}
      >
        {pageToDeleteIndex >= 0 && (
          <>
            Se eliminará la página {pageToDeleteIndex + 1} con todo su contenido. Las imágenes
            seguirán en la carpeta assets del proyecto, pero esta acción no se puede deshacer.
          </>
        )}
      </Modal>

      {/* Confirmación de borrado de viñeta con imágenes */}
      <Modal
        open={panelToDelete !== null}
        title="Eliminar viñeta"
        confirmLabel="Eliminar"
        danger
        onConfirm={confirmDeletePanel}
        onCancel={() => setPanelToDelete(null)}
      >
        {panelToDeleteObj && (
          <>
            La viñeta contiene {panelToDeleteObj.images.length}{' '}
            {panelToDeleteObj.images.length === 1 ? 'elemento' : 'elementos'} que también se
            eliminarán del maquetado. Los archivos seguirán en la carpeta assets del proyecto.
          </>
        )}
      </Modal>
    </div>
  )
}
