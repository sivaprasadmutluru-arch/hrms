import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchById, selectSelected, selectLoading,
  fetchAssetAssignments, fetchAssetReports, submitAssetReport,
  fetchAssetDocuments, addAssetDocument,
  selectAssetAssignments, selectAssetReports, selectAssetDocuments,
} from './assetsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import { formatDate } from '../../utils/formatters'

const REPORT_TYPES = ['DAMAGE', 'LOSS', 'MAINTENANCE', 'RETURN']

export default function AssetDetailPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const asset = useSelector(selectSelected)
  const loading = useSelector(selectLoading)
  const assignments = useSelector(selectAssetAssignments)
  const reports = useSelector(selectAssetReports)
  const documents = useSelector(selectAssetDocuments)

  const [activeTab, setActiveTab] = useState('assignments')
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [docModalOpen, setDocModalOpen] = useState(false)

  const { register: regReport, handleSubmit: handleReportSubmit, reset: resetReport } = useForm()
  const { register: regDoc, handleSubmit: handleDocSubmit, reset: resetDoc } = useForm()

  useEffect(() => {
    dispatch(fetchById(id))
    dispatch(fetchAssetAssignments(id))
    dispatch(fetchAssetReports(id))
    dispatch(fetchAssetDocuments(id))
  }, [dispatch, id])

  const onReportSubmit = async (formData) => {
    try {
      await dispatch(submitAssetReport({ assetId: id, data: formData })).unwrap()
      toast.success('Report submitted')
      setReportModalOpen(false); resetReport({})
    } catch (e) { toast.error(e || 'Failed') }
  }

  const onDocSubmit = async (formData) => {
    try {
      await dispatch(addAssetDocument({ assetId: id, data: formData })).unwrap()
      toast.success('Document added')
      setDocModalOpen(false); resetDoc({})
    } catch (e) { toast.error(e || 'Failed') }
  }

  const assignmentColumns = [
    { accessorKey: 'employee.firstName', header: 'Employee' },
    { accessorKey: 'assignedDate', header: 'Assigned', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'returnedDate', header: 'Returned', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'isReturned', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() ? 'Returned' : 'Active'} variant={getValue() ? 'secondary' : 'success'} /> },
  ]

  const reportColumns = [
    { accessorKey: 'reportType', header: 'Type', cell: ({ getValue }) => <Badge label={getValue()} variant="warning" /> },
    { accessorKey: 'description', header: 'Description' },
    { accessorKey: 'reportedBy.firstName', header: 'Reported By' },
  ]

  const documentColumns = [
    { accessorKey: 'fileName', header: 'File Name' },
    { accessorKey: 'documentType', header: 'Type' },
    { accessorKey: 'filePath', header: 'Path' },
  ]

  if (!asset) return null

  return (
    <div>
      <PageHeader title={asset.assetName || 'Asset Detail'}
        subtitle={`ID: ${asset.assetId || id}`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/assets')}>← Back</Button>
            <Button size="sm" onClick={() => { resetReport({}); setReportModalOpen(true) }}>+ Report</Button>
            <Button size="sm" onClick={() => { resetDoc({}); setDocModalOpen(true) }}>+ Document</Button>
          </div>
        } />

      {/* Asset info card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge label={asset.status} variant={asset.status === 'AVAILABLE' ? 'success' : asset.status === 'DAMAGED' ? 'danger' : 'info'} /></div>
            <div className="flex justify-between"><span className="text-gray-500">Category</span><span>{asset.category?.name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Purchase Date</span><span>{formatDate(asset.purchaseDate)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Purchase Cost</span><span>{asset.purchaseCost ? `$${asset.purchaseCost}` : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Warranty Expiry</span><span>{formatDate(asset.warrantyExpiry)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Assigned To</span><span>{asset.assignedTo ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}` : '—'}</span></div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {['assignments', 'reports', 'documents'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 capitalize transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'assignments' && <DataTable columns={assignmentColumns} data={assignments} loading={loading} />}
      {activeTab === 'reports' && <DataTable columns={reportColumns} data={reports} loading={loading} />}
      {activeTab === 'documents' && <DataTable columns={documentColumns} data={documents} loading={loading} />}

      {/* Report Modal */}
      <Modal open={reportModalOpen} onClose={() => setReportModalOpen(false)} title="Submit Asset Report"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setReportModalOpen(false)}>Cancel</Button><Button onClick={handleReportSubmit(onReportSubmit)}>Submit</Button></div>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...regReport('reportType')}>
              {REPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={3} {...regReport('description', { required: true })} />
          </div>
        </div>
      </Modal>

      {/* Document Modal */}
      <Modal open={docModalOpen} onClose={() => setDocModalOpen(false)} title="Add Document"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDocModalOpen(false)}>Cancel</Button><Button onClick={handleDocSubmit(onDocSubmit)}>Add</Button></div>}>
        <div className="space-y-4">
          <Input label="File Name" {...regDoc('fileName')} />
          <Input label="File Path / URL" {...regDoc('filePath', { required: true })} />
          <Input label="Document Type" {...regDoc('documentType')} />
        </div>
      </Modal>
    </div>
  )
}
