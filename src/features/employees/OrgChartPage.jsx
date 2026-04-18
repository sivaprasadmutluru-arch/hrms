import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchOrgChart } from './employeesSlice'
import PageHeader from '../../components/common/PageHeader'
import useAuth from '../../hooks/useAuth'

// ─── Colour palette (one per department, consistent within a session) ─────────

const PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  '#f97316', '#06b6d4', '#84cc16', '#a855f7',
]

const _colorCache = {}
let _colorIdx = 0

function deptColor(dept) {
  if (!dept) return '#9ca3af'
  if (!_colorCache[dept]) {
    _colorCache[dept] = PALETTE[_colorIdx % PALETTE.length]
    _colorIdx++
  }
  return _colorCache[dept]
}

function initials(name) {
  if (!name?.trim()) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Tree helpers ─────────────────────────────────────────────────────────────

function countNodes(node) {
  return 1 + (node.children || []).reduce((s, c) => s + countNodes(c), 0)
}

function collectDepts(node, set = new Set()) {
  if (node.department) set.add(node.department)
  ;(node.children || []).forEach(c => collectDepts(c, set))
  return set
}

function nodeMatches(node, q) {
  return (
    (node.name || '').toLowerCase().includes(q) ||
    (node.position || '').toLowerCase().includes(q) ||
    (node.department || '').toLowerCase().includes(q)
  )
}

function filterTree(node, q) {
  if (!q) return node
  const kids = (node.children || []).map(c => filterTree(c, q)).filter(Boolean)
  return nodeMatches(node, q) || kids.length > 0 ? { ...node, children: kids } : null
}

// ─── Employee card ────────────────────────────────────────────────────────────

function EmployeeCard({ node, expanded, hasChildren, onToggle }) {
  const color = deptColor(node.department)
  const ini = initials(node.name)
  const directCount = node.children?.length || 0

  return (
    <div
      className="relative bg-white rounded-xl shadow-sm transition-shadow duration-150 hover:shadow-md"
      style={{
        minWidth: 180,
        maxWidth: 210,
        border: `2px solid ${expanded && hasChildren ? color : '#e5e7eb'}`,
      }}
    >
      {/* Coloured top bar */}
      <div className="h-1 rounded-t-[10px]" style={{ backgroundColor: color }} />

      <div className="p-3">
        {/* Avatar + name */}
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: color }}
          >
            {node.photoPath
              ? <img src={node.photoPath} alt={node.name} className="w-full h-full object-cover" />
              : ini}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm text-gray-900 leading-tight truncate">
              {node.name || `Employee #${node.id}`}
            </div>
            {node.position && (
              <div className="text-xs truncate mt-0.5 font-medium" style={{ color }}>
                {node.position}
              </div>
            )}
          </div>
        </div>

        {/* Department badge */}
        {node.department && (
          <div
            className="inline-flex items-center text-xs px-2 py-0.5 rounded-full max-w-full mb-1.5"
            style={{ backgroundColor: color + '18', color }}
          >
            <span className="truncate">{node.department}</span>
          </div>
        )}

        {/* Expand/collapse toggle */}
        {hasChildren && (
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center gap-1.5 text-xs rounded-lg py-1.5 mt-1 font-medium transition-colors duration-150"
            style={{
              backgroundColor: expanded ? color + '18' : '#f3f4f6',
              color: expanded ? color : '#6b7280',
            }}
          >
            <svg
              className="w-3 h-3 transition-transform duration-200"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {directCount} report{directCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Org node (recursive) ─────────────────────────────────────────────────────

function OrgNode({ node, search, depth = 0 }) {
  // Auto-collapse levels beyond 1 (can still manually expand)
  const [expanded, setExpanded] = useState(depth < 2)
  const isExpanded = search ? true : expanded
  const kids = (node.children || [])
  const hasChildren = kids.length > 0
  const visibleKids = isExpanded ? kids : []

  return (
    <div className="flex flex-col items-center">
      <EmployeeCard
        node={node}
        expanded={isExpanded}
        hasChildren={hasChildren}
        onToggle={() => setExpanded(v => !v)}
      />

      {hasChildren && isExpanded && visibleKids.length > 0 && (
        <>
          {/* Vertical stem going down from card */}
          <div className="w-px bg-gray-300 flex-shrink-0" style={{ height: 32 }} />

          {visibleKids.length === 1 ? (
            /* Single child: straight vertical, no T-bar */
            <OrgNode node={visibleKids[0]} search={search} depth={depth + 1} />
          ) : (
            /* Multiple children: T-bar connectors */
            <div className="flex items-start">
              {visibleKids.map((child, idx) => {
                const isFirst = idx === 0
                const isLast = idx === visibleKids.length - 1
                return (
                  <div
                    key={child.id}
                    className="relative flex flex-col items-center"
                    style={{ paddingLeft: 16, paddingRight: 16 }}
                  >
                    {/* Horizontal T-bar segment — spans from centre of card outward */}
                    <div
                      className="absolute bg-gray-300"
                      style={{
                        top: 0,
                        height: 1,
                        left: isFirst ? '50%' : 0,
                        right: isLast ? '50%' : 0,
                      }}
                    />
                    {/* Vertical stem going down to child card */}
                    <div className="w-px bg-gray-300 flex-shrink-0" style={{ height: 32 }} />
                    <OrgNode node={child} search={search} depth={depth + 1} />
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const orgChart = useSelector(s => s.employees.orgChart)
  const [search, setSearch] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (companyId) {
      dispatch(fetchOrgChart({ companyId })).finally(() => setLoaded(true))
    }
  }, [dispatch, companyId])

  const allRoots = useMemo(
    () => (orgChart || []).filter(e => !e.managerId),
    [orgChart],
  )

  const totalEmployees = useMemo(
    () => allRoots.reduce((s, r) => s + countNodes(r), 0),
    [allRoots],
  )

  const allDepts = useMemo(() => {
    const s = new Set()
    allRoots.forEach(r => collectDepts(r, s))
    return s
  }, [allRoots])

  const q = search.toLowerCase().trim()
  const roots = useMemo(
    () => q ? allRoots.map(r => filterTree(r, q)).filter(Boolean) : allRoots,
    [allRoots, q],
  )

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Org Chart" subtitle="Company organizational hierarchy">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, position, department…"
            className="border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none"
            >
              ×
            </button>
          )}
        </div>
      </PageHeader>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-3 bg-white border-b border-gray-100 text-sm">
        <StatPill color="#6366f1" label="employees" value={totalEmployees} />
        <StatPill color="#8b5cf6" label="departments" value={allDepts.size} />
        {q && (
          <span className="text-indigo-600 ml-2">
            Showing results for <strong>"{search}"</strong>
          </span>
        )}
      </div>

      {/* Department legend */}
      {allDepts.size > 0 && (
        <div className="flex flex-wrap gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100">
          {[...allDepts].map(dept => (
            <span
              key={dept}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: deptColor(dept) + '18', color: deptColor(dept) }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: deptColor(dept) }}
              />
              {dept}
            </span>
          ))}
        </div>
      )}

      {/* Tree canvas */}
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        {!loaded ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : roots.length === 0 ? (
          <div className="text-center py-24">
            <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-400 text-sm">
              {q ? `No employees match "${search}"` : 'No org chart data available'}
            </p>
          </div>
        ) : (
          <div className="flex gap-16 justify-start items-start min-w-max pb-8">
            {roots.map(root => (
              <OrgNode key={root.id} node={root} search={q} depth={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatPill({ color, value, label }) {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="font-semibold text-gray-900">{value}</span>
      {label}
    </div>
  )
}
