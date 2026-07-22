import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import fsp from 'node:fs/promises'

// Cargar .env manualmente (sin dependencia extra) para acceder a APIKEY_pollinations
try {
  const envPath = path.join(app.getAppPath(), '.env')
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
    }
  }
} catch { /* .env no existe o no se puede leer */ }
import type {
  CreateProjectPayload,
  ImportedAsset,
  MangaProject,
  OpenProjectResult,
  RecentProject,
} from '../shared/types'

const PROJECT_FILE_NAME = 'project.ymanga'
const ASSETS_DIR = 'assets'
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif']
const TRAMAS_DIR = 'tramas_vignetas'
const MAX_RECENTS = 12

let mainWindow: BrowserWindow | null = null
/** Carpeta del proyecto actualmente abierto; el protocolo ymg:// sirve archivos desde aquí. */
let currentProjectFolder: string | null = null

// ---------------------------------------------------------------------------
// Proyectos recientes (persistidos en userData/recent-projects.json)
// ---------------------------------------------------------------------------

function recentsFilePath(): string {
  return path.join(app.getPath('userData'), 'recent-projects.json')
}

async function readRecents(): Promise<RecentProject[]> {
  try {
    const raw = await fsp.readFile(recentsFilePath(), 'utf-8')
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

async function writeRecents(list: RecentProject[]): Promise<void> {
  await fsp.mkdir(path.dirname(recentsFilePath()), { recursive: true })
  await fsp.writeFile(recentsFilePath(), JSON.stringify(list, null, 2), 'utf-8')
}

async function upsertRecent(entry: RecentProject): Promise<void> {
  const list = await readRecents()
  const idx = list.findIndex((r) => r.filePath === entry.filePath)
  if (idx >= 0) list.splice(idx, 1)
  list.unshift(entry)
  await writeRecents(list.slice(0, MAX_RECENTS))
}

// ---------------------------------------------------------------------------
// Helpers de archivos
// ---------------------------------------------------------------------------

async function uniqueAssetName(folder: string, originalPath: string): Promise<string> {
  const ext = path.extname(originalPath).toLowerCase()
  const base =
    path
      .basename(originalPath, ext)
      .replace(/[^\w-]+/g, '-')
      .toLowerCase() || 'imagen'
  let candidate = `${base}${ext}`
  let i = 1
  while (fs.existsSync(path.join(folder, ASSETS_DIR, candidate))) {
    candidate = `${base}-${i}${ext}`
    i++
  }
  return candidate
}

/** Copia un archivo externo dentro de assets/ y devuelve su referencia relativa. */
async function copyIntoAssets(folder: string, sourcePath: string): Promise<ImportedAsset> {
  const assetsPath = path.join(folder, ASSETS_DIR)
  await fsp.mkdir(assetsPath, { recursive: true })
  const fileName = await uniqueAssetName(folder, sourcePath)
  await fsp.copyFile(sourcePath, path.join(assetsPath, fileName))
  return { fileName, relPath: `${ASSETS_DIR}/${fileName}` }
}

/** Siembra las tramas built-in en el proyecto copiándolas desde assets/tramas_vignetas/ de la app. */
async function seedTramas(folder: string): Promise<void> {
  const srcDir = path.join(app.getAppPath(), 'assets', TRAMAS_DIR)
  const destDir = path.join(folder, ASSETS_DIR, TRAMAS_DIR)
  await fsp.mkdir(destDir, { recursive: true })
  try {
    const entries = await fsp.readdir(srcDir)
    for (const fileName of entries) {
      if (!fileName.toLowerCase().endsWith('.svg')) continue
      const dest = path.join(destDir, fileName)
      if (fs.existsSync(dest)) continue
      try {
        await fsp.copyFile(path.join(srcDir, fileName), dest)
      } catch { /* saltear si falla la copia individual */ }
    }
  } catch { /* carpeta fuente no existe (p.ej. en producción sin assets/) */ }
}

function isValidProject(data: unknown): data is MangaProject {
  if (!data || typeof data !== 'object') return false
  const p = data as MangaProject
  return (
    typeof p.name === 'string' &&
    Array.isArray(p.pages) &&
    !!p.page &&
    typeof p.page.width === 'number' &&
    typeof p.page.height === 'number'
  )
}

/** Asegura que páginas de proyectos antiguos tengan todos los campos del formato actual. */
function normalizeProject(project: MangaProject): void {
  project.story ??= { premise: '', chapters: [] }
  project.characters ??= []
  project.library ??= []
  project.aiLibrary ??= []
  for (const page of project.pages) {
    page.images ??= []
    page.panels ??= []
    page.balloons ??= []
    page.strokes ??= []
    page.stamps ??= []
    page.sfx ??= []
    for (const panel of page.panels) {
      panel.images ??= []
      // Viñetas antiguas (rectangulares) sin vértices definidos
      panel.corners ??= [
        { x: 0, y: 0 },
        { x: panel.w, y: 0 },
        { x: panel.w, y: panel.h },
        { x: 0, y: panel.h },
      ]
    }
  }
}

async function loadProjectFromPath(filePath: string): Promise<OpenProjectResult> {
  if (!fs.existsSync(filePath)) return { filePath, error: 'MISSING' }
  try {
    const raw = await fsp.readFile(filePath, 'utf-8')
      const project = JSON.parse(raw)
      if (!isValidProject(project)) return { filePath, error: 'INVALID' }
      normalizeProject(project)
      const folder = path.dirname(filePath)
      currentProjectFolder = folder
      await seedTramas(folder)
      await fsp.mkdir(path.join(folder, ASSETS_DIR), { recursive: true })
    await upsertRecent({
      name: project.name,
      filePath,
      lastOpened: new Date().toISOString(),
      pageCount: project.pages.length,
    })
    return { project, filePath, folder }
  } catch {
    return { filePath, error: 'INVALID' }
  }
}

// ---------------------------------------------------------------------------
// Ventana principal
// ---------------------------------------------------------------------------

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    title: 'YUSEPE manga',
    backgroundColor: '#f4f4f5',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// El protocolo ymg:// sirve los archivos del proyecto abierto (assets, etc.)
// de forma segura al renderer, sin exponer file:// ni desactivar webSecurity.
protocol.registerSchemesAsPrivileged([
  { scheme: 'ymg', privileges: { secure: true, supportFetchAPI: true, stream: true } },
])

app.whenReady().then(() => {
  protocol.handle('ymg', (request) => {
    try {
      if (!currentProjectFolder) return new Response('Sin proyecto activo', { status: 404 })
      const url = new URL(request.url)
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
      const root = path.resolve(currentProjectFolder)
      const abs = path.resolve(root, rel)
      if (abs !== root && !abs.startsWith(root + path.sep)) {
        return new Response('Prohibido', { status: 403 })
      }
      return net.fetch(pathToFileURL(abs).toString())
    } catch {
      return new Response('Error interno', { status: 500 })
    }
  })

  // -------------------------------------------------------------------------
  // IPC
  // -------------------------------------------------------------------------

  ipcMain.handle('dialog:selectFolder', async (): Promise<string | null> => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecciona la carpeta del proyecto',
      buttonLabel: 'Seleccionar carpeta',
      properties: ['openDirectory', 'createDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('project:create', async (_event, payload: CreateProjectPayload): Promise<OpenProjectResult> => {
    const { name, folder, page } = payload
    if (!name || !name.trim()) throw new Error('El nombre del proyecto es obligatorio')
    if (!folder) throw new Error('Debes seleccionar una carpeta para el proyecto')

    await fsp.mkdir(folder, { recursive: true })
    const filePath = path.join(folder, PROJECT_FILE_NAME)
    if (fs.existsSync(filePath)) throw new Error('PROJECT_EXISTS')

    await fsp.mkdir(path.join(folder, ASSETS_DIR), { recursive: true })
    await seedTramas(folder)

    const project: MangaProject = {
      version: 1,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      page,
      pages: [{ id: randomUUID(), images: [], panels: [], balloons: [], strokes: [], stamps: [], sfx: [] }],
      story: { premise: '', chapters: [] },
      characters: [],
      library: [],
      aiLibrary: [],
    }
    await fsp.writeFile(filePath, JSON.stringify(project, null, 2), 'utf-8')

    currentProjectFolder = folder
    await upsertRecent({
      name: project.name,
      filePath,
      lastOpened: new Date().toISOString(),
      pageCount: project.pages.length,
    })
    return { project, filePath, folder }
  })

  ipcMain.handle('project:openDialog', async (): Promise<OpenProjectResult | null> => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Abrir proyecto',
      buttonLabel: 'Abrir',
      filters: [{ name: 'Proyecto YUSEPE manga', extensions: ['ymanga'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return loadProjectFromPath(result.filePaths[0])
  })

  ipcMain.handle('project:openPath', (_event, filePath: string): Promise<OpenProjectResult> => {
    return loadProjectFromPath(filePath)
  })

  ipcMain.handle('project:save', async (_event, filePath: string, project: MangaProject): Promise<boolean> => {
    await fsp.writeFile(filePath, JSON.stringify(project, null, 2), 'utf-8')
    await upsertRecent({
      name: project.name,
      filePath,
      lastOpened: new Date().toISOString(),
      pageCount: project.pages.length,
    })
    return true
  })

  ipcMain.handle('recents:list', async (): Promise<RecentProject[]> => {
    const list = await readRecents()
    return list.map((r) => ({ ...r, missing: !fs.existsSync(r.filePath) }))
  })

  ipcMain.handle('recents:remove', async (_event, filePath: string): Promise<boolean> => {
    const list = await readRecents()
    await writeRecents(list.filter((r) => r.filePath !== filePath))
    return true
  })

  ipcMain.handle('images:import', async (): Promise<ImportedAsset[]> => {
    if (!mainWindow || !currentProjectFolder) return []
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Importar imágenes',
      buttonLabel: 'Importar',
      filters: [{ name: 'Imágenes', extensions: IMAGE_EXTENSIONS }],
      properties: ['openFile', 'multiSelections'],
    })
    if (result.canceled) return []
    const imported: ImportedAsset[] = []
    for (const p of result.filePaths) {
      imported.push(await copyIntoAssets(currentProjectFolder, p))
    }
    return imported
  })

  ipcMain.handle('images:importPaths', async (_event, paths: string[]): Promise<ImportedAsset[]> => {
    if (!currentProjectFolder || !Array.isArray(paths)) return []
    const imported: ImportedAsset[] = []
    for (const p of paths) {
      const ext = path.extname(p).slice(1).toLowerCase()
      if (IMAGE_EXTENSIONS.includes(ext) && fs.existsSync(p)) {
        imported.push(await copyIntoAssets(currentProjectFolder, p))
      }
    }
    return imported
  })

  /** Descarga una URL remota (p. ej. Pollinations) y la guarda en assets/ */
  ipcMain.handle('images:download', async (_event, url: string): Promise<ImportedAsset | null> => {
    if (!currentProjectFolder) return null
    try {
      const response = await net.fetch(url)
      if (!response.ok) return null
      const buffer = Buffer.from(await response.arrayBuffer())
      const contentType = response.headers.get('content-type') || 'image/png'
      const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png'
      const fileName = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const assetsPath = path.join(currentProjectFolder, ASSETS_DIR)
      await fsp.mkdir(assetsPath, { recursive: true })
      await fsp.writeFile(path.join(assetsPath, fileName), buffer)
      return { fileName, relPath: `${ASSETS_DIR}/${fileName}` }
    } catch {
      return null
    }
  })

  ipcMain.handle('ai:token', (): string => {
    return process.env.APIKEY_pollinations ?? ''
  })

  ipcMain.handle('tramas:list', async (): Promise<ImportedAsset[]> => {
    if (!currentProjectFolder) return []
    const dir = path.join(currentProjectFolder, ASSETS_DIR, TRAMAS_DIR)
    try {
      await seedTramas(currentProjectFolder)
      const entries = await fsp.readdir(dir)
      return entries
        .filter((f) => f.toLowerCase().endsWith('.svg'))
        .map((f) => ({
          fileName: path.basename(f, '.svg'),
          relPath: `${ASSETS_DIR}/${TRAMAS_DIR}/${f}`,
        }))
    } catch {
      return []
    }
  })

  ipcMain.handle('folder:open', async (): Promise<void> => {
    if (currentProjectFolder) await shell.openPath(currentProjectFolder)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
