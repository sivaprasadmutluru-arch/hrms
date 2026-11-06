import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Search, Users, ArrowRight, LoaderCircle, X,
  Building2, Ticket, Laptop, FolderGit2, Briefcase, FileText,
  Compass, ShieldCheck, CheckCircle2,
} from 'lucide-react'
import useAuth from '../../hooks/useAuth'
import api from '../../services/api'
import { getNavSections } from './Sidebar'
import './GlobalSearch.css'

// ─── Comprehensive Searchable Pages Registry with Keywords ─────────────────────
const EXTENDED_PAGE_METADATA = [
  { path: '/dashboard', label: 'Dashboard', group: 'Overview', tags: 'overview kpi analytics home summary stats' },
  { path: '/employees/me', label: 'My Profile', group: 'Personal', tags: 'profile account password credentials personal' },
  { path: '/admin/profile', label: 'Admin Profile', group: 'Personal', tags: 'admin profile account settings password' },
  { path: '/employees', label: 'Employees Directory', group: 'Workforce', tags: 'staff workers team members colleagues directory add employee' },
  { path: '/org-chart', label: 'Organization Chart', group: 'Workforce', tags: 'hierarchy reporting structure tree managers team' },
  { path: '/onboarding', label: 'Onboarding', group: 'Workforce', tags: 'new hires orientation joiners induction checklist' },
  { path: '/offboarding', label: 'Offboarding', group: 'Workforce', tags: 'exit resignation clearance relieving settlement notice period' },
  { path: '/offboarding/plans', label: 'Offboarding Plans', group: 'Workforce', tags: 'exit plans tasks checklists handover' },
  { path: '/offboarding/resignations', label: 'Resignations', group: 'Workforce', tags: 'resignation requests notice period exit' },
  { path: '/employee-settings', label: 'Employee Settings', group: 'Workforce', tags: 'badge id employee code settings fields custom' },
  { path: '/bonus-points', label: 'Bonus Points', group: 'Workforce', tags: 'rewards kudos recognition incentives points' },
  { path: '/disciplinary-actions', label: 'Disciplinary Actions', group: 'Workforce', tags: 'warnings violations conduct inquiry' },
  { path: '/policies', label: 'Company Policies', group: 'Workforce', tags: 'policy handbook code of conduct compliance rules' },
  
  // Attendance
  { path: '/attendance', label: 'Attendance Records', group: 'Attendance', tags: 'daily attendance clock in clock out check in punch logs hours regularisation individual history' },
  { path: '/attendance/dashboard', label: 'Attendance Dashboard', group: 'Attendance', tags: 'presence late arrival early out overtime summary' },
  { path: '/attendance/calendar', label: 'Attendance Calendar', group: 'Attendance', tags: 'monthly calendar shifts schedule attendance days' },
  { path: '/attendance/register', label: 'Attendance Register', group: 'Attendance', tags: 'muster roll monthly attendance register timesheet' },
  { path: '/attendance/regularisation', label: 'Attendance Regularisation', group: 'Attendance', tags: 'regularize punch missed clock in correction request pending approval' },
  { path: '/attendance/shift-allocations', label: 'Shift Allocations', group: 'Attendance', tags: 'roster shifts night shift general shift assign shift' },
  { path: '/attendance/rotating-shifts', label: 'Rotating Shifts', group: 'Attendance', tags: 'rotational schedules cycle rotation' },
  { path: '/attendance/work-records', label: 'Work Records', group: 'Attendance', tags: 'work day records fdp hdp half day full day' },
  { path: '/attendance/settings', label: 'Attendance Settings', group: 'Attendance', tags: 'grace time grace period minimum hours overtime settings' },
  
  // Leave
  { path: '/leave', label: 'Leave Requests', group: 'Leave', tags: 'apply leave time off vacation sick casual pto holiday request' },
  { path: '/leave/dashboard', label: 'Leave Dashboard', group: 'Leave', tags: 'leave summary metrics calendar' },
  { path: '/leave/balance', label: 'Leave Balance', group: 'Leave', tags: 'entitlements remaining leaves accruals balance' },
  { path: '/leave/allocations', label: 'Leave Allocations', group: 'Leave', tags: 'credit leaves annual allocation quota grant' },
  { path: '/leave/types', label: 'Leave Types', group: 'Leave', tags: 'sick leave casual leave maternity paternity annual leave types' },
  { path: '/leave/holidays', label: 'Public Holidays', group: 'Leave', tags: 'holidays calendar days off gazetted holidays' },
  { path: '/leave/restrictions', label: 'Leave Restrictions', group: 'Leave', tags: 'blackout dates sandwich rule restrictions' },
  
  // Payroll
  { path: '/payroll/dashboard', label: 'Payroll Dashboard', group: 'Payroll', tags: 'salary metrics net pay gross pay payouts' },
  { path: '/payroll/payslips', label: 'Payslips', group: 'Payroll', tags: 'salary slips download payslip inr earnings deductions gross net salary slip' },
  { path: '/payroll/automated', label: 'Automated Payroll', group: 'Payroll', tags: 'run payroll batch process automated salary computation' },
  { path: '/payroll/manual', label: 'Manual Payroll', group: 'Payroll', tags: 'manual salary adjustments one off payments' },
  { path: '/payroll/contracts', label: 'Salary Contracts', group: 'Payroll', tags: 'ctc gross salary structure base pay basic hra' },
  { path: '/payroll/allowances', label: 'Allowances', group: 'Payroll', tags: 'hra dearness allowance conveyance medical allowance' },
  { path: '/payroll/deductions', label: 'Deductions', group: 'Payroll', tags: 'provident fund pf esi professional tax pt tds statutory deductions' },
  { path: '/payroll/tax-settings', label: 'Tax Settings', group: 'Payroll', tags: 'income tax slabs old regime new regime tds section 80c tax' },
  { path: '/payroll/loans', label: 'Employee Loans', group: 'Payroll', tags: 'salary advances emi installments loan repayment' },
  { path: '/payroll/reimbursements', label: 'Reimbursements', group: 'Payroll', tags: 'expense claims travel expense medical claims receipts' },
  { path: '/payroll/gratuity', label: 'Gratuity / EOSB', group: 'Payroll', tags: 'end of service benefits gratuity calculation settlement' },
  { path: '/payroll/batch-groups', label: 'Payroll Batch Groups', group: 'Payroll', tags: 'pay groups salary batches frequency' },
  { path: '/payroll/settings', label: 'Payroll Settings', group: 'Payroll', tags: 'currency pay cycle salary configuration' },

  // Recruitment
  { path: '/recruitment/dashboard', label: 'Recruitment Dashboard', group: 'Recruitment', tags: 'hiring metrics vacancies talent acquisition' },
  { path: '/recruitment/posts', label: 'Job Posts', group: 'Recruitment', tags: 'job openings vacancies publish jobs careers' },
  { path: '/recruitment/pipeline', label: 'Recruitment Pipeline', group: 'Recruitment', tags: 'kanban board stages candidate screening' },
  { path: '/recruitment/applicants', label: 'Applicants', group: 'Recruitment', tags: 'candidates resumes cvs job applications' },
  { path: '/recruitment/interviews', label: 'Interviews', group: 'Recruitment', tags: 'interview schedule evaluations rounds interviewers' },
  { path: '/recruitment/skill-zones', label: 'Skill Zones', group: 'Recruitment', tags: 'talent pool skill inventory' },
  { path: '/recruitment/skills', label: 'Skills Library', group: 'Recruitment', tags: 'competencies required skills' },

  // Helpdesk
  { path: '/helpdesk', label: 'Helpdesk Tickets', group: 'Helpdesk', tags: 'tickets support issues it support hr complaints assistance' },
  { path: '/helpdesk/faq', label: 'Helpdesk FAQ', group: 'Helpdesk', tags: 'faq knowledge base questions answers guides' },

  // Assets
  { path: '/assets', label: 'Assets & Hardware', group: 'Assets', tags: 'hardware laptops macbook inventory equipment allocated assets' },
  { path: '/assets/categories', label: 'Asset Categories', group: 'Assets', tags: 'electronics furniture licenses hardware types' },
  { path: '/assets/requests', label: 'Asset Requests', group: 'Assets', tags: 'request asset hardware requisition laptop request' },

  // Projects
  { path: '/projects', label: 'Projects & Tasks', group: 'Projects', tags: 'projects milestones client tasks timesheets' },

  // Biometric & Geofencing
  { path: '/biometric/devices', label: 'Biometric Devices', group: 'Biometric', tags: 'zkteco adms biometric attendance device ip sync' },
  { path: '/biometric/employees', label: 'Biometric Employees', group: 'Biometric', tags: 'fingerprint sync face sync card number device users' },
  { path: '/geofencing', label: 'Geo Fencing', group: 'Biometric', tags: 'gps location radius office boundaries geofence' },
  { path: '/face-detection', label: 'Face Detection', group: 'Biometric', tags: 'facial recognition camera attendance' },

  // Documents
  { path: '/documents/letters', label: 'Letters & Certificates', group: 'Documents', tags: 'offer letter experience relieving bonafide salary certificate generated' },
  { path: '/documents/requests', label: 'Document Requests', group: 'Documents', tags: 'request certificate employee documents letters' },

  // Setup & Organization
  { path: '/departments', label: 'Departments', group: 'Organization', tags: 'departments units divisions engineering hr sales finance' },
  { path: '/job-positions', label: 'Job Positions', group: 'Organization', tags: 'designations job positions titles roles' },
  { path: '/job-roles', label: 'Job Roles', group: 'Organization', tags: 'job roles responsibilities' },
  { path: '/work-types', label: 'Work Types', group: 'Organization', tags: 'full time part time contract remote hybrid on site' },
  { path: '/shift-schedules', label: 'Shift Schedules', group: 'Organization', tags: 'timings morning evening night general shift' },
  { path: '/companies', label: 'Companies & Branches', group: 'Organization', tags: 'branches head office locations entities' },
  { path: '/companies/settings', label: 'Company Settings', group: 'Organization', tags: 'company profile logo address working days timezone' },
  { path: '/settings/general', label: 'General Settings', group: 'Settings', tags: 'configuration branding global settings' },
  { path: '/settings/roles', label: 'Roles & Permissions', group: 'Settings', tags: 'rbac access control user permissions groups' },
  { path: '/settings/mail-automation', label: 'Mail Automation', group: 'Settings', tags: 'smtp email alerts notifications automated emails' },

  // Platform & Billing
  { path: '/organizations', label: 'Organizations', group: 'Platform', tags: 'tenants platform organizations companies client' },
  { path: '/subscription', label: 'Subscription & Pricing', group: 'Platform', tags: 'pricing plans free starter basic growth standard scale enterprise gst 18% razorpay upgrade' },
  { path: '/platform/billing', label: 'Organization Billing', group: 'Platform', tags: 'billing invoices payments receipts subscription plans' },
  { path: '/platform/website-enquiries', label: 'Website Enquiries', group: 'Platform', tags: 'website contact form inquiries leads messages' },
  { path: '/platform/monitor', label: 'Platform Monitor', group: 'Platform', tags: 'system health performance uptime server status' },
  { path: '/accounting', label: 'Accounting', group: 'Accounting', tags: 'financial ledgers accounting invoices expenses revenue' },
  { path: '/accounting/staffing', label: 'Staffing & Contracts', group: 'Accounting', tags: 'vendor staffing timesheet billing contractor management' },
]

