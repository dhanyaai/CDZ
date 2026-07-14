---
name: Radix Select in scrollable dialogs
description: SelectContent inside dialogs with overflow-y-auto mispositions; fix with position="popper"
---

## Rule
Any `<SelectContent>` rendered inside a `<DialogContent>` or `<SheetContent>` that has `overflow-y-auto` / `max-h-*` must include `position="popper"`.

**Why:** Radix UI's default `"item-aligned"` positioning calculates the dropdown position relative to the document, not the viewport. When the parent is a scrollable container, the portal-rendered dropdown appears at the wrong y-coordinate (typically at the very top of the screen, overlapping the nav), not below the trigger.

**How to apply:** Add `position="popper"` and optionally `className="max-h-60"` to cap the list height. All four scrollable dialogs in this project now have this fix: quotes.tsx (client select, payment terms, line-item product select), leads.tsx (client, owner, source selects), assembly.tsx (SO select), shipments.tsx (SO and courier selects).

## Verification
The bug is visible in both the real browser (dropdown at top of screen) and Playwright (reports "element outside of viewport"). The fix makes the dropdown open anchored directly below the trigger.
