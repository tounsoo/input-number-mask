# @tounsoo/input-number-mask

## 1.2.0

### Minor Changes

- 4ed2248: ### New Features

  - Introduced `InputNumberMaskContentEditable` component and `useContentEditableMask` hook for masking support in `contenteditable` elements.
  - Added `placeholderColor` prop to allow custom styling of placeholder characters using the CSS Highlight API.

  ### Refactoring

  - Extracted core masking state logic into a shared `calculateMaskState` utility in `maskUtils.ts` to unify behavior between standard inputs and contenteditable elements.

  ### Improvements & Fixes

  - Updated `useInputNumberMask` to properly handle dependency changes and ensure `onValueChange` is called with correct values.
  - Adjusted style tokens for border-radius and padding to improve visual consistency.
  - Added JSDOM polyfill for `innerText` to support unit testing of contenteditable components.
  - Expanded documentation with examples for the new contenteditable implementation.

- 055f6bb: ### New Features

  - **InputNumberMask**: Added `returnRawValue` prop. When true, renders a hidden input with the unmasked value. This is useful for form submissions where the raw number is needed.

  ### Improvements

  - **useInputNumberMask**: Enhanced cursor positioning logic to be more reliable when typing or deleting.
  - **InputNumberMask**: Fixed ref forwarding to ensure it works correctly with both function and object refs.

  ### Internal

  - **Refactor**: Reorganized test files into `__tests__` directories for better project structure.
  - **Cleanup**: Removed redundant and legacy test files.

## 1.1.1

### Patch Changes

- 3ab80eb: Fix: keepPosition bug in useInputNumberMask where cursors were resetting incorrectly. Also fixed linting issues and updated documentation. Fixes #19

## 1.1.0

### Minor Changes

- 36f335c: Reorganize folder structure, add component, and enhance hook with controlled mode

  ### Changes

  **Folder Structure Reorganization:**

  - Move `useInputNumberMask.ts` to `src/hook/`
  - Add `src/component/` for component files
  - Move story files to `src/stories/`
  - Add barrel exports (`index.ts`) for `src/hook/` and `src/component/`
  - Update main `src/index.ts` exports

  **Hook Enhancements (`useInputNumberMask`):**

  - Add `value` prop for controlled usage
  - Add `onValueChange` callback for value change notifications
  - Add controlled value sync to ensure input reverts when parent doesn't update the prop
  - Fix cursor jumping when typing non-digit characters

  **New Component (`InputNumberMask`):**

  - Add `InputNumberMask` component that wraps the hook
  - Supports `defaultValue` for uncontrolled usage (component manages internal state)
  - Supports `value` + `onValueChange` for controlled usage
  - Supports `returnRawValue` to receive raw digits instead of formatted value
  - Includes form integration with hidden input for raw value submission

  **Stories:**

  - Consolidate individual stories (PhoneInput, DateInput, CreditCard, Form) into unified story files
  - Add `src/stories/InputNumberMask.stories.tsx` for component demos
  - Add `src/stories/useInputNumberMask.stories.tsx` for hook demos
  - Add comprehensive tests in play functions

## 1.0.9

### Patch Changes

- c630f53: Fix keepPosition bugs in useInputNumberMask

  - Fixed selection replacement: selecting placeholders and typing now correctly replaces at position without shifting
  - Fixed matching char: selecting digit+placeholder and typing same digit now advances cursor correctly
  - Fixed cursor insertion: typing at cursor position (no selection) now replaces placeholder instead of shifting

## 1.0.8

### Patch Changes

- 78010f8: ci: verify release 1.0.8 with explicit tag push step

## 1.0.7

### Patch Changes

- aa9e4d8: ci: verify final release automation with git tags and github release creation

## 1.0.6

### Patch Changes

- e85bd4e: docs: fix code block syntax and verify release

## 1.0.5

### Patch Changes

- 73c8f47: docs: fix typos and improvements in README

## 1.0.4

### Patch Changes

- 4c226c6: ci: test full release workflow automation

## 1.0.3

### Patch Changes

- 3643b12: docs: add development instructions to README

## 1.0.2

### Patch Changes

- 152e5c4: Refined Storybook documentation with a dedicated Getting Started MDX page and automated API tables using react-docgen-typescript. Removed 'any' types from all stories to improve type safety. Fixed JSDoc comments and removed typos in the useInputNumberMask hook.

## 1.0.1

### Patch Changes

- 8b3fcec: Initial release of @tounsoo/input-number-mask - A lightweight React hook for masking input values with support for phone numbers, dates, credit cards, and custom formats
