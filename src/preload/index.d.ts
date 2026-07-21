import { ElectronAPI } from '@electron-toolkit/preload'
import type { Courses, ExportResult, ImportResult, PdfData, PdfResult } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getAppVersion: () => Promise<string>
      checkUpdate: () => Promise<void>
      installUpdate: () => Promise<void>
      onUpdateDownloaded: (callback: (releaseName: string) => void) => () => void
      onUpdateNotAvailable: (callback: () => void) => () => void
      onUpdateError: (callback: (message: string) => void) => () => void
      loadCourses: () => Promise<Courses>
      saveCourses: (courses: Courses) => Promise<boolean>
      generatePDF: (data: PdfData) => Promise<PdfResult>
      exportCourses: (courses: Courses) => Promise<ExportResult>
      importCourses: () => Promise<ImportResult>
    }
  }
}
