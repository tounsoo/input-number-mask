---
"@tounsoo/input-number-mask": minor
---

Opt-in `showMaskWhenEmpty={false}` on both components and both hooks: the field stays empty until the first digit, and `placeholder` becomes the native placeholder (`aria-placeholder` on the contenteditable), so `required`, `:placeholder-shown` and screen readers see an empty field. The default is unchanged.

Also:
- A `ref` passed to either component is set on mount and cleared on unmount, and a callback ref's cleanup runs.
- The base `<style>` is rendered once per page through React 19's style hoisting, not once per input.
- The built entries start with `"use client"`, so they can be imported from React Server Components.
- A `className` passed to the contenteditable component no longer replaces the base class, and no class ends in a stray space.
- The caret is only restored in the focused field, so a controlled update can't move focus in Safari.
- A pending caret restore is cancelled when the input unmounts.
