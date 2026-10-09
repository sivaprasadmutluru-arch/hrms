# Automatic monthly leave accrual

Monthly accrual requires `accrualEnabled=true` on the leave type and a positive
annual entitlement (`totalDays`). In Leave Types, edit the relevant type and
select **Enable monthly accrual (leave earned gradually, not upfront)**.
Do not enable this for every type without checking the organization's policy.

The scheduler processes the previous completed month at midnight, on application
readiness, and every hour while the application runs. This allows local machines
that are switched off overnight to post the previous month's credit automatically.
Each active organization is processed in its own tenant schema. The existing
employee/type/month accrual log prevents duplicate monthly credits on retry.
This catches up the previous month, not an arbitrary historical backlog.

The monthly rate is annual entitlement divided by 12, rounded to one decimal.
The existing joining-month policy remains: MANUAL skips that month; AUTO_PRORATA
credits a proportional amount. Existing balances are preserved.

Verification: `LeaveSchedulerTest` covers startup processing, periodic retry,
tenant selection, tenant failure isolation, missing schemas, and context restoration.
The local investigation found every configured leave type had accrual disabled
and both organization accrual logs were empty.
