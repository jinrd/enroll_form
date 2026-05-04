import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

// Path to resources (Read-only)
const getResourcePath = (filename: string) => {
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    return path.join(process.cwd(), 'resources', filename)
  }
  return path.join(process.resourcesPath, filename)
}

// Path to user data (Writable)
const getCoursesFilePath = () => {
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    return path.join(process.cwd(), 'resources', 'courses.json')
  }
  // Use appData for writable settings in production
  const userDataPath = app.getPath('userData')
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }
  return path.join(userDataPath, 'courses.json')
}

export const loadCourses = () => {
  const filePath = getCoursesFilePath()
  
  // If user data file doesn't exist, try to copy from default resources
  if (!fs.existsSync(filePath)) {
    const defaultPath = getResourcePath('courses.json')
    try {
      if (fs.existsSync(defaultPath)) {
        fs.copyFileSync(defaultPath, filePath)
      } else {
        // 기본 파일이 없을 경우 빈 객체라도 생성
        fs.writeFileSync(filePath, JSON.stringify({}, null, 4), 'utf-8');
      }
    } catch (e) {
      console.error('Failed to copy default courses:', e)
    }
  }

  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      if (!data.trim()) return {}; // 파일이 비어있는 경우 방어 로직
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Failed to load courses:', error)
  }
  
  // Final fallback
  const defaultCourses = {
    "헤어 디자인 실무반": { fee: "500000", material: "150000" },
    "프로 메이크업 아티스트": { fee: "650000", material: "250000" },
    "네일아트 국가자격증반": { fee: "400000", material: "100000" },
    "에스테틱/피부관리반": { fee: "600000", material: "200000" }
  }
  saveCourses(defaultCourses)
  return defaultCourses
}

export const saveCourses = (courses: any) => {
  const filePath = getCoursesFilePath()
  try {
    fs.writeFileSync(filePath, JSON.stringify(courses, null, 4), 'utf-8')
    return true
  } catch (error) {
    console.error('Failed to save courses:', error)
    return false
  }
}
