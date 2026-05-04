import { app, shell, BrowserWindow, ipcMain, dialog, autoUpdater } from 'electron'
import { join } from 'path'
import fs from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { loadCourses, saveCourses } from './courseService'
import { generatePDF } from './pdfService'

if (require('electron-squirrel-startup')) {
  app.quit()
}

// 하드웨어 가속 비활성화 (일부 PC에서의 팅김 방지)
app.disableHardwareAcceleration();

// 앱 이름 강제 설정 (Electron 24 이슈 대응)
app.setName('pdf 생성기');

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
        sandbox: false
      }
    })

    mainWindow.on('ready-to-show', () => {
      mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
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
      console.error('Feed URL 설정 오류:', err);
    }

    // 업데이트 확인 및 알림 설정
    setTimeout(() => {
      try {
        autoUpdater.checkForUpdates()
      } catch (err: any) {
        console.error('업데이트 자동 실행 오류:', err.message);
      }
    }, 3000);

    autoUpdater.on('checking-for-update', () => {
      // dialog.showMessageBox({ type: 'info', title: '업데이트 확인', message: '새 버전을 확인 중입니다...' });
    });

    autoUpdater.on('update-not-available', () => {
      // dialog.showMessageBox({ type: 'info', title: '최신 버전', message: `현재 최신 버전을 사용 중입니다.` });
    });

    // 업데이트가 다운로드 되었을 때 (네이티브 autoUpdater는 update-available과 다운로드가 동시에 일어남)
    autoUpdater.on('update-downloaded', (_event, _releaseNotes, releaseName) => {
      dialog.showMessageBox({
        type: 'info',
        title: '업데이트 안내',
        message: `새로운 버전(${releaseName}) 업데이트 파일이 다운로드되었습니다. 프로그램을 재시작하여 적용하시겠습니까?`,
        buttons: ['지금 재시작', '나중에']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
    })

    // 에러 발생 시
    autoUpdater.on('error', (err) => {
      console.error('Update error:', err)
      dialog.showErrorBox('업데이트 오류', `업데이트 확인 중 오류가 발생했습니다.\n\n${err.message}`)
    })

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    ipcMain.on('ping', () => console.log('pong'))
    
    ipcMain.handle('get-app-version', () => app.getVersion())

    ipcMain.handle('load-courses', () => {
      return loadCourses()
    })

    ipcMain.handle('save-courses', (_, courses) => {
      return saveCourses(courses)
    })

    ipcMain.handle('generate-pdf', async (_, data) => {
      return await generatePDF(data)
    })

    ipcMain.handle('export-courses', async (_, courses) => {
      try {
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: '과목 데이터 백업(내보내기)',
          defaultPath: join(app.getPath('desktop'), '과목백업.json'),
          filters: [{ name: 'JSON 파일', extensions: ['json'] }]
        })
        if (canceled || !filePath) return { success: false }
        fs.writeFileSync(filePath, JSON.stringify(courses, null, 4), 'utf-8')
        return { success: true, filePath }
      } catch (error: any) {
        console.error('Export error:', error)
        return { success: false, error: error.message }
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
        const courses = JSON.parse(data)
        return { success: true, courses }
      } catch (error: any) {
        console.error('Import error:', error)
        return { success: false, error: error.message }
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
