import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchOrgChart } from './employeesSlice'
import PageHeader from '../../components/common/PageHeader'
import useAuth from '../../hooks/useAuth'

function OrgNode({ node }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm text-center min-w-36">
        <div className="font-medium text-sm text-gray-900">
          {node.name || `${node.firstName || ''} ${node.lastName || ''}`.trim() || `Employee #${node.id}`}
        </div>
        {node.position && <div className="text-xs text-gray-500 mt-0.5">{node.position}</div>}
        {node.department && <div className="text-xs text-gray-400">{node.department}</div>}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-px h-6 bg-gray-300" />
          <div className="flex gap-8 items-start">
            {node.children.map(child => (
              <OrgNode key={child.id} node={child} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrgChartPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const orgChart = useSelector(s => s.employees.orgChart)

  useEffect(() => {
    if (companyId) dispatch(fetchOrgChart({ companyId }))
  }, [dispatch, companyId])

  const roots = (orgChart || []).filter(e => !e.managerId)

  return (
    <div>
      <PageHeader title="Org Chart" subtitle="Company organizational structure" />
      <div className="overflow-auto p-8">
        {roots.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No org chart data available</p>
        ) : (
          <div className="flex gap-12 justify-center">
            {roots.map(root => <OrgNode key={root.id} node={root} />)}
          </div>
        )}
      </div>
    </div>
  )
}
