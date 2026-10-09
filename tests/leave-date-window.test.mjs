import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const assets = new URL('../src/main/resources/static/assets/', import.meta.url);
const source = await readFile(new URL('leave-date-window.js', assets), 'utf8');
const { earliestLeaveDate, validateLeaveStartDate } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

for (const [year, month, day, cutoff] of [
    [2026, 10, 7, '2026-08-07'], [2026, 4, 30, '2026-02-28'],
    [2024, 4, 30, '2024-02-29'], [2026, 1, 31, '2025-11-30'],
]) {
    test(`two calendar months from ${year}-${month}-${day} includes ${cutoff}`, () => {
        const today = new Date(year, month - 1, day);
        assert.equal(earliestLeaveDate(today), cutoff);
        assert.equal(validateLeaveStartDate(cutoff, today), true);
        const earlier = new Date(Number(cutoff.slice(0, 4)), Number(cutoff.slice(5, 7)) - 1, Number(cutoff.slice(8)) - 1);
        const earlierString = `${earlier.getFullYear()}-${String(earlier.getMonth() + 1).padStart(2, '0')}-${String(earlier.getDate()).padStart(2, '0')}`;
        assert.match(validateLeaveStartDate(earlierString, today), /2 months/);
        assert.equal(validateLeaveStartDate('2027-12-01', today), true);
    });
}

test('both application forms wire the date picker and form validator to the policy', async () => {
    for (const file of ['ESSPage-DUzgNWLy.js', 'LeavePage-CCb9a5cC.js']) {
        const bundle = await readFile(new URL(file, assets), 'utf8');
        assert.match(bundle, /import \{earliestLeaveDate,validateLeaveStartDate\}/);
        assert.match(bundle, /min:(?:E\?void 0:)?earliestLeaveDate\(\)/);
        const callback = bundle.match(/(?:f|X)\(`startDate`,\{required:`Required`,validate:(?:E\?void 0:)?([^}]+)\}\)/)?.[1];
        assert.ok(callback, `${file} must register a date validator`);
        const validate = new Function('validateLeaveStartDate', `return ${callback}`)(validateLeaveStartDate);
        // React Hook Form invokes validate(value, allFormValues), not validate(value, date).
        assert.equal(validate('2027-12-01', { applyFor: 'employee', employeeId: '1' }), true);
        assert.match(validate('2000-01-01', { applyFor: 'self' }), /2 months/);
    }
});
