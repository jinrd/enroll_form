import { app, shell, BrowserWindow, ipcMain, dialog, autoUpdater } from 'electron'
import { join } from 'path'
import fs from 'node:fs'
import squirrelStartup from 'electron-squirrel-startup'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { loadCourses, saveCourses } from './courseService'
import { generatePDF } from './pdfService'
import { isCourses, isPdfData } from '../shared/types'

if (squirrelStartup) {
  app.quit()
}

// 하드웨어 가속 비활성화 (일부 PC에서의 팅김 방지)
app.disableHardwareAcceleration()

// 앱 이름 강제 설정 (Electron 24 이슈 대응)
app.setName('pdf 생성기')

// 싱글 인스턴스 락 설정
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  // 예기치 못한 에러 발생 시 프로그램이 그냥 꺼지지 않고 메시지를 보여주도록 설정
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    dialog.showErrorBox('시스템 오류', `예기치 못한 오류가 발생했습니다:\n${error.message}`)
  })

  function createWindow(): void {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
      width: 900,
      height: 950,
      show: false,
      autoHideMenuBar: true,
      title: 'pdf 생성기',
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })

    mainWindow.on('ready-to-show', () => {
      mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
      const url = new URL(details.url)
      if (url.protocol === 'https:') void shell.openExternal(url.toString())
      return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  app.whenReady().then(() => {
    // Set app user model id for windows notifications
    electronApp.setAppUserModelId('com.pdf.generator.app')

    // 네이티브 autoUpdater의 서버 설정
    const server = 'https://update.electronjs.org'
    const url = `${server}/jinrd/enroll_form/${process.platform}-${process.arch}/${app.getVersion()}`

    // 네이티브 모듈은 setFeedURL을 반드시 호출해야 합니다
    try {
      autoUpdater.setFeedURL({ url })
    } catch (err) {
      console.error('Feed URL 설정 오류:', err)
    }

    // 업데이트 확인 및 알림 설정
    if (app.isPackaged) {
      setTimeout(() => {
        try {
          autoUpdater.checkForUpdates()
        } catch (error: unknown) {
          console.error(
            '업데이트 자동 실행 오류:',
            error instanceof Error ? error.message : '알 수 없는 오류'
          )
        }
      }, 10000)
    }

    autoUpdater.on('checking-for-update', () => {
      // 콘솔 로깅
    })

    let manualUpdateCheck = false

    autoUpdater.on('update-not-available', () => {
      if (manualUpdateCheck) {
        BrowserWindow.getAllWindows().forEach((window) =>
          window.webContents.send('update-not-available')
        )
      }
      manualUpdateCheck = false
    })

    // 업데이트가 다운로드 되었을 때 (네이티브 autoUpdater는 update-available과 다운로드가 동시에 일어남)
    autoUpdater.on('update-downloaded', (_event, _releaseNotes, releaseName) => {
      BrowserWindow.getAllWindows().forEach((w) =>
        w.webContents.send('update-downloaded', releaseName)
      )
    })

    // 에러 발생 시
    autoUpdater.on('error', (err) => {
      console.error('Update error:', err)
      if (manualUpdateCheck) {
        BrowserWindow.getAllWindows().forEach((window) =>
          window.webContents.send('update-error', err.message)
        )
      }
      manualUpdateCheck = false
    })

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    ipcMain.on('ping', () => console.log('pong'))

    ipcMain.handle('get-app-version', () => app.getVersion())

    ipcMain.handle('check-update', async () => {
      if (!app.isPackaged) {
        BrowserWindow.getAllWindows().forEach((window) =>
          window.webContents.send('update-error', '개발 모드에서는 업데이트를 확인할 수 없습니다.')
        )
        return
      }
      manualUpdateCheck = true
      try {
        await autoUpdater.checkForUpdates()
      } catch (error) {
        if (manualUpdateCheck) {
          const message = error instanceof Error ? error.message : '알 수 없는 오류'
          BrowserWindow.getAllWindows().forEach((window) =>
            window.webContents.send('update-error', message)
          )
        }
        manualUpdateCheck = false
      }
    })

    ipcMain.handle('install-update', () => {
      autoUpdater.quitAndInstall()
    })

    ipcMain.handle('load-courses', () => {
      return loadCourses()
    })

    ipcMain.handle('save-courses', (_, courses) => {
      if (!isCourses(courses)) return false
      return saveCourses(courses)
    })

    ipcMain.handle('generate-pdf', async (_, data) => {
      if (!isPdfData(data)) return { success: false, error: '잘못된 PDF 데이터입니다.' }
      return await generatePDF(data)
    })

    ipcMain.handle('export-courses', async (_, courses) => {
      try {
        if (!isCourses(courses)) return { success: false, error: '잘못된 과목 데이터입니다.' }
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: '과목 데이터 백업(내보내기)',
          defaultPath: join(app.getPath('desktop'), '과목백업.json'),
          filters: [{ name: 'JSON 파일', extensions: ['json'] }]
        })
        if (canceled || !filePath) return { success: false }
        fs.writeFileSync(filePath, JSON.stringify(courses, null, 4), 'utf-8')
        return { success: true, filePath }
      } catch (error: unknown) {
        console.error('Export error:', error)
        return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' }
      }
    })

    ipcMain.handle('import-courses', async () => {
      try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
          title: '과목 데이터 복구(불러오기)',
          filters: [{ name: 'JSON 파일', extensions: ['json'] }],
          properties: ['openFile']
        })
        if (canceled || filePaths.length === 0) return { success: false }
        const data = fs.readFileSync(filePaths[0], 'utf-8')
        const courses: unknown = JSON.parse(data)
        if (!isCourses(courses)) {
          return { success: false, error: '과목 백업 형식이 올바르지 않습니다.' }
        }
        return { success: true, courses }
      } catch (error: unknown) {
        console.error('Import error:', error)
        return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' }
      }
    })

    createWindow()

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
