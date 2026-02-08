---
"@tounsoo/input-number-mask": minor
---

Reorganize folder structure, add component, and enhance hook with controlled mode

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
