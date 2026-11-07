---
"@tounsoo/input-number-mask": patch
---

Fix templates whose literals include digits, like `+1 (ddd)`. With the caret before the country code, typing 2 then 3 gave `+1 (231)` because the template's own `1` was read as a typed digit. Edits now go into the digit slots directly, in both components, for typing, deleting and digit-only paste.
