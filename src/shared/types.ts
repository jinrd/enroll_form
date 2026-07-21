export interface CourseInfo {
  fee: string
  material: string
}

export type Courses = Record<string, CourseInfo>

export type PdfData = Record<string, string>

export interface OperationResult {
  success: boolean
  canceled?: boolean
  error?: string
}

export interface PdfResult extends OperationResult {
  outputPath?: string
}

export interface ExportResult extends OperationResult {
  filePath?: string
}

export interface ImportResult extends OperationResult {
  courses?: Courses
}

export const isCourses = (value: unknown): value is Courses => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  return Object.entries(value).every(
    ([name, info]) =>
      name.trim().length > 0 &&
      Boolean(info) &&
      typeof info === 'object' &&
      !Array.isArray(info) &&
      typeof (info as Record<string, unknown>).fee === 'string' &&
      /^\d+$/.test((info as Record<string, string>).fee) &&
      typeof (info as Record<string, unknown>).material === 'string' &&
      /^\d+$/.test((info as Record<string, string>).material)
  )
}

export const isPdfData = (value: unknown): value is PdfData => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every((item) => typeof item === 'string')
}
