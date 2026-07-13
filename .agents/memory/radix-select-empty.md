---
name: Radix SelectItem empty value
description: Radix UI Select crashes when any SelectItem has value=""; use a sentinel string instead
---

**Rule:** Never pass `value=""` to a Radix UI `<SelectItem>`. It causes a runtime crash/warning. Use a sentinel like `"__none__"` and convert it back to `null`/`""` in the `onValueChange` handler.

**Why:** Radix UI treats `value=""` as unset/uncontrolled internally, which conflicts with controlled Select state.

**How to apply:** Any optional Select where "no selection" is a valid state — e.g. payment terms, source, owner — use `"__none__"` as the sentinel value and convert: `onValueChange={(v) => setField(v === "__none__" ? "" : v)}`.
