import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  fetchAll, fetchPipeline, updateApplicantStage, hireApplicant, rejectApplicant,
  selectPipeline, selectPipelineLoading,
} from './recruitmentSlice'
import PageHeader from '../../components/common/PageHeader'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'

const STATUS_VARIANT = { APPLIED: 'default', SCREENING: 'primary', INTERVIEW: 'warning', OFFERED: 'info', HIRED: 'success', REJECTED: 'danger' }

export default function RecruitmentPipelinePage() {
  const dispatch = useDispatch()
  const posts = useSelector(s => Array.isArray(s.recruitment.posts) ? s.recruitment.posts : (s.recruitment.posts?.content || []))
  const pipeline = useSelector(selectPipeline)
  const pipelineLoading = useSelector(selectPipelineLoading)
  const [selectedPost, setSelectedPost] = useState('')
  const [detailApp, setDetailApp] = useState(null)
  // localPipeline mirrors Redux state so drag updates render instantly
  const [localPipeline, setLocalPipeline] = useState([])
  const dragApp = useRef(null)
  const dragFromStage = useRef(null)

  useEffect(() => { dispatch(fetchAll()) }, [dispatch])
  useEffect(() => { if (selectedPost) dispatch(fetchPipeline(selectedPost)) }, [dispatch, selectedPost])
  useEffect(() => { setLocalPipeline(pipeline.map(s => ({ ...s, applicants: [...(s.applicants || [])] }))) }, [pipeline])

  // ─── Drag handlers ───────────────────────────────────────────────────────────

  const onDragStart = (app, stageName) => {
    dragApp.current = app
    dragFromStage.current = stageName
  }

  const onDragOver = (e) => { e.preventDefault() }

  const onDrop = async (e, targetStageName) => {
    e.preventDefault()
    const app = dragApp.current
    const fromStage = dragFromStage.current
    if (!app || fromStage === targetStageName) return

    const targetStage = localPipeline.find(s => (s.stageName || s.name) === targetStageName)
    if (!targetStage) return

    // Optimistic UI update
    setLocalPipeline(prev => prev.map(stage => {
      const name = stage.stageName || stage.name
      if (name === fromStage) return { ...stage, applicants: stage.applicants.filter(a => a.id !== app.id) }
      if (name === targetStageName) return { ...stage, applicants: [...stage.applicants, app] }
      return stage
    }))

    try {
      await dispatch(updateApplicantStage({ id: app.id, stageId: targetStage.stageId || targetStage.id })).unwrap()
      toast.success(`Moved ${app.candidateName || app.name || 'Applicant'} to ${targetStageName}`)
      dispatch(fetchPipeline(selectedPost))
    } catch (err) {
      toast.error(err || 'Failed to move applicant')
      // Revert to Redux state on failure
      setLocalPipeline(pipeline.map(s => ({ ...s, applicants: [...(s.applicants || [])] })))
    }
    dragApp.current = null
    dragFromStage.current = null
  }

  const handleHire = async (app) => {
    try {
      await dispatch(hireApplicant(app.id)).unwrap()
      toast.success(`${app.candidateName || 'Applicant'} hired!`)
      dispatch(fetchPipeline(selectedPost))
      setDetailApp(null)
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleReject = async (app) => {
    try {
      await dispatch(rejectApplicant(app.id)).unwrap()
      toast.success('Applicant rejected')
      dispatch(fetchPipeline(selectedPost))
      setDetailApp(null)
    } catch (e) { toast.error(e || 'Failed') }
  }

  const totalApplicants = localPipeline.reduce((sum, s) => sum + (s.applicants?.length || 0), 0)

  return (
    <div className="recruitment-workspace recruitment-pipeline">
      <PageHeader title="Recruitment Pipeline" subtitle="Kanban view — drag cards to move applicants between stages" />

      <div className="px-4 pb-4">
        {/* Post selector + stats */}
        <div className="flex items-center gap-4 mb-4">
          <select
            className="border rounded px-3 py-2 text-sm min-w-64"
            value={selectedPost}
            onChange={e => setSelectedPost(e.target.value)}
          >
            <option value="">Select a recruitment post</option>
            {posts.map(p => (
              <option key={p.id} value={p.id}>{p.name || p.jobPosition?.name || `Post #${p.id}`}</option>
            ))}
          </select>
          {selectedPost && !pipelineLoading && (
            <span className="text-sm text-gray-500">{totalApplicants} total applicant{totalApplicants !== 1 ? 's' : ''}</span>
          )}
        </div>

        {!selectedPost && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Select a recruitment post to view its pipeline</p>
          </div>
        )}

        {selectedPost && pipelineLoading && <Spinner className="py-16" />}

        {selectedPost && !pipelineLoading && localPipeline.length === 0 && (
          <p className="text-gray-500 text-center py-12">No pipeline stages configured for this post</p>
        )}

        {selectedPost && !pipelineLoading && localPipeline.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {localPipeline.map(stage => {
              const stageName = stage.stageName || stage.name
              const apps = stage.applicants || []
              const hiredCount = apps.filter(a => a.status === 'HIRED').length
              return (
                <div
                  key={stage.stageId || stage.id || stageName}
                  className="flex flex-col min-w-64 w-64 flex-shrink-0 bg-gray-50 rounded-lg border border-gray-200"
                  onDragOver={onDragOver}
                  onDrop={e => onDrop(e, stageName)}
                >
                  {/* Stage header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
                    <span className="font-semibold text-sm text-gray-800">{stageName}</span>
                    <div className="flex items-center gap-1.5">
                      {hiredCount > 0 && <span className="text-xs text-green-600 font-medium">{hiredCount} hired</span>}
                      <span className="bg-gray-200 text-gray-700 text-xs font-semibold rounded-full px-2 py-0.5">{apps.length}</span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2 p-2 min-h-32 flex-1">
                    {apps.length === 0 && (
                      <div className="flex-1 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                        <p className="text-xs text-gray-400">Drop here</p>
                      </div>
                    )}
                    {apps.map(app => (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={() => onDragStart(app, stageName)}
                        onClick={() => setDetailApp(app)}
                        className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab hover:shadow-md hover:border-indigo-300 transition-all active:opacity-60 select-none"
                      >
                        <p className="font-medium text-sm text-gray-800 truncate">
                          {app.candidateName || app.name || `Applicant #${app.id}`}
                        </p>
                        {app.email && <p className="text-xs text-gray-400 truncate mt-0.5">{app.email}</p>}
                        {app.jobPosition && <p className="text-xs text-gray-500 mt-0.5">{app.jobPosition}</p>}
                        <div className="flex items-center justify-between mt-2">
                          {app.status && (
                            <Badge label={app.status} variant={STATUS_VARIANT[app.status] || 'default'} />
                          )}
                          {app.rating && (
                            <span className="text-xs text-amber-500">{'★'.repeat(app.rating)}{'☆'.repeat(5 - app.rating)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Applicant Detail Modal */}
      {detailApp && (
        <Modal
          open={!!detailApp}
          onClose={() => setDetailApp(null)}
          title={detailApp.candidateName || detailApp.name || `Applicant #${detailApp.id}`}
          footer={
            <div className="flex justify-between">
              <div className="flex gap-2">
                <Button onClick={() => handleHire(detailApp)} variant="success">Hire</Button>
                <Button onClick={() => handleReject(detailApp)} variant="danger">Reject</Button>
              </div>
              <Button variant="secondary" onClick={() => setDetailApp(null)}>Close</Button>
            </div>
          }
          panelClassName="recruitment-form-modal"
        >
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {detailApp.email && (
                <div><p className="text-gray-500 text-xs">Email</p><p className="font-medium">{detailApp.email}</p></div>
              )}
              {detailApp.mobile && (
                <div><p className="text-gray-500 text-xs">Mobile</p><p className="font-medium">{detailApp.mobile}</p></div>
              )}
              {detailApp.jobPosition && (
                <div><p className="text-gray-500 text-xs">Position</p><p className="font-medium">{detailApp.jobPosition}</p></div>
              )}
              {detailApp.status && (
                <div><p className="text-gray-500 text-xs">Status</p><Badge label={detailApp.status} variant={STATUS_VARIANT[detailApp.status] || 'default'} /></div>
              )}
              {detailApp.source && (
                <div><p className="text-gray-500 text-xs">Source</p><p className="font-medium">{detailApp.source}</p></div>
              )}
              {detailApp.rating != null && (
                <div><p className="text-gray-500 text-xs">Rating</p><p className="font-medium text-amber-500">{'★'.repeat(detailApp.rating)}{'☆'.repeat(5 - detailApp.rating)}</p></div>
              )}
            </div>
            {detailApp.resumeSummary && (
              <div><p className="text-gray-500 text-xs mb-1">Summary</p><p className="text-gray-700">{detailApp.resumeSummary}</p></div>
            )}
            <p className="text-xs text-gray-400 pt-2">Drag this card to move between stages, or use the buttons above.</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
