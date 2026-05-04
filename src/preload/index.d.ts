import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getAppVersion: () => Promise<string>
      checkUpdate: () => Promise<void>
      installUpdate: () => Promise<void>
      onUpdateDownloaded: (callback: (releaseName: string) => void) => void
      onUpdateNotAvailable: (callback: () => void) => void
      loadCourses: () => Promise<any>
      saveCourses: (courses: any) => Promise<boolean>
      generatePDF: (data: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      exportCourses: (courses: any) => Promise<{ success: boolean; filePath?: string; error?: string }>
      importCourses: () => Promise<{ success: boolean; courses?: any; error?: string }>
    }
  }
}
