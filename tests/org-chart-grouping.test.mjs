import test from 'node:test'
import assert from 'node:assert/strict'
import {
  orgChartGroupingMode, groupOrgChart, countChartEmployees,
  chartGroupLabels, filterOrgChart, validateCompanyChartData,
} from '../src/features/employees/orgChartGrouping.js'

const employee = (id, values = {}) => ({ id, name: `Employee ${id}`, managerId: null, children: [], ...values })
function reportingEdges(nodes, managerId = null, edges = []) {
  for (const node of nodes) {
    if (node.isChartGroup) reportingEdges(node.children, managerId, edges)
    else {
      edges.push([node.id, managerId])
      reportingEdges(node.children || [], node.id, edges)
    }
  }
  return edges.sort(([a], [b]) => a - b)
}

test('configured departments take precedence over job positions, even before assignments', () => {
  const staff = [employee(1, { position: 'Accountant' })]
  assert.equal(orgChartGroupingMode(staff, [{ name: 'Finance' }]), 'department')
  assert.equal(groupOrgChart(staff, 'department')[0].name, 'Unassigned')
})

test('assigned departments are detected anywhere in a reporting tree', () => {
  const staff = [employee(1, { children: [employee(2, { department: 'Engineering' })] })]
  assert.equal(orgChartGroupingMode(staff, []), 'department')
})

test('no departments falls back to job position, never access role or job role', () => {
  const staff = [employee(1, { position: 'Senior Medical Underwriter', accessRoles: ['SUPER_ADMIN'], jobRole: 'Other' })]
  assert.equal(orgChartGroupingMode(staff), 'position')
  assert.equal(groupOrgChart(staff, 'position')[0].name, 'Senior Medical Underwriter')
})

test('inactive or blank department configuration does not enable department mode', () => {
  assert.equal(orgChartGroupingMode([], [{ name: 'Old', isActive: false }, { name: 'Closed', active: false }, { name: '  ' }]), 'position')
})

test('company department names are dynamic, not a Pioneer department template', () => {
  const groups = groupOrgChart([employee(1, { department: 'Logistics' }), employee(2, { department: 'R&D' })], 'department')
  assert.deepEqual(groups.map(node => node.name), ['Logistics', 'R&D'])
})

test('missing or blank position and department values go into Unassigned', () => {
  assert.equal(groupOrgChart([employee(1, { position: '  ' })], 'position')[0].name, 'Unassigned')
  assert.equal(groupOrgChart([employee(1, { department: null })], 'department')[0].name, 'Unassigned')
})

test('department grouping preserves every cross-department reporting edge', () => {
  const staff = [employee(1, { department: 'Management', children: [
    employee(2, { managerId: 1, department: 'Sales', children: [employee(3, { managerId: 2, department: 'Operations' })] }),
    employee(4, { managerId: 1, department: 'Finance' }),
  ] })]
  assert.deepEqual(reportingEdges(groupOrgChart(staff, 'department')), reportingEdges(staff))
  assert.equal(countChartEmployees(groupOrgChart(staff, 'department')), 4)
})

test('position grouping preserves managers and does not infer a CEO/COO chain', () => {
  const staff = [employee(1, { position: 'Engineer', children: [employee(2, { managerId: 1, position: 'CEO' })] }), employee(3, { position: 'COO' })]
  assert.deepEqual(reportingEdges(groupOrgChart(staff, 'position')), reportingEdges(staff))
})

test('existing orphan and cycle-warning roots remain visible rather than being filtered out', () => {
  const staff = [employee(1, { managerId: 999, hierarchyIssue: 'Manager outside selected company' }),
    employee(2, { managerId: 2, hierarchyIssue: 'Reporting cycle' })]
  assert.equal(countChartEmployees(groupOrgChart(staff, 'position')), 2)
  assert.equal(groupOrgChart(staff, 'position')[0].children[0].managerId, 999)
})

test('equivalent labels share one group; grouping never modifies API data', () => {
  const staff = [employee(1, { department: '  Customer   Success ' }), employee(2, { department: 'customer success' })]
  const before = structuredClone(staff)
  const grouped = groupOrgChart(staff, 'department')
  assert.equal(grouped.length, 1)
  assert.equal(grouped[0].children.length, 2)
  assert.deepEqual(staff, before)
})

test('same-department reports need no redundant heading under their manager', () => {
  const staff = [employee(1, { department: 'Sales', children: [employee(2, { department: 'Sales', managerId: 1 })] })]
  assert.equal(groupOrgChart(staff, 'department')[0].children[0].children[0].id, 2)
})

test('search keeps manager ancestry and the chosen grouping mode', () => {
  const staff = [employee(1, { department: 'Management', children: [employee(2, { department: 'Finance', position: 'Analyst' })] })]
  const result = filterOrgChart(groupOrgChart(staff, 'department'), 'analyst')
  assert.equal(result[0].groupKind, 'department')
  assert.deepEqual(reportingEdges(result), [[1, null], [2, 1]])
})

test('searching a department heading includes its members', () => {
  const staff = [employee(1, { department: 'Finance' }), employee(2, { department: 'Sales' })]
  assert.equal(countChartEmployees(filterOrgChart(groupOrgChart(staff, 'department'), 'finance')), 1)
})

test('totals count people, not visual groups; labels are distinct and include Unassigned', () => {
  const staff = [employee(1, { position: 'Driver' }), employee(2, { position: 'driver' }), employee(3)]
  assert.equal(countChartEmployees(groupOrgChart(staff, 'position')), 3)
  assert.deepEqual(chartGroupLabels(staff, 'position'), ['Driver', 'Unassigned'])
})

test('empty company data has no fabricated departments or employees', () => {
  assert.deepEqual(groupOrgChart([], 'department'), [])
  assert.deepEqual(chartGroupLabels([], 'position'), [])
})

test('company configuration from another company or invalid payloads fail closed', () => {
  assert.throws(() => validateCompanyChartData(7, [], [{ name: 'Finance', company: { id: 65 } }]), /selected company/)
  assert.throws(() => validateCompanyChartData(7, {}, []), /Invalid/)
  assert.deepEqual(validateCompanyChartData('7', [], [{ name: 'Finance', companyId: 7 }]).nodes, [])
})
