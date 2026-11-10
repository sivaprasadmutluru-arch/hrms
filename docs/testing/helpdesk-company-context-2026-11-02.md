# Platform administrator ticket company context

Helpdesk list links and post-creation navigation retain the ticket company as a URL query parameter. The detail page sends that company header for all ticket, comment, attachment and status actions. Direct legacy URLs use the selected company or the account's login-company fallback; IDs are not guessed across tenant schemas. Backend company authorization remains in force.

The detail page uses local request state with a 20-second timeout, clears stale data on context changes, cancels obsolete reads and renders an explicit error/retry state. Auxiliary read failures are shown separately. It no longer remains indefinitely on “Loading ticket…” after a failed request. Mutation controls prevent overlapping submissions.

Browser verification with the existing platform administrator: selected All Companies, opened the existing /helpdesk/1 URL successfully, refreshed successfully, opened Helpdesk and verified View navigated to /helpdesk/1?companyId=337. Existing comments, requester identity and status loaded. A nonexistent ticket produced a not-found message with Back and Retry controls. The original company selection was restored after verification. No ticket status, comment or attachment changes were made by the agent; the user's concurrent status/comment updates were preserved. Production frontend build passed.

Proof: /private/tmp/accruehr-platform-all-companies-ticket.png.
