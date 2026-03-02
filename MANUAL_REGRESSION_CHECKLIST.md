# Health Tracker Manual Regression Checklist

Run this checklist after frontend changes. No Node.js is required.

## 1. Dashboard (`index.html`)
- Page loads without JS errors.
- `API` status chip appears in nav.
- Charts render for available data.
- Month navigation buttons update chart titles/data.

## 2. Diet Log (`diet.html`)
- Add meal flow works end-to-end.
- After save, meal builder table is cleared for next meal.
- Edit and duplicate actions populate form correctly.
- Delete action removes the selected row.
- Month and date filters work.

## 3. Inventory (`inventory.html`)
- Table loads and update flow saves quantity/date/notes.
- Search filters rows by item/category/expiry/status.
- Header row remains visible while searching.
- Status badges classify `out`, `expired`, and `low` regardless of case.

## 4. Recipes (`recipes.html`)
- Recipe list loads and search works.
- Search bar appears only once after reloads.
- Card navigation (next/prev/swipe) works.
- Add-to-diet-log action saves entry.

## 5. Meal Builder (`meal-builder.html`)
- Food DB loads and status text updates.
- Add/remove food rows updates macro totals.
- Generate plan validates inputs and renders output.
- Copy actions work (plan, meal data, suggestion).

## 6. Shift (`shift.html`)
- Date selection loads entry into edit card.
- Save update persists and refreshes table.
- Not-found date shows non-blocking error notification.

## 7. Offline + Sync
- Turn network off:
  - Health chip switches to `Offline`.
  - User sees offline notification.
- Perform mutating action while offline:
  - Request is queued.
  - Queue count increments in nav.
- Restore network:
  - Auto sync runs.
  - Queue count decreases to zero.

## 8. Smoke Test Page
- Open `smoke-test.html`.
- Run `Run Smoke Tests`.
- Confirm all checks pass.
