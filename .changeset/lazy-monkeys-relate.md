---
"@tounsoo/input-number-mask": minor
---

### New Features

- **InputNumberMask**: Added `returnRawValue` prop. When true, renders a hidden input with the unmasked value. This is useful for form submissions where the raw number is needed.

### Improvements

- **useInputNumberMask**: Enhanced cursor positioning logic to be more reliable when typing or deleting.
- **InputNumberMask**: Fixed ref forwarding to ensure it works correctly with both function and object refs.

### Internal

- **Refactor**: Reorganized test files into `__tests__` directories for better project structure.
- **Cleanup**: Removed redundant and legacy test files.
