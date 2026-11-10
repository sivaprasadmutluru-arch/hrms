import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Minus, Plus, Search, Users } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import useAuth from '../../hooks/useAuth'
import { API_BASE_URL } from '../../config/constants'
import useCompanyOrgChart from './useCompanyOrgChart'
import { countChartEmployees, chartGroupLabels, filterOrgChart } from './orgChartGrouping'
import './OrgChartPage.css'

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
}

function OrgNode({ node, search, expandAll, depth = 0 }) {
  const [expanded, setExpanded] = useState(expandAll)
  const children = node.children || []
  const open = !!search || expanded
  const directReports = node.directReportCount ?? children.length
  return <li role="treeitem" aria-label={`${node.name}, ${node.position || 'Employee'}`} aria-expanded={children.length ? open : undefined}>
    <article className={`org-person ${depth === 0 ? 'org-person-leader' : ''}`}>
      <div className="org-person-avatar">
        {node.photoPath ? <img src={node.photoPath.startsWith('http') ? node.photoPath : `${API_BASE_URL.replace('/api', '')}/media/${node.photoPath}`} alt="" /> : initials(node.name)}
      </div>
      <div className="org-person-name">{node.name || `Employee #${node.id}`}</div>
      <div className="org-person-position">{node.position || 'Position not assigned'}</div>
      <div className="org-person-department">{node.department || 'Department not assigned'}</div>
      {node.hierarchyIssue && <p className="org-person-warning">{node.hierarchyIssue}</p>}
      {children.length > 0 && <button type="button" className="org-person-toggle" onClick={() => setExpanded(value => !value)} aria-label={`${open ? 'Collapse' : 'Expand'} reports for ${node.name}`} aria-expanded={open}>
        <Users size={13} /> {directReports} direct report{directReports === 1 ? '' : 's'} {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>}
    </article>
    {children.length > 0 && open && <ul role="group">{children.map(child => <OrgNode key={child.id} node={child} search={search} expandAll={expandAll} depth={depth + 1} />)}</ul>}
  </li>
}

export default function OrgChartPage() {
  const { effectiveCompanyId } = useAuth()
  const { nodes, loaded, error } = useCompanyOrgChart(effectiveCompanyId)
  const [search, setSearch] = useState('')
  const [zoom, setZoom] = useState(100)
  const [expansion, setExpansion] = useState({ all: true, revision: 0 })
  const total = useMemo(() => countChartEmployees(nodes), [nodes])
  const departments = useMemo(() => chartGroupLabels(nodes, 'department'), [nodes])
  // Preserve real reporting relationships. Departments belong on employee cards,
  // never between a manager and their direct reports as artificial tree nodes.
  const query = search.trim().toLowerCase()
  const roots = useMemo(() => {
    const withCounts = items => items.map(node => ({ ...node, directReportCount: (node.children || []).length, children: withCounts(node.children || []) }))
    return filterOrgChart(withCounts(nodes), query)
  }, [nodes, query])
  const expand = all => setExpansion(previous => ({ all, revision: previous.revision + 1 }))
  return <div className="org-chart-page">
    <PageHeader title="Organization chart" subtitle="Reporting hierarchy · managers and their direct reports" />
    <section className="org-chart-panel">
      <div className="org-chart-toolbar">
        <div className="org-chart-summary"><Users size={18} /><strong>{total}</strong> employees <span>·</span> {departments.length} departments</div>
        <div className="org-chart-actions">
          <label className="org-chart-search"><Search size={16} /><input aria-label="Search organization chart" placeholder="Search name, position or department" value={search} onChange={event => setSearch(event.target.value)} />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')}>×</button>}</label>
          <button type="button" onClick={() => expand(true)}>Expand all</button>
          <button type="button" onClick={() => expand(false)} disabled={!!query}>Collapse all</button>
          <div className="org-chart-zoom"><button type="button" aria-label="Zoom out" disabled={zoom <= 50} onClick={() => setZoom(value => value - 10)}><Minus size={15} /></button><button type="button" aria-label="Reset zoom" onClick={() => setZoom(100)}>{zoom}%</button><button type="button" aria-label="Zoom in" disabled={zoom >= 150} onClick={() => setZoom(value => value + 10)}><Plus size={15} /></button></div>
        </div>
      </div>
      <div className="org-chart-canvas" tabIndex={0} aria-label="Scrollable reporting hierarchy">
        {!effectiveCompanyId ? <p className="org-chart-empty">Select a company to view its organization chart.</p> : error ? <p role="alert" className="org-chart-empty text-red-600">{error}</p> : !loaded ? <p role="status" className="org-chart-empty">Loading organization chart…</p> : !roots.length ? <p className="org-chart-empty">{query ? 'No employees match your search.' : 'No employees to display yet.'}</p> :
          <div className="org-chart-forest" style={{ zoom: zoom / 100 }} key={`${effectiveCompanyId}:${expansion.revision}`}>
            {roots.map(root => <ul className="org-chart-tree" role="tree" aria-label={`Reporting tree for ${root.name}`} key={root.id}><OrgNode node={root} search={query} expandAll={expansion.all} /></ul>)}
          </div>}
      </div>
      <div className="org-chart-footer">Lines show the reporting manager assigned to each employee. Scroll to explore larger teams.</div>
    </section>
  </div>
}
