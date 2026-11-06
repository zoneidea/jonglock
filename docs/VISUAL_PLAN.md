# Visual Plan in booth selection

The "แผนผังเสมือน" button appears when an active published layout references the
selected booth plan. The native map supports scroll/zoom and uses the editor's
positions and decorative objects. Tap an available booth to open the existing
booth detail sheet; booking/hold/payment behavior is unchanged.

Colors reflect selected dates and temporary locks through the existing effective
booth list. Booked/unavailable/unmatched booths are disabled. Unpositioned booths
remain in the normal list. Missing map/network failure retains the image preview
and original list. Pull-to-refresh reloads metadata.

API: GET `/public/markets/:marketId/floor-plans/:floorPlanId/visual-plan`, standard
response envelope, data null if absent. Contract: backend/docs/MOBILE_VISUAL_PLAN.md.
Only published referenced layouts of system-collection markets are public. Legacy
layouts without references must be recreated correctly in management and published.
No native dependency or iOS/Android build introduced.
