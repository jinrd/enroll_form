import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Courses, PdfData } from '../shared/types'

const api = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateDownloaded: (callback: (releaseName: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, releaseName: string) =>
      callback(releaseName)
    ipcRenderer.on('update-downloaded', listener)
    return () => ipcRenderer.removeListener('update-downloaded', listener)
  },
  onUpdateNotAvailable: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('update-not-available', listener)
    return () => ipcRenderer.removeListener('update-not-available', listener)
  },
  onUpdateError: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message)
    ipcRenderer.on('update-error', listener)
    return () => ipcRenderer.removeListener('update-error', listener)
  },
  loadCourses: () => ipcRenderer.invoke('load-courses'),
  saveCourses: (courses: Courses) => ipcRenderer.invoke('save-courses', courses),
  generatePDF: (data: PdfData) => ipcRenderer.invoke('generate-pdf', data),
  exportCourses: (courses: Courses) => ipcRenderer.invoke('export-courses', courses),
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
