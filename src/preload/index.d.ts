import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getAppVersion: () => Promise<string>
      loadCourses: () => Promise<any>
      saveCourses: (courses: any) => Promise<boolean>
      generatePDF: (data: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>
      exportCourses: (courses: any) => Promise<{ success: boolean; filePath?: string; error?: string }>
      importCourses: () => Promise<{ success: boolean; courses?: any; error?: string }>
    }
  }
}
