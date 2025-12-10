---
name: TopConcepteursNavigation
overview: Reintroduce Top 10 Concepteurs filters (total, year, month, week) with navigation arrows matching chart behavior
todos:
  - id: restore-state
    content: Reintroduce view state and offsets for top clients
    status: completed
  - id: compute-filtered
    content: Compute top clients with offsets for month/week/year
    status: completed
  - id: ui-buttons-arrows
    content: Add filter buttons and nav arrows with labels
    status: completed
  - id: lint-check
    content: Run lints for DashbordPage
    status: completed
---

# Restore Top 10 Concepteurs Filters with Navigation

## Scope

- Add back filter buttons (Total, Par année, Par mois, Par semaine) to Top 10 Concepteurs
- Add left/right navigation arrows for selected filter (month/week/year), similar to chart controls
- Keep default filter = Total

## Files

- [react/src/pages/DashbordPage.tsx](react/src/pages/DashbordPage.tsx)

## Steps

- Reintroduce state for top clients view and offsets (month/week/year)
- Update computeTopClientsByView to respect offsets for month/week/year
- Add UI buttons for filters + arrows next to the active filter (month/week/year) showing current period label
- Ensure Total uses no arrows and resets offsets
- Keep lints clean