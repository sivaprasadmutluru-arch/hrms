# Employee leave order

The Leave Management and ESS screens order leave selections, assigned leaves,
and balance cards as Annual, Sick, Compassionate, Paternity, Maternity. An
employee's existing allocations determine which balances and assigned types
appear. Additional leave types follow the standard types in their existing
relative order. Request history retains its existing order.

The shared `assets/employee-leave-order.js` helper handles type definitions,
balance DTOs and allocation records. It recognizes labels with or without
"Leave", different case or whitespace, and combined Paternity/Maternity labels.
It returns a new array and preserves every record, ID and balance value.

This checkout includes a prebuilt frontend. Port the helper into the Leave and
ESS source components before replacing static assets with a new frontend build.

Checks: `node tests/employee-leave-order.test.mjs` and
`node tests/leave-date-window.test.mjs` (10 tests passed).
