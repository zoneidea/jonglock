# Visual Plan in booth selection

Temporarily disabled in the customer app: `FEATURES.visualPlan=false` in
`src/config/features.ts`. Only regular booths are displayed; the visual-plan
request and view toggle are disabled. Map code and backend layouts are retained.
The following behavior applies when the flag is enabled again.

The "บูธปกติ / แผนผังเสมือน" tabs appear when an active published layout references
the selected booth plan. Both views occupy the same area below the date shortcuts
and status legend. The default remains the regular booth grid. The inline map is
a native React Native View/Pressable implementation, with no WebView or map Modal.
The existing image preview is still available when a plan image exists.

The map measures its container and fits the occupied object bounds with a one-cell
margin, preserving relative positions/aspect ratio while trimming unused grid
space. Its height is bounded by the window; zoom supports 1–4x with native nested
scrolling and a "พอดีจอ" reset. Empty layouts fit their full grid. Tap an available
booth to open the existing booth detail sheet; booking/hold/payment are unchanged.

Colors reflect selected dates and temporary locks through the existing effective
booth list. Booked/unavailable/unmatched booths are disabled. Unpositioned booths
remain in the normal list. Missing map/network failure retains the image preview
and original list. Pull-to-refresh reloads metadata.

Validation: component tests cover disabled/unknown booths, fitting 240/360/768-point
containers, zoom/reset and absence of a map Modal. Screen tests cover switching
views, retaining booth data, opening the existing detail Modal without reserving,
and fallback when no published plan exists. Simulator QA confirmed the inline
published `โซนล็อค 2` map and opening B023 details from it. TypeScript and scoped
lint pass. No iOS/Android build performed.

API: GET `/public/markets/:marketId/floor-plans/:floorPlanId/visual-plan`, standard
response envelope, data null if absent. Contract: backend/docs/MOBILE_VISUAL_PLAN.md.
Only published referenced layouts of system-collection markets are public. Legacy
layouts without references must be recreated correctly in management and published.
No native dependency or iOS/Android build introduced.
