---
"@tounsoo/input-number-mask": minor
---

### New Features
- Introduced `InputNumberMaskContentEditable` component and `useContentEditableMask` hook for masking support in `contenteditable` elements.
- Added `placeholderColor` prop to allow custom styling of placeholder characters using the CSS Highlight API.

### Refactoring
- Extracted core masking state logic into a shared `calculateMaskState` utility in `maskUtils.ts` to unify behavior between standard inputs and contenteditable elements.

### Improvements & Fixes
- Updated `useInputNumberMask` to properly handle dependency changes and ensure `onValueChange` is called with correct values.
- Adjusted style tokens for border-radius and padding to improve visual consistency.
- Added JSDOM polyfill for `innerText` to support unit testing of contenteditable components.
- Expanded documentation with examples for the new contenteditable implementation.
