import fs from 'node:fs'
import path from 'node:path'
import { app, dialog } from 'electron'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

const getResourcePath = (filename: string) => {
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    return path.join(process.cwd(), 'resources', filename)
  }
  return path.join(process.resourcesPath, filename)
}

const getSettingsPath = () => {
  const userDataPath = app.getPath('userData')
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }
  return path.join(userDataPath, 'settings.json')
}

const getSaveDirectory = () => {
  const settingsPath = getSettingsPath()
  if (fs.existsSync(settingsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      if (data.saveDirectory && fs.existsSync(data.saveDirectory)) {
        return data.saveDirectory
      }
    } catch (e) {
      console.error('Failed to parse settings.json', e)
    }
  }
  return null
}

const saveSaveDirectory = (dirPath: string) => {
  const settingsPath = getSettingsPath()
  let settings: any = {}
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    } catch (e) {
      // ignore
    }
  }
  settings.saveDirectory = dirPath
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
}

const mapping = {
    // 개인정보 주석 처리
    // 'name': [150, 788],                
    // 'birthdate': [415, 788],           
    // 'phone': [150, 770],               
    // 'parentPhone': [415, 770],         
    // 'address': [150, 753],             
    'course': [150, 725],              
    'course_time' : [450, 720],        
    'course_month': [515, 720],        
    'course_fee': [185, 706],          
    'course_material_fee': [185, 690], 
    'course_total_fee': [185, 675],    
    'appl_fee': [340, 706],            
    'appl_material_fee': [340, 690],   
    'appl_total_fee': [340, 675],      
    'start_date': [455, 708],          
    'end_date': [455, 696],            
    
    'course2': [150, 580], 
    'course_time2' : [450, 573],
    'course_month2': [515, 573],
    'course_fee2': [185, 558],
    'course_material_fee2': [185, 543],
    'course_total_fee2': [185, 528],
    'appl_fee2': [340, 558],
    'appl_material_fee2': [340, 543],
    'appl_total_fee2': [340, 528],
    'start_date2': [455, 561],
    'end_date2': [455, 550],
    
    'enroll_course' : [130, 116],      
    'enroll_fee' : [130, 98],          
    'enroll_material_fee' : [130, 83], 
    'enroll_total_fee' : [130, 69],    
} as Record<string, [number, number]>

export const generatePDF = async (data: Record<string, any>) => {
  try {
    const templatePath = getResourcePath('basic_enrollment_template.pdf')
    const fontPath = getResourcePath('NanumGothic.ttf')
    
    const pdfBytes = fs.readFileSync(templatePath)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    
    pdfDoc.registerFontkit(fontkit)
    
    const fontBytes = fs.readFileSync(fontPath)
    const customFont = await pdfDoc.embedFont(fontBytes)
    
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    
    for (const [key, [x, y]] of Object.entries(mapping)) {
      if (data[key]) {
        const text = String(data[key])
        if (text.includes('\n')) {
          const lines = text.split('\n')
          lines.forEach((line, i) => {
            firstPage.drawText(line, {
              x,
              y: y - (i * 12),
              size: 8,
              font: customFont,
              color: rgb(0, 0, 0),
            })
          })
        } else {
          firstPage.drawText(text, {
            x,
            y,
            size: 8,
            font: customFont,
            color: rgb(0, 0, 0),
          })
        }
      }
    }
    
    const pdfBytesSaved = await pdfDoc.save()

    const lastDirectory = getSaveDirectory() || app.getPath('desktop')
    const defaultPath = path.join(lastDirectory, `${data.name || '수강생'}_수강신청서.pdf`)
    
    const result = await dialog.showSaveDialog({
      title: 'PDF 저장 위치 선택',
      defaultPath: defaultPath,
      filters: [{ name: 'PDF 파일', extensions: ['pdf'] }]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'User cancelled save dialog' }
    }

    const outputPath = result.filePath
    fs.writeFileSync(outputPath, pdfBytesSaved)
    saveSaveDirectory(path.dirname(outputPath))

    return { success: true, outputPath }
  } catch (error: any) {
    console.error('PDF generation error:', error)
    return { success: false, error: error.message }
  }
}
