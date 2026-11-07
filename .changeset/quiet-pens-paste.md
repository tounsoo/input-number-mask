---
"@tounsoo/input-number-mask": patch
---

- **InputNumberMaskContentEditable / useContentEditableMask**: Fixed paste. Browsers leave `data` empty on a contenteditable paste and put the text in `dataTransfer`, so pasting inserted nothing. The pasted text is now read from `dataTransfer` when `data` is empty.
