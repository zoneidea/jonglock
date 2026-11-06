# Public data recovery

The 2026-11-06 incident returned intermittent 502/timeouts from production,
including `/health`, markets and announcements. The API host's nginx error log
reported timeout **while connecting** to Apache at `https://127.0.0.1:7081`.
This is a hosting upstream availability issue, before application routing. Retry
is mitigation, not a repair of the Apache listener or hosting capacity.

`src/services/publicDataTransport.ts` applies only to read-only market discovery
(`/public/markets*`, including floor plans/availability/visual plans) and news.
Each GET has an 8-second deadline with AbortController and a timeout race; at
most three attempts with 1- and 2-second waits. Network failures and HTTP
502/503/504 retry. Other HTTP statuses retain the existing service error behavior.
After exhaustion, existing screen Alerts handle the error. No booking/payment
mutation, credential exchange or other transport is retried.

API contract is unchanged: same GET URLs/query parameters and existing
`{status, message, data}` response. No backend migration or native build required.

Regression coverage: gateway recovery, bounded failure, network recovery,
timeout/abort when fetch does not settle, no retries for client/rate-limit/500
responses, and timer cleanup. Home banner, Visual Plan and payment-client tests
also pass. Production availability must be checked separately from these tests.