function getAccessiblePages(auth, moduleVisibility) {
  const pages = new Map()

  // First collect pages from Sidebar nav sections to confirm role permissions
  const navSections = getNavSections(auth)
  const allowedPaths = new Set()
  for (const section of navSections) {
    for (const item of section.items) {
      const children = item.children || [item]
      for (const child of children) {
        if (child.to && auth.canAccessPath(child.to)) {
          allowedPaths.add(child.to)
        }
      }
    }
  }

  // Map each page, combining nav sections + extended metadata keywords
  for (const p of EXTENDED_PAGE_METADATA) {
    if (!allowedPaths.has(p.path) && !auth.canAccessPath(p.path)) continue
    if (p.path === '/payroll/payslips' && moduleVisibility.payslips === false) continue
    if (p.path === '/payroll/loans' && moduleVisibility.loans === false) continue
    if (p.path === '/payroll/reimbursements' && moduleVisibility.reimbursements === false) continue

    pages.set(p.path, {
      path: p.path,
      title: p.label,
      group: p.group,
      text: `${p.label} ${p.group} ${p.tags || ''}`.toLowerCase(),
    })
  }

  return [...pages.values()]
}

const CATEGORY_TABS = [
  { id: 'ALL',         label: 'All' },
  { id: 'PAGES',       label: 'Pages' },
  { id: 'EMPLOYEES',   label: 'Employees' },
  { id: 'DEPARTMENTS', label: 'Departments' },
  { id: 'HELPDESK',    label: 'Helpdesk' },
  { id: 'ASSETS',      label: 'Assets' },
  { id: 'PROJECTS',    label: 'Projects' },
  { id: 'RECRUITMENT', label: 'Recruitment' },
  { id: 'DOCUMENTS',   label: 'Documents' },
  { id: 'COMPANIES',   label: 'Companies' },
]

