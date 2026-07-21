import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const electronEntry = require.resolve('electron')
const electronDirectory = path.dirname(electronEntry)
const executableByPlatform = {
  darwin: 'Electron.app/Contents/MacOS/Electron',
  linux: 'electron',
  win32: 'electron.exe'
}
const executablePath = executableByPlatform[process.platform]

if (!executablePath) process.exit(0)

const absoluteExecutablePath = path.join(electronDirectory, 'dist', executablePath)
if (!fs.existsSync(absoluteExecutablePath)) {
  console.error('Electron executable is missing. Run `pnpm install` again.')
  process.exit(1)
}

const pathFile = path.join(electronDirectory, 'path.txt')
if (!fs.existsSync(pathFile) || fs.readFileSync(pathFile, 'utf8') !== executablePath) {
  fs.writeFileSync(pathFile, executablePath)
}
