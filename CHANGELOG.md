# @tounsoo/input-number-mask

## 1.3.0

### Minor Changes

- cf84da2: Opt-in `showMaskWhenEmpty={false}` on both components and both hooks: the field stays empty until the first digit, and `placeholder` becomes the native placeholder (`aria-placeholder` on the contenteditable), so `required`, `:placeholder-shown` and screen readers see an empty field. The default is unchanged.

  Also:

  - A `ref` passed to either component is set on mount and cleared on unmount, and a callback ref's cleanup runs.
  - The base `<style>` is rendered once per page through React 19's style hoisting, not once per input.
  - The built entries start with `"use client"`, so they can be imported from React Server Components.
  - A `className` passed to the contenteditable component no longer replaces the base class, and no class ends in a stray space.
  - The caret is only restored in the focused field, so a controlled update can't move focus in Safari.
  - A pending caret restore is cancelled when the input unmounts.

- 3667fb1: Both components now default to `inputMode="numeric"`, so mobile browsers show the number keypad. Pass your own `inputMode` (for example `"tel"` for phone masks) to override it.

### Patch Changes

- 0c4e52a: Docs for 1.3.0: README and Storybook cover empty fields (`showMaskWhenEmpty`), the numeric keypad default and autofill hints (and why not to use `type="number"`), IME and full-width digits, form libraries, styling, and every component prop including `value`, `defaultValue` and `inputMode`. The package description now says "component and hooks", and the feature list matches what the package does and how it's tested.
- e138ab7: Full-width digits from Korean, Japanese and Chinese IMEs (such as `１２３`) are now kept instead of dropped, in typed, pasted and controlled values. While an IME is composing, both components leave the text alone and apply the mask once the composition is committed, including when the IME replaced text before the caret. Keys during a composition are no longer intercepted.
- 375108a: Fix templates whose literals include digits, like `+1 (ddd)`. With the caret before the country code, typing 2 then 3 gave `+1 (231)` because the template's own `1` was read as a typed digit. Edits now go into the digit slots directly in both components, and a pasted `15551234567` still drops the repeated country code.

## 1.2.1

### Patch Changes

- 4f11b6f: - **InputNumberMaskContentEditable / useContentEditableMask**: Fixed paste. Browsers leave `data` empty on a contenteditable paste and put the text in `dataTransfer`, so pasting inserted nothing. The pasted text is now read from `dataTransfer` when `data` is empty.
- 6ff0dea: Export `useInputNumberMask` and `useContentEditableMask` from the package again, with their prop and return types. 1.2.0 dropped the `useInputNumberMask` export that 1.1.1 had, and never exported `useContentEditableMask`, although its changelog, the README and the Storybook docs all show importing both.
- fe554e7: Ship TypeScript declarations again. 1.2.0 was published without any `.d.ts` files, because the library build cleared tsc's output before packing. The package now includes bundled `dist/index.d.ts` for `import` and `dist/index.d.cts` for `require`, and both CI and the publish step now check the packed output with publint, arethetypeswrong and an export check, so the types can't go missing again.

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
