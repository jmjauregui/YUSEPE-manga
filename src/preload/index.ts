import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  CreateProjectPayload,
  ImportedAsset,
  MangaProject,
  OpenProjectResult,
  RecentProject,
} from '../shared/types'

/**
 * API expuesta al renderer como window.yusepe.
 * Toda comunicación con el sistema de archivos pasa por aquí (contextBridge),
 * el renderer nunca tiene acceso directo a Node.
 */
const api = {
  // Diálogos
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectFolder'),

  // Ciclo de vida del proyecto
  createProject: (payload: CreateProjectPayload): Promise<OpenProjectResult> =>
    ipcRenderer.invoke('project:create', payload),
  openProjectDialog: (): Promise<OpenProjectResult | null> => ipcRenderer.invoke('project:openDialog'),
  openProjectPath: (filePath: string): Promise<OpenProjectResult> =>
    ipcRenderer.invoke('project:openPath', filePath),
  saveProject: (filePath: string, project: MangaProject): Promise<boolean> =>
    ipcRenderer.invoke('project:save', filePath, project),

  // Proyectos recientes
  listRecents: (): Promise<RecentProject[]> => ipcRenderer.invoke('recents:list'),
  removeRecent: (filePath: string): Promise<boolean> => ipcRenderer.invoke('recents:remove', filePath),

  // Assets
  importImages: (): Promise<ImportedAsset[]> => ipcRenderer.invoke('images:import'),
  importImagePaths: (paths: string[]): Promise<ImportedAsset[]> =>
    ipcRenderer.invoke('images:importPaths', paths),
  downloadImage: (url: string): Promise<ImportedAsset | null> =>
    ipcRenderer.invoke('images:download', url),
  listTramas: (): Promise<ImportedAsset[]> => ipcRenderer.invoke('tramas:list'),
  getAiToken: (): Promise<string> => ipcRenderer.invoke('ai:token'),
  openProjectFolder: (): Promise<void> => ipcRenderer.invoke('folder:open'),

  /** Convierte un File (de drag & drop) en una ruta absoluta de disco. */
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
}

contextBridge.exposeInMainWorld('yusepe', api)

export type YusepeApi = typeof api
