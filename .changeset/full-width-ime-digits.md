---
"@tounsoo/input-number-mask": patch
---

Full-width digits from Korean, Japanese and Chinese IMEs (such as `１２３`) are now kept instead of dropped, in typed, pasted and controlled values. While an IME is composing, both components leave the text alone and apply the mask once the composition is committed, including when the IME replaced text before the caret. Keys during a composition are no longer intercepted.
