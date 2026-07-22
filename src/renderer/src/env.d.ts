import type { YusepeApi } from '../../preload/index'

declare global {
  interface Window {
    yusepe: YusepeApi
  }
}

export {}
