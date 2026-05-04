import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateDownloaded: (callback: (releaseName: string) => void) => {
    ipcRenderer.on('update-downloaded', (_event, releaseName) => callback(releaseName))
  },
  onUpdateNotAvailable: (callback: () => void) => {
    ipcRenderer.on('update-not-available', () => callback())
  },
  loadCourses: () => ipcRenderer.invoke('load-courses'),
  saveCourses: (courses: any) => ipcRenderer.invoke('save-courses', courses),
  generatePDF: (data: any) => ipcRenderer.invoke('generate-pdf', data),
  exportCourses: (courses: any) => ipcRenderer.invoke('export-courses', courses),
  importCourses: () => ipcRenderer.invoke('import-courses')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
