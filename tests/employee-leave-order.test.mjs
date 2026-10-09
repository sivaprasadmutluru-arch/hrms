import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const assets = new URL('../src/main/resources/static/assets/', import.meta.url);
const source = await readFile(new URL('employee-leave-order.js', assets), 'utf8');
const { orderEmployeeLeaves } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('leave selections use the requested order, with other types afterwards', () => {
    const leaves = ['Unpaid Leave', 'Maternity Leave', 'Compassionate', 'Sick Leave', 'Annual Leave', 'Paternity Leave', 'Study Leave'].map(name => ({ name }));
    assert.deepEqual(orderEmployeeLeaves(leaves).map(leave => leave.name),
        ['Annual Leave', 'Sick Leave', 'Compassionate', 'Paternity Leave', 'Maternity Leave', 'Unpaid Leave', 'Study Leave']);
});

test('balance and allocation records sort by leave type without mutating data', () => {
    const maternity = Object.freeze({ id: 1, leaveTypeName: 'Maternity Leave', availableDays: 90, employeeId: 5 });
    const annual = Object.freeze({ id: 2, leaveTypeName: 'Annual Leave', availableDays: 20, employeeId: 5 });
    const sick = Object.freeze({ id: 3, leaveType: { name: 'Sick Leave' }, availableDays: 5, employeeId: 5 });
    const original = Object.freeze([maternity, annual, sick]);
    const ordered = orderEmployeeLeaves(original);
    assert.deepEqual(ordered, [annual, sick, maternity]);
    assert.deepEqual(original, [maternity, annual, sick]);
    assert.equal(ordered[0], annual);
    assert.equal(ordered[0].availableDays, 20);
});

test('only types already assigned to an employee are displayed', () => {
    for (const applicable of ['Paternity', 'Maternity']) {
        const leaves = [{ leaveTypeName: applicable }, { leaveTypeName: 'Sick' }, { leaveTypeName: 'Annual' }, { leaveTypeName: 'Compassionate' }];
        assert.deepEqual(orderEmployeeLeaves(leaves).map(leave => leave.leaveTypeName), ['Annual', 'Sick', 'Compassionate', applicable]);
        assert.equal(orderEmployeeLeaves(leaves).length, leaves.length);
    }
});

test('case, whitespace and combined parental labels do not change the priority', () => {
    const leaves = [{ name: ' Paternity / Maternity Leave ' }, { name: 'COMPASSIONATE  LEAVE' }, { name: ' sick leave ' }, { name: 'Annual' }];
    assert.deepEqual(orderEmployeeLeaves(leaves), [leaves[3], leaves[2], leaves[1], leaves[0]]);
    assert.deepEqual(orderEmployeeLeaves(null), []);
});

test('both employee screens order their actual selectors, balances and assigned lists', async () => {
    const ess = await readFile(new URL('ESSPage-DUzgNWLy.js', assets), 'utf8');
    const leave = await readFile(new URL('LeavePage-CCb9a5cC.js', assets), 'utf8');
    assert.match(ess, /function B\([^)]*\)\{n=orderEmployeeLeaves\(n\),r=orderEmployeeLeaves\(r\);/);
    assert.match(leave, /Ze=orderEmployeeLeaves\(r\(e=>e.leave.leaveTypes\)\)/);
    assert.match(leave, /Qe=orderEmployeeLeaves\(r\(e=>e.leave.leaveAllocations\)\)/);
    assert.match(leave, /\$e=orderEmployeeLeaves\(r\(ge\)\)/);
});
