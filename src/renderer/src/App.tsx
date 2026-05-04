import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Plus, Trash2, X, FileText, Settings } from 'lucide-react'

// --- Utility Functions ---
const formatWithComma = (val: string | number) => {
  if (!val) return ''
  const cleanVal = String(val).replace(/[^0-9]/g, '')
  return cleanVal ? Number(cleanVal).toLocaleString() : ''
}

const stripComma = (val: string | number) => {
  return String(val).replace(/[^0-9]/g, '')
}

// const formatPhone = (val: string) => {
//   const clean = val.replace(/[^0-9]/g, '')
//   if (clean.length <= 3) return clean
//   if (clean.length <= 7) return `${clean.slice(0, 3)}-${clean.slice(3)}`
//   return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 11)}`
// }

const formatDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function App() {
  const [coursesData, setCoursesData] = useState<Record<string, { fee: string; material: string }>>({})
  const [isExtraCourse, setIsExtraCourse] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Modals
  const [showCourseManager, setShowCourseManager] = useState(false)
  const [showUpdateInfo, setShowUpdateInfo] = useState(false)
  const [appVersion, setAppVersion] = useState('')

  // Update States
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState<string | null>(null)

  // Form State
  const [form, setForm] = useState({
    // 개인정보 주석 처리
    // name: '',
    // birthdate: new Date(),
    // phone: '',
    // parentPhone: '',
    // address: '',
    // Course 1
    course: '',
    isDiscount: false,
    discountRate: '10%',
    fee: '',
    material: '',
    time: '',
    month: '',
    start_date: new Date(),
    end_date: new Date(),
    // Course 2
    course2: '',
    isDiscount2: false,
    discountRate2: '10%',
    fee2: '',
    material2: '',
    time2: '',
    month2: '',
    start_date2: new Date(),
    end_date2: new Date(),
  })

  useEffect(() => {
    loadCourses()
    checkVersionAndShowUpdate()

    // 업데이트 관련 이벤트 리스너 등록
    window.api.onUpdateDownloaded((releaseName) => {
      setUpdateDownloaded(releaseName)
      setIsCheckingUpdate(false)
    })

    window.api.onUpdateNotAvailable(() => {
      setIsCheckingUpdate(false)
      alert('현재 최신 버전을 사용 중입니다.')
    })
  }, [])

  const checkVersionAndShowUpdate = async () => {
    try {
      const version = await window.api.getAppVersion()
      setAppVersion(version)
      const hideKey = `hideUpdateInfo_${version}`
      if (!localStorage.getItem(hideKey)) {
        setShowUpdateInfo(true)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const loadCourses = async () => {
    const data = await window.api.loadCourses()
    setCoursesData(data)
  }

  const handleInputChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // const handlePhoneChange = (field: string, value: string) => {
  //   setForm((prev) => ({ ...prev, [field]: formatPhone(value) }))
  // }

  const handleMoneyChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: formatWithComma(value) }))
  }

  const handleCourseSelect = (courseName: string, suffix: '' | '2') => {
    const courseInfo = coursesData[courseName]
    if (courseInfo) {
      setForm((prev) => ({
        ...prev,
        [`course${suffix}`]: courseName,
        [`fee${suffix}`]: formatWithComma(courseInfo.fee),
        [`material${suffix}`]: formatWithComma(courseInfo.material),
      }))
    }
  }

  const calculateActualFee = (feeRawStr: string, isDiscount: boolean, discountRateStr: string) => {
    const feeRaw = parseInt(stripComma(feeRawStr) || '0', 10)
    if (!isDiscount) return feeRaw
    const rate = parseInt(discountRateStr.replace('%', ''), 10)
    return Math.floor(feeRaw * (1 - rate / 100))
  }

  const getCourseDataForPDF = (suffix: '' | '2') => {
    const isDiscount = form[`isDiscount${suffix}`] as boolean
    const feeStr = form[`fee${suffix}`] as string
    const matStr = form[`material${suffix}`] as string
    const feeRaw = parseInt(stripComma(feeStr) || '0', 10)
    const matRaw = parseInt(stripComma(matStr) || '0', 10)
    const actualFee = calculateActualFee(feeStr, isDiscount, form[`discountRate${suffix}`] as string)
    
    return {
      [`course${suffix}`]: form[`course${suffix}`],
      [`course_time${suffix}`]: form[`time${suffix}`],
      [`course_month${suffix}`]: form[`month${suffix}`],
      [`course_fee${suffix}`]: formatWithComma(feeRaw),
      [`course_material_fee${suffix}`]: formatWithComma(matRaw),
      [`course_total_fee${suffix}`]: formatWithComma(feeRaw + matRaw),
      [`start_date${suffix}`]: formatDate(form[`start_date${suffix}`] as Date),
      [`end_date${suffix}`]: formatDate(form[`end_date${suffix}`] as Date),
      ...(isDiscount ? {
        [`appl_fee${suffix}`]: formatWithComma(actualFee),
        [`appl_material_fee${suffix}`]: formatWithComma(matRaw),
        [`appl_total_fee${suffix}`]: formatWithComma(actualFee + matRaw),
      } : {}),
      _actual_fee: actualFee,
      _actual_mat: matRaw
    }
  }

  const handleGeneratePDF = async () => {
    // if (!form.name?.trim()) {
    //   alert('성명을 입력해주세요.')
    //   return
    // }
    if (!form.course) {
      alert('첫 번째 수강명을 선택해주세요.')
      return
    }

    setIsGenerating(true)

    const c1Data = getCourseDataForPDF('')
    const pdfData: Record<string, any> = {
      // 개인정보 주석 처리
      // name: form.name,
      // birthdate: formatDate(form.birthdate),
      // phone: form.phone,
      // parentPhone: form.parentPhone,
      // address: form.address,
    }

    Object.keys(c1Data).forEach(k => {
      if (!k.startsWith('_')) pdfData[k] = c1Data[k]
    })

    let totalCourse = form.course
    let totalFee = c1Data._actual_fee
    let totalMat = c1Data._actual_mat

    if (isExtraCourse && form.course2) {
      const c2Data = getCourseDataForPDF('2')
      Object.keys(c2Data).forEach(k => {
        if (!k.startsWith('_')) pdfData[k] = c2Data[k]
      })
      totalCourse += ` / ${form.course2}`
      totalFee += c2Data._actual_fee
      totalMat += c2Data._actual_mat
    }

    pdfData['enroll_course'] = totalCourse
    pdfData['enroll_fee'] = formatWithComma(totalFee)
    pdfData['enroll_material_fee'] = formatWithComma(totalMat)
    pdfData['enroll_total_fee'] = formatWithComma(totalFee + totalMat)

    try {
      const res = await window.api.generatePDF(pdfData)
      if (res.success) {
        alert(`생성 완료!\n저장 경로: ${res.outputPath}`)
      } else {
        alert(`생성 실패: ${res.error}`)
      }
    } catch (e: any) {
      alert(`에러 발생: ${e.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      {/* Update Info Modal */}
      {showUpdateInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-bold text-gray-800">🎉 버전 {appVersion} 업데이트 내역</h2>
              <button onClick={() => setShowUpdateInfo(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3 text-gray-600">
              <p><strong>수강신청서 자동 완성 앱</strong>이 새롭게 업데이트 되었습니다!</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>🚀 1.0.2 팝업 다시 보지 않기 테스트!</li>
                <li>업데이트 기능 최종 점검 중입니다.</li>
                <li>팝업창 작동 여부를 확인해 주세요.</li>
              </ul>
            </div>
            <div className="pt-4 flex justify-between items-center border-t">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                <input 
                  type="checkbox" 
                  onChange={(e) => {
                    if (e.target.checked) {
                      localStorage.setItem(`hideUpdateInfo_${appVersion}`, 'true')
                    } else {
                      localStorage.removeItem(`hideUpdateInfo_${appVersion}`)
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                이 버전에서는 다시 보지 않기
              </label>
              <button
                onClick={() => setShowUpdateInfo(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="text-blue-600" />
          미용학원 수강신청서 자동 완성
        </h1>
        <div className="flex items-center gap-2">
          {updateDownloaded ? (
            <button
              onClick={() => window.api.installUpdate()}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors shadow-sm font-bold animate-pulse"
            >
              🎁 {updateDownloaded} 업데이트 적용 및 재시작
            </button>
          ) : (
            <button
              onClick={() => {
                setIsCheckingUpdate(true)
                window.api.checkUpdate()
              }}
              disabled={isCheckingUpdate}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-md transition-colors shadow-sm font-medium ${
                isCheckingUpdate ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isCheckingUpdate ? '확인 중...' : '업데이트 확인'}
            </button>
          )}
          <button
            onClick={() => setShowCourseManager(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
          >
            <Settings size={18} />
            과목 관리
          </button>
        </div>
      </div>

      {/* Personal Info 주석 처리
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-blue-600 mb-4">개인 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">성명</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">생년월일</label>
            <DatePicker
              selected={form.birthdate}
              onChange={(date) => handleInputChange('birthdate', date)}
              dateFormat="yyyy-MM-dd"
              className="border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">연락처</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => handlePhoneChange('phone', e.target.value)}
              maxLength={13}
              className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 flex justify-between">
              부모님 연락처
              <button 
                onClick={() => handleInputChange('parentPhone', form.phone)}
                className="text-xs text-blue-600 hover:underline"
              >
                (동일)
              </button>
            </label>
            <input
              type="text"
              value={form.parentPhone}
              onChange={(e) => handlePhoneChange('parentPhone', e.target.value)}
              maxLength={13}
              className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">주소</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>
      */}

      {/* Course 1 Info */}
      <CourseSection 
        suffix="" 
        form={form} 
        coursesData={coursesData} 
        handleInputChange={handleInputChange} 
        handleMoneyChange={handleMoneyChange}
        handleCourseSelect={handleCourseSelect}
        calculateActualFee={calculateActualFee}
        title="첫 번째 수강 정보"
      />

      {/* Extra Course Toggle */}
      <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-md transition-colors w-fit">
        <input 
          type="checkbox" 
          checked={isExtraCourse} 
          onChange={(e) => setIsExtraCourse(e.target.checked)} 
          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <span className="font-semibold text-gray-700">+ 두 번째 수강 과목 추가하기</span>
      </label>

      {/* Course 2 Info */}
      {isExtraCourse && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <CourseSection 
            suffix="2" 
            form={form} 
            coursesData={coursesData} 
            handleInputChange={handleInputChange} 
            handleMoneyChange={handleMoneyChange}
            handleCourseSelect={handleCourseSelect}
            calculateActualFee={calculateActualFee}
            title="두 번째 수강 정보"
          />
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleGeneratePDF}
        disabled={isGenerating}
        className={`w-full py-4 text-white text-lg font-bold rounded-xl shadow-md transition-all ${
          isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
        }`}
      >
        {isGenerating ? 'PDF 생성 중...' : '수강신청서 PDF 생성'}
      </button>

      {/* Modals */}
      {showCourseManager && (
        <CourseManagerModal 
          onClose={() => setShowCourseManager(false)} 
          coursesData={coursesData} 
          refreshCourses={loadCourses}
        />
      )}
    </div>
  )
}

function CourseSection({ suffix, form, coursesData, handleInputChange, handleMoneyChange, handleCourseSelect, calculateActualFee, title }: any) {
  const actualFee = calculateActualFee(form[`fee${suffix}`], form[`isDiscount${suffix}`], form[`discountRate${suffix}`])

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-lg font-bold text-blue-600 mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">수강명</label>
          <select
            value={form[`course${suffix}`]}
            onChange={(e) => handleCourseSelect(e.target.value, suffix)}
            className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="" disabled>과목을 선택하세요</option>
            {Object.keys(coursesData).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">할인 적용</label>
          <div className="flex items-center gap-3 mt-1">
            <input
              type="checkbox"
              checked={form[`isDiscount${suffix}`]}
              onChange={(e) => handleInputChange(`isDiscount${suffix}`, e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <select
              disabled={!form[`isDiscount${suffix}`]}
              value={form[`discountRate${suffix}`]}
              onChange={(e) => handleInputChange(`discountRate${suffix}`, e.target.value)}
              className="border border-gray-300 rounded-md p-1.5 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
            >
              {[10,20,30,40,50,60,70,80,90,100].map(r => (
                <option key={r} value={`${r}%`}>{r}%</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">수강료</label>
          <input
            type="text"
            value={form[`fee${suffix}`]}
            onChange={(e) => handleMoneyChange(`fee${suffix}`, e.target.value)}
            className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">적용가</label>
          <input
            type="text"
            value={form[`isDiscount${suffix}`] && actualFee ? formatWithComma(actualFee) : ''}
            readOnly
            className="bg-gray-50 border border-gray-200 rounded-md p-2 text-blue-700 font-semibold outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">재료비</label>
          <input
            type="text"
            value={form[`material${suffix}`]}
            onChange={(e) => handleMoneyChange(`material${suffix}`, e.target.value)}
            className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">수업시간</label>
          <input
            type="text"
            value={form[`time${suffix}`]}
            onChange={(e) => handleInputChange(`time${suffix}`, e.target.value)}
            className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">수강개월</label>
          <input
            type="text"
            value={form[`month${suffix}`]}
            onChange={(e) => handleInputChange(`month${suffix}`, e.target.value)}
            className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">개강일</label>
          <DatePicker
            selected={form[`start_date${suffix}`]}
            onChange={(date) => handleInputChange(`start_date${suffix}`, date)}
            dateFormat="yyyy-MM-dd"
            className="border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">종강일</label>
          <DatePicker
            selected={form[`end_date${suffix}`]}
            onChange={(date) => handleInputChange(`end_date${suffix}`, date)}
            dateFormat="yyyy-MM-dd"
            className="border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>
    </div>
  )
}

function CourseManagerModal({ onClose, coursesData, refreshCourses }: any) {
  const [name, setName] = useState('')
  const [fee, setFee] = useState('')
  const [material, setMaterial] = useState('')
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    if (!name.trim() || !fee || !material) {
      setMessage('모든 항목을 입력해주세요.')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    const newCourses = { ...coursesData }
    newCourses[name] = { fee: stripComma(fee), material: stripComma(material) }

    const success = await window.api.saveCourses(newCourses)
    if (success) {
      refreshCourses()
      setName('')
      setFee('')
      setMaterial('')
      setMessage(`'${name}' 과목이 저장되었습니다.`)
      setTimeout(() => setMessage(''), 3000)
    } else {
      setMessage('저장에 실패했습니다.')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleDelete = async (courseName: string) => {
    if (confirm(`'${courseName}' 과목을 삭제하시겠습니까?`)) {
      const newCourses = { ...coursesData }
      delete newCourses[courseName]
      const success = await window.api.saveCourses(newCourses)
      if (success) {
        refreshCourses()
        setMessage(`'${courseName}' 과목이 삭제되었습니다.`)
        setTimeout(() => setMessage(''), 3000)
      }
    }
  }

  const handleEdit = (courseName: string, info: any) => {
    setName(courseName)
    setFee(formatWithComma(info.fee))
    setMaterial(formatWithComma(info.material))
  }

  const handleExport = async () => {
    const result = await window.api.exportCourses(coursesData)
    if (result.success) {
      setMessage(`백업 완료: ${result.filePath}`)
      setTimeout(() => setMessage(''), 3000)
    } else if (result.error) {
      setMessage(`백업 실패: ${result.error}`)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleImport = async () => {
    const result = await window.api.importCourses()
    if (result.success && result.courses) {
      const success = await window.api.saveCourses(result.courses)
      if (success) {
        refreshCourses()
        setMessage('과목 데이터를 성공적으로 불러왔습니다.')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('불러온 데이터를 저장하는데 실패했습니다.')
        setTimeout(() => setMessage(''), 3000)
      }
    } else if (result.error) {
      setMessage(`불러오기 실패: ${result.error}`)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-gray-800">과목 관리</h2>
            <div className="flex gap-2">
              <button onClick={handleExport} className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors">
                내보내기(백업)
              </button>
              <button onClick={handleImport} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
                불러오기(복구)
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {message && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm font-medium text-center animate-in fade-in">
              {message}
            </div>
          )}
          <div className="space-y-3 mb-8">
            <h3 className="font-semibold text-gray-700">현재 과목 목록</h3>
            {Object.keys(coursesData).length === 0 ? (
              <p className="text-gray-500 text-sm">등록된 과목이 없습니다.</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 border-b">과목명</th>
                      <th className="px-4 py-3 border-b">수강료</th>
                      <th className="px-4 py-3 border-b">재료비</th>
                      <th className="px-4 py-3 border-b text-center">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(coursesData).map(([cName, info]: any) => (
                      <tr key={cName} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{cName}</td>
                        <td className="px-4 py-3">{formatWithComma(info.fee)}</td>
                        <td className="px-4 py-3">{formatWithComma(info.material)}</td>
                        <td className="px-4 py-3 text-center flex justify-center gap-2">
                          <button onClick={() => handleEdit(cName, info)} className="text-blue-500 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded-md transition-colors text-sm font-medium">
                            수정
                          </button>
                          <button onClick={() => handleDelete(cName)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-md transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-blue-600">새 과목 추가 / 수정</h3>
            <div className="grid grid-cols-1 gap-3">
              <input
                type="text"
                placeholder="과목명"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="수강료"
                  value={fee}
                  onChange={(e) => setFee(formatWithComma(e.target.value))}
                  className="border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="재료비"
                  value={material}
                  onChange={(e) => setMaterial(formatWithComma(e.target.value))}
                  className="border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                onClick={handleSave}
                className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors mt-2"
              >
                <Plus size={18} />
                저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}