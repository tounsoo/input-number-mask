---
"input-number-mask": patch
---

Fix keepPosition bugs in useInputNumberMask

- Fixed selection replacement: selecting placeholders and typing now correctly replaces at position without shifting
- Fixed matching char: selecting digit+placeholder and typing same digit now advances cursor correctly
- Fixed cursor insertion: typing at cursor position (no selection) now replaces placeholder instead of shifting
