import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAll, fetchPipeline } from './recruitmentSlice'
import PageHeader from '../../components/common/PageHeader'
import Badge from '../../components/common/Badge'

export default function RecruitmentPipelinePage() {
  const dispatch = useDispatch()
  const posts = useSelector(s => s.recruitment.data || s.recruitment.posts || [])
  const pipeline = useSelector(s => s.recruitment.pipeline)
  const [selectedPost, setSelectedPost] = useState('')

  useEffect(() => { dispatch(fetchAll()) }, [dispatch])
  useEffect(() => {
    if (selectedPost) dispatch(fetchPipeline(selectedPost))
  }, [dispatch, selectedPost])

  const postsArr = Array.isArray(posts) ? posts : (posts.content || [])

  return (
    <div>
      <PageHeader title="Recruitment Pipeline" subtitle="Kanban view of recruitment stages" />
      <div className="p-4">
        <div className="mb-4">
          <select
            className="border rounded px-3 py-2 text-sm"
            value={selectedPost}
            onChange={e => setSelectedPost(e.target.value)}
          >
            <option value="">Select a recruitment post</option>
            {postsArr.map(p => (
              <option key={p.id} value={p.id}>{p.name || p.title || `Post #${p.id}`}</option>
            ))}
          </select>
        </div>
        {selectedPost ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {(Array.isArray(pipeline) ? pipeline : []).map(stage => (
              <div key={stage.stageId || stage.id || stage.stageName} className="min-w-64 bg-gray-50 rounded-lg p-3 flex-shrink-0">
                <div className="font-semibold text-sm mb-2 text-gray-700 border-b pb-1">{stage.stageName || stage.name}</div>
                <div className="space-y-2">
                  {(stage.applicants || []).map(app => (
                    <div key={app.id} className="bg-white rounded border p-2 text-sm shadow-sm">
                      <div className="font-medium">{app.candidateName || app.name || `Applicant #${app.id}`}</div>
                      {app.email && <div className="text-xs text-gray-500">{app.email}</div>}
                      {app.status && <Badge variant="default" className="mt-1 text-xs">{app.status}</Badge>}
                    </div>
                  ))}
                  {(!stage.applicants || stage.applicants.length === 0) && (
                    <p className="text-xs text-gray-400 text-center py-4">No applicants</p>
                  )}
                </div>
              </div>
            ))}
            {(!pipeline || pipeline.length === 0) && (
              <p className="text-gray-500">No pipeline stages found for this post</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-12">Select a recruitment post to view its pipeline</p>
        )}
      </div>
    </div>
  )
}
