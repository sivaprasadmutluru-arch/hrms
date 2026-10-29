const label = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
const key = value => label(value).toLocaleLowerCase('en')

function visit(nodes, action) {
  for (const node of nodes || []) {
    action(node)
    visit(node.children, action)
  }
}

export function orgChartGroupingMode(nodes, departments = []) {
  let hasAssignedDepartment = false
  visit(nodes, node => { if (label(node.department)) hasAssignedDepartment = true })
  return departments.some(department => department.isActive !== false && department.active !== false && label(department.name)) || hasAssignedDepartment
    ? 'department' : 'position'
}

export function validateCompanyChartData(companyId, nodes, departments) {
  if (!Array.isArray(nodes) || !Array.isArray(departments)) throw new Error('Invalid org-chart response')
  if (departments.some(department => {
    const owner = department.companyId ?? department.company?.id
    return owner != null && String(owner) !== String(companyId)
  })) throw new Error('Department response does not match the selected company')
  return { nodes, departments }
}

// Group siblings, never flatten the reporting tree or invent managers based on
// job titles. Removing the visual group nodes reproduces the original edges.
export function groupOrgChart(nodes, mode) {
  const field = mode === 'department' ? 'department' : 'position'
  function siblings(items, parentPath, parentLabel) {
    const groups = new Map()
    for (const node of items || []) {
      const groupLabel = label(node[field]) || 'Unassigned'
      const groupKey = key(groupLabel)
      if (!groups.has(groupKey)) groups.set(groupKey, { name: groupLabel, members: [] })
      groups.get(groupKey).members.push({
        ...node,
        chartColorKey: groupKey,
        directReportCount: (node.children || []).length,
        children: siblings(node.children, `${parentPath}/employee-${node.id}`, groupLabel),
      })
    }
    // One group identical to the manager's group needs no repeated heading.
    if (groups.size === 1 && groups.has(key(parentLabel))) return [...groups.values()][0].members
    return [...groups.entries()].sort(([a], [b]) => a === 'unassigned' ? 1 : b === 'unassigned' ? -1 : a.localeCompare(b))
      .map(([groupKey, group]) => ({
        id: `chart-group:${parentPath}:${field}:${encodeURIComponent(groupKey)}`,
        name: group.name,
        isChartGroup: true,
        groupKind: field,
        chartColorKey: groupKey,
        children: group.members,
      }))
  }
  return siblings(nodes, 'company', null)
}

export function countChartEmployees(nodes) {
  let count = 0
  visit(nodes, node => { if (!node.isChartGroup) count++ })
  return count
}

export function chartGroupLabels(nodes, mode) {
  const labels = new Map()
  visit(nodes, node => {
    if (node.isChartGroup) return
    const text = label(node[mode === 'department' ? 'department' : 'position']) || 'Unassigned'
    if (!labels.has(key(text))) labels.set(key(text), text)
  })
  return [...labels.values()].sort((a, b) => a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : a.localeCompare(b))
}

export function filterOrgChart(nodes, search) {
  const query = key(search)
  if (!query) return nodes
  function filter(node) {
    if (node.isChartGroup && key(node.name).includes(query)) return node
    const children = (node.children || []).map(filter).filter(Boolean)
    const matches = [node.name, node.position, node.department].some(value => key(value).includes(query))
    return matches || children.length ? { ...node, children } : null
  }
  return nodes.map(filter).filter(Boolean)
}
