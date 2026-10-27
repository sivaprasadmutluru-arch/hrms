import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { fetchApplicants, hireApplicant, rejectApplicant, selectLoading } from './recruitmentSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { formatDate } from '../../utils/formatters'

export default function ApplicantsPage() {
  const dispatch = useDispatch()
  const applicants = useSelector(s => s.recruitment.applicants)
  const loading = useSelector(selectLoading)
  const [detail, setDetail] = useState(null)

  useEffect(() => { dispatch(fetchApplicants({ page: 0, size: 20 })) }, [dispatch])

  const handleHire = async (id) => {
    try { await dispatch(hireApplicant(id)).unwrap(); toast.success('Applicant hired'); dispatch(fetchApplicants({ page: 0, size: 20 })) }
    catch { toast.error('Failed') }
  }
  const handleReject = async (id) => {
    try { await dispatch(rejectApplicant(id)).unwrap(); toast.success('Applicant rejected'); dispatch(fetchApplicants({ page: 0, size: 20 })) }
    catch { toast.error('Failed') }
  }

  const STAGE_VARIANT = { APPLIED: 'default', SCREENING: 'warning', INTERVIEW: 'primary', OFFERED: 'accent', HIRED: 'success', REJECTED: 'danger' }

  const stageCounts = applicants.reduce((counts, applicant) => {
    const stage = applicant.stage || 'APPLIED'
    counts[stage] = (counts[stage] || 0) + 1
    return counts
  }, {})

  return (
    <div className="recruitment-workspace">
      <PageHeader title="Applicants" subtitle="Review and manage job applicants" />
      <div className="applicant-overview">
        <div><span>Total candidates</span><strong>{loading ? '—' : applicants.length}</strong></div>
        <div><span>In interview</span><strong>{loading ? '—' : stageCounts.INTERVIEW || 0}</strong></div>
        <div><span>Offers</span><strong>{loading ? '—' : stageCounts.OFFERED || 0}</strong></div>
        <div><span>Hired</span><strong>{loading ? '—' : stageCounts.HIRED || 0}</strong></div>
      </div>
      {loading ? <div className="applicant-list">{Array.from({ length: 4 }, (_, index) => <div className="applicant-skeleton" key={index} />)}</div> : (
        <div className="applicant-list">
          {applicants.length === 0 ? <div className="recruitment-empty">No applicants yet. Candidates will appear here when they apply to your job posts.</div> : applicants.map(applicant => {
            const name = applicant.name || 'Candidate'
            const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
            return (
              <article className="applicant-card" key={applicant.id}>
                <div className="applicant-avatar">{initials}</div>
                <div className="applicant-main">
                  <div className="applicant-name-line"><h2>{name}</h2><Badge label={applicant.stage || 'Applied'} variant={STAGE_VARIANT[applicant.stage] || 'default'} /></div>
                  <p>{applicant.email || 'No email provided'}</p>
                  <div className="applicant-meta"><span>{applicant.jobTitle || 'Position not specified'}</span><span>Applied {formatDate(applicant.appliedDate)}</span></div>
                </div>
                <div className="applicant-actions">
                  <Button size="sm" variant="secondary" onClick={() => setDetail(applicant)}>View profile</Button>
                  {applicant.stage !== 'HIRED' && applicant.stage !== 'REJECTED' && <Button size="sm" variant="success" onClick={() => handleHire(applicant.id)}>Hire</Button>}
                  {applicant.stage !== 'HIRED' && applicant.stage !== 'REJECTED' && <Button size="sm" variant="danger" onClick={() => handleReject(applicant.id)}>Reject</Button>}
                </div>
              </article>
            )
          })}
        </div>
      )}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Applicant Details" size="md" panelClassName="recruitment-form-modal">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{detail.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{detail.email}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{detail.phone || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Position</span><span>{detail.jobTitle}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Applied</span><span>{formatDate(detail.appliedDate)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Stage</span><Badge label={detail.stage} variant="primary" /></div>
            {detail.resumeUrl && <a href={detail.resumeUrl} target="_blank" rel="noopener noreferrer" className="block text-indigo-600 hover:underline">View Resume</a>}
          </div>
        )}
      </Modal>
    </div>
  )
}
