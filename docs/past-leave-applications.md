# Past leave applications

New leave applications can start on or after today's date minus two calendar
months, including the cutoff date. For example, on 2026-10-07 the earliest
allowed start date is 2026-08-07. Month ends clamp to the target month's last day.
Today and future dates remain valid. The end date must be on or after the start.

`LeaveService.applyLeave` enforces the window for both `/api/leave/apply` and
`/api/ess/apply-leave`, before querying balances or saving requests. Existing
balance, overlap, half-day and approval checks continue to run. Historical
imports and existing records are unaffected.

The prebuilt Leave and ESS pages use `assets/leave-date-window.js` for their
date-picker minimum and form validation. When rebuilding from the separate
frontend source project, port that date policy into both application forms.

Validation:

```powershell
node tests/leave-date-window.test.mjs
# Local Chrome: submits all three real forms, intercepting requests to avoid writes.
node tests/leave-submission-browser.mjs
# Backend: LeaveApplicationDateTest plus existing leave regressions.
```

The date validator must be registered as `value => validateLeaveStartDate(value)`.
React Hook Form supplies the whole form as the callback's second argument;
passing the helper directly incorrectly treats that object as a Date and blocks
submission. The regression executes the callback with the actual two-argument
contract, and the Chrome check covers self, another employee, and ESS forms.
The ESS balance thunk and selector are explicitly exported/imported and its
fulfilled action populates `ess.leaveBalance`.