function getCategoryIcon(type) {
  switch (type) {
    case 'employee':    return <Users size={16} className="text-emerald-600" />
    case 'department':  return <Building2 size={16} className="text-indigo-600" />
    case 'position':    return <Briefcase size={16} className="text-indigo-600" />
    case 'ticket':      return <Ticket size={16} className="text-amber-600" />
    case 'asset':       return <Laptop size={16} className="text-purple-600" />
    case 'project':     return <FolderGit2 size={16} className="text-cyan-600" />
    case 'recruitment': return <Briefcase size={16} className="text-rose-600" />
    case 'document':    return <FileText size={16} className="text-slate-600" />
    case 'company':     return <Building2 size={16} className="text-blue-600" />
    default:            return <Compass size={16} className="text-blue-600" />
  }
}

export default function GlobalSearch() {
  const auth = useAuth()
  const navigate = useNavigate()
  const selectedCompanyId = useSelector(state => state.auth.selectedCompanyId)
  const companyId = auth.isPlatformAdmin() ? selectedCompanyId : auth.effectiveCompanyId

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')
  const [entityResults, setEntityResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [moduleVisibility, setModuleVisibility] = useState({})
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)

  const pages = useMemo(() => getAccessiblePages(auth, moduleVisibility), [auth, moduleVisibility])
  const trimmed = query.trim()

  // ── Navigation Page Results ──
  const pageResults = useMemo(() => {
    if (activeTab !== 'ALL' && activeTab !== 'PAGES') return []
    const q = trimmed.toLowerCase()
    if (!q) {
      // Default recommended shortcuts when input is empty
      const defaults = ['/dashboard', '/employees', '/attendance', '/leave', '/payroll/payslips', '/helpdesk', '/subscription']
      return pages
        .filter(page => defaults.includes(page.path))
        .map(page => ({ type: 'page', key: `page-${page.path}`, ...page }))
    }
    return pages
      .filter(page => page.text.includes(q))
      .slice(0, 8)
      .map(page => ({ type: 'page', key: `page-${page.path}`, ...page }))
  }, [pages, trimmed, activeTab])

  // ── Debounced Unified Backend Entity Search ──
  useEffect(() => {
    if (!open || trimmed.length < 2) {
      setEntityResults([])
      setLoading(false)
      return undefined
    }

    // Only skip backend call if the user strictly selected PAGES tab
    if (activeTab === 'PAGES') {
      setEntityResults([])
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setLoadError('')
      try {
        const params = { q: trimmed }
        if (activeTab !== 'ALL') {
          params.type = activeTab.toLowerCase()
        }

        const headers = companyId ? { 'X-Company-Id': companyId } : {}
        const response = await api.get('/search', {
          params,
          headers,
          signal: controller.signal,
        })
        const items = response.data?.items || []
        setEntityResults(items)
      } catch (error) {
        if (!controller.signal.aborted) {
          // Fallback gracefully without showing hard error
          setEntityResults([])
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 200)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, trimmed, activeTab, companyId])

  // Combine page results and entity results
  const allResults = useMemo(() => {
    const formattedEntities = entityResults.map(item => ({
      type: item.type,
      key: `entity-${item.id}`,
      path: item.path,
      title: item.title,
      group: item.category,
      subtitle: item.subtitle,
      badge: item.badge,
      status: item.status,
    }))

    if (activeTab === 'PAGES') return pageResults
    if (activeTab !== 'ALL') return formattedEntities

    return [...pageResults, ...formattedEntities]
  }, [pageResults, entityResults, activeTab])

  // Group results by category for clean visual presentation
  const groupedResults = useMemo(() => {
    const map = new Map()
    allResults.forEach(item => {
      const cat = item.type === 'page' ? 'Modules & Pages' : (item.group || 'Entities')
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(item)
    })
    return Array.from(map.entries())
  }, [allResults])

  const openSearch = useCallback(() => {
    setQuery('')
    setActiveTab('ALL')
    setEntityResults([])
    setLoadError('')
    setLoading(false)
    setActiveIndex(0)
    setOpen(true)
  }, [])

  useEffect(() => {
    const onShortcut = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openSearch()
      }
      if (event.key === '/' && !event.metaKey && !event.ctrlKey
          && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
          && !document.activeElement?.isContentEditable) {
        event.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [openSearch])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open || !companyId) return undefined
    let active = true
    api.get('/settings/module-visibility', { params: { companyId } })
      .then(response => { if (active) setModuleVisibility(response.data || {}) })
      .catch(() => { if (active) setModuleVisibility({}) })
    return () => { active = false }
  }, [open, companyId])

  const choose = result => {
    setOpen(false)
    if (result.path) navigate(result.path)
  }

  const onKeyDown = event => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(index => Math.min(index + 1, allResults.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(index => Math.max(0, index - 1))
    } else if (event.key === 'Enter' && allResults[activeIndex]) {
      event.preventDefault()
      choose(allResults[activeIndex])
    }
  }

  // Calculate current global index across groups for active highlighting
  let globalItemCounter = -1

  return (
    <>
      <button
        type="button"
        className="global-search-trigger"
        onClick={openSearch}
        aria-label="Search modules, employees, tickets and data"
        title="Search anything (⌘K or /)"
      >
        <Search size={16} aria-hidden="true" />
        <span className="global-search-trigger-label">Search modules, employees, tickets...</span>
        <kbd>⌘ K</kbd>
      </button>

      {open && (
        <div
          className="global-search-overlay"
          onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}
        >
          <section
            className="global-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Search everything in AccrueHRMS"
          >
            {/* ── Search Input Row ── */}
            <div className="global-search-input-row">
              <Search size={19} className="text-indigo-600 shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={event => {
                  setQuery(event.target.value)
                  setActiveIndex(0)
                  setLoadError('')
                }}
                onKeyDown={onKeyDown}
                placeholder="Search modules, employees, tickets, assets, projects, documents..."
                aria-label="Search anything"
                role="combobox"
                aria-expanded="true"
              />
              {loading && (
                <LoaderCircle size={18} className="animate-spin text-indigo-500" aria-label="Searching..." />
              )}
              <button
                type="button"
                className="global-search-close"
                onClick={() => setOpen(false)}
                aria-label="Close search"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Category Filter Tabs ── */}
            <div className="global-search-tabs">
              {CATEGORY_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id)
                    setActiveIndex(0)
                  }}
                  className={`global-search-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Search Results List ── */}
            <div className="global-search-results" id="global-search-results" role="listbox">
              {groupedResults.map(([groupName, items]) => (
                <div key={groupName} className="mb-2">
                  <p className="global-search-heading">{groupName}</p>
                  {items.map(item => {
                    globalItemCounter++
                    const thisIndex = globalItemCounter
                    const isActive = thisIndex === activeIndex

                    return (
                      <button
                        key={item.key}
                        type="button"
                        id={`global-search-result-${thisIndex}`}
                        className={`global-search-result ${isActive ? 'is-active' : ''}`}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIndex(thisIndex)}
                        onClick={() => choose(item)}
                      >
                        <span className="global-search-icon-wrap">
                          {getCategoryIcon(item.type)}
                        </span>
                        <div className="global-search-info">
                          <div className="flex items-center gap-2">
                            <strong className="global-search-title">{item.title}</strong>
                            {item.badge && (
                              <span className="global-search-badge">{item.badge}</span>
                            )}
                            {item.status && (
                              <span className="global-search-status">{item.status}</span>
                            )}
                          </div>
                          <small className="global-search-subtitle">
                            {item.subtitle || item.group || item.path}
                          </small>
                        </div>
                        <ArrowRight size={14} className="global-search-arrow" />
                      </button>
                    )
                  })}
                </div>
              ))}

              {/* Empty / Initial State */}
              {trimmed.length >= 2 && !loading && allResults.length === 0 && (
                <div className="py-8 text-center text-slate-500">
                  <p className="font-semibold text-sm">No results found for &ldquo;{trimmed}&rdquo;</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try searching by employee name, employee ID, ticket number, asset, or department.
                  </p>
                </div>
              )}

              {trimmed.length === 1 && (
                <p className="global-search-hint">Type at least 2 characters to search across all records.</p>
              )}
            </div>

            {/* ── Footer ── */}
            <footer className="global-search-footer flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-slate-400">
                <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-600">↑</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-600">↓</kbd> to move</span>
                <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-600">Enter</kbd> to open</span>
                <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-600">Esc</kbd> to close</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {allResults.length} {allResults.length === 1 ? 'match' : 'matches'}
              </span>
            </footer>
          </section>
        </div>
      )}
    </>
  )
}
