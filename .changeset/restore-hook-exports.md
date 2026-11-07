---
"@tounsoo/input-number-mask": patch
---

Export `useInputNumberMask` and `useContentEditableMask` from the package again, with their prop and return types. 1.2.0 dropped the `useInputNumberMask` export that 1.1.1 had, and never exported `useContentEditableMask`, although its changelog, the README and the Storybook docs all show importing both.
