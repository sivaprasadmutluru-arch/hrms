import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  fetchImportInfo,
  downloadImportTemplate,
  processPayslipImport,
  downloadExportImportFormat,
} from './payrollSlice'
import useAuth from '../../hooks/useAuth'
import Button from '../../components/common/Button'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function PayslipImportPage() {
  const dispatch = useDispatch()
  const { user, effectiveCompanyId } = useAuth()
  const importInfo    = useSelector(s => s.payroll.importInfo)
  const importLoading = useSelector(s => s.payroll.importLoading)
  const importResult  = useSelector(s => s.payroll.importResult)

  const companyId = effectiveCompanyId
  const currentYear  = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [selectedYear,  setSelectedYear]  = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [file, setFile] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (companyId) {
      dispatch(fetchImportInfo({ companyId, year: selectedYear }))
    }
  }, [dispatch, companyId, selectedYear])

  const handleYearChange = (dir) => {
    setSelectedYear(y => y + dir)
  }

  const handleMonthSelect = (monthNum) => {
    setSelectedMonth(monthNum)
  }

  const handleDownloadTemplate = () => {
    if (!companyId) return toast.error('Company not found')
    dispatch(downloadImportTemplate({ companyId, month: selectedMonth, year: selectedYear }))
      .unwrap()
      .then(() => toast.success('Template downloaded'))
      .catch(e => toast.error(e || 'Download failed'))
  }

  const handleDownloadExportFormat = () => {
    if (!companyId) return toast.error('Company not found')
    dispatch(downloadExportImportFormat({ companyId, month: selectedMonth, year: selectedYear }))
      .unwrap()
      .then(() => toast.success('Export downloaded'))
      .catch(e => toast.error(e || 'Export failed'))
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null)
  }

  const handleImport = () => {
    if (!companyId) return toast.error('Company not found')
    if (!file) return toast.error('Please select an Excel or CSV file to import')
    dispatch(processPayslipImport({ companyId, month: selectedMonth, year: selectedYear, file }))
      .unwrap()
      .then((result) => {
        if (result.status === 'success') {
          toast.success(result.message)
        } else if (result.status === 'partial') {
          toast(`Import completed with errors: ${result.message}`, { icon: '⚠️' })
        } else {
          toast.error(result.message)
        }
        setFile(null)
        if (fileRef.current) fileRef.current.value = ''
        dispatch(fetchImportInfo({ companyId, year: selectedYear }))
      })
      .catch(e => toast.error(e || 'Import failed'))
  }

  const months = importInfo?.months_data || []

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payslip Import</h1>
          <p className="text-sm text-gray-500 mt-1">
            Import payslips from Excel. Download the template, fill in values, then upload.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadExportFormat}>
            <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
            Export Format
          </Button>
        </div>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <button
          onClick={() => handleYearChange(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          &#8592;
        </button>
        <span className="text-lg font-semibold text-gray-800 w-16 text-center">{selectedYear}</span>
        <button
          onClick={() => handleYearChange(1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          &#8594;
        </button>
        <span className="text-sm text-gray-500 ml-2">
          {importInfo?.employee_count != null
            ? `${importInfo.employee_count} active employee(s)`
            : ''}
        </span>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {months.map(m => (
          <button
            key={m.month_num}
            onClick={() => handleMonthSelect(m.month_num)}
            className={[
              'relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all',
              selectedMonth === m.month_num
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50',
              m.month_num === currentMonth && selectedYear === currentYear
                ? 'ring-2 ring-blue-200'
                : '',
            ].join(' ')}
          >
            <span className="text-sm font-semibold text-gray-700">{m.month_name}</span>
            <span className="text-xs text-gray-400 mt-0.5">{m.date_range}</span>
            <span className="mt-2">
              {m.status === 'completed' ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <CheckCircleIcon className="w-4 h-4" />
                  {m.payslips_count} payslip{m.payslips_count !== 1 ? 's' : ''}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <ClockIcon className="w-4 h-4" />
                  Pending
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Import panel */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-gray-800">
          Import for {MONTH_NAMES[selectedMonth]} {selectedYear}
        </h2>

        {/* Step 1 */}
        <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center">1</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">Download the import template</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Pre-filled with employee data and pro-rata salary formulas for {MONTH_NAMES[selectedMonth]} {selectedYear}.
              Fill in <span className="font-medium text-orange-600">orange columns</span> (variable data).
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleDownloadTemplate}
              disabled={importLoading}
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
              Download Template
            </Button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-500 text-white text-sm font-bold flex items-center justify-center">2</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">Upload the completed file</p>
            <p className="text-xs text-gray-500 mt-0.5">Supports .xlsx, .xls, or .csv</p>
            <div className="mt-2 flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {file && (
                <span className="text-xs text-gray-500">{file.name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500 text-white text-sm font-bold flex items-center justify-center">3</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">Process the import</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Payslips will be created or updated. Existing PAID payslips won't be overwritten.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-2"
              onClick={handleImport}
              disabled={importLoading || !file}
            >
              <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
              {importLoading ? 'Processing...' : 'Process Import'}
            </Button>
          </div>
        </div>

        {/* Result */}
        {importResult && (
          <div className={[
            'rounded-lg p-4 text-sm',
            importResult.status === 'success' ? 'bg-green-50 border border-green-200 text-green-800'
              : importResult.status === 'partial' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              : 'bg-red-50 border border-red-200 text-red-800',
          ].join(' ')}>
            <p className="font-medium">{importResult.message}</p>
            {importResult.imported != null && (
              <p className="mt-1 text-xs">{importResult.imported} payslip(s) processed.</p>
            )}
            {importResult.errors?.length > 0 && (
              <ul className="mt-2 list-disc list-inside text-xs space-y-0.5">
                {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
