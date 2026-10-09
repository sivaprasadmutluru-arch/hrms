// Order presentation without changing an employee's assigned types or balances.
function priority(leave) {
    const name = String(leave?.leaveTypeName ?? leave?.leaveType?.name ?? leave?.name ?? '')
        .trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s+leave$/, '').replace(/\s*\/\s*/g, '/');
    switch (name) {
        case 'annual': return 0;
        case 'sick': return 1;
        case 'compassionate': return 2;
        case 'paternity':
        case 'paternity/maternity':
        case 'maternity/paternity': return 3;
        case 'maternity': return 4;
        default: return 10;
    }
}

export function orderEmployeeLeaves(leaves) {
    return [...(leaves || [])].sort((left, right) => priority(left) - priority(right));
}
