// Calendar-month subtraction matches Java LocalDate.minusMonths(2), including month ends.
export function earliestLeaveDate(today = new Date()) {
    const cutoff = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const lastDay = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 0).getDate();
    cutoff.setDate(Math.min(today.getDate(), lastDay));
    return `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
}

export function validateLeaveStartDate(value, today = new Date()) {
    return !value || value >= earliestLeaveDate(today)
        || `Leave can only be applied up to 2 months in the past. Start date must be on or after ${earliestLeaveDate(today)}`;
}
