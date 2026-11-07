# @tounsoo/input-number-mask

[![npm version](https://img.shields.io/npm/v/@tounsoo/input-number-mask)](https://www.npmjs.com/package/@tounsoo/input-number-mask)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@tounsoo/input-number-mask)](https://bundlephobia.com/package/@tounsoo/input-number-mask)
[![license](https://img.shields.io/npm/l/@tounsoo/input-number-mask)](https://github.com/tounsoo/input-number-mask/blob/main/LICENSE)

React component and hooks for masking number input: phone numbers, dates, card numbers and anything else that is digits in a fixed template. Works with standard `<input>` elements and `contenteditable` containers. No dependencies besides React 19.

## Features

- 0️⃣ **Template-based masking** (e.g., `(ddd) ddd-dddd`)
- 🏗️ **Components and hooks** - Ready-made components, or hooks for your own elements
- ✍️ **`contenteditable` support** - Typing, deleting and pasting are masked inside a `contenteditable` element
- 🎨 **Highlight API** - Custom placeholder coloring via `placeholderColor`
- 📍 **`keepPosition` option** - Maintains cursor position and structure on deletion
- 📱 **Numeric keypad on phones** - `inputMode="numeric"` by default
- 🌏 **IME friendly** - Full-width digits (`１２３`) from Korean, Japanese and Chinese keyboards are kept, and the field isn't reformatted while a composition is in progress
- ⚛️ **Server Components** - The package is marked `"use client"`, so you can import it from a Server Component file
- 📦 **Zero dependencies** - Only React as a peer dependency
- 🧪 **Tested** - Unit and DOM tests in CI, and CI checks the built package's ESM, CJS and type entries

## Installation

```bash
pnpm add @tounsoo/input-number-mask
# or
npm install @tounsoo/input-number-mask
```

Requires React 19 and React DOM 19.

## Usage

### 🚀 Components (Recommended)

#### Standard Input
```tsx
import { InputNumberMask } from '@tounsoo/input-number-mask';

<InputNumberMask
  template="(ddd) ddd-dddd"
  placeholder="(___) ___-____"
  onValueChange={(val) => console.log(val)}
/>
```

#### ContentEditable Input
```tsx
import { InputNumberMaskContentEditable } from '@tounsoo/input-number-mask';

<InputNumberMaskContentEditable
  template="dd/dd/dddd"
  placeholder="mm/dd/yyyy"
  placeholderColor="blue"
  onValueChange={(val) => console.log(val)}
/>
```

### 🪝 Hooks (Advanced)

#### `useInputNumberMask` (for `<input>`)
```tsx
import { useInputNumberMask } from '@tounsoo/input-number-mask';

const { ref, value } = useInputNumberMask({ template: '(ddd) ddd-dddd' });
return <input ref={ref} value={value} onChange={() => {}} inputMode="numeric" />;
```

#### `useContentEditableMask` (for `<div>`)
```tsx
import { useContentEditableMask } from '@tounsoo/input-number-mask';

const { ref } = useContentEditableMask({ template: 'dd/dd/dddd' });
return <div ref={ref} contentEditable suppressContentEditableWarning role="textbox" inputMode="numeric" />;
```

The hook writes the masked text into the element itself, so don't render children inside it.

## Empty Fields

By default an empty field isn't empty: it shows the template's leading literals as its value (`(` for `(ddd) ddd-dddd`), or the whole `placeholder` when you pass one (`(___) ___-____`). That means native `required` validation never fails, `:placeholder-shown` never matches, screen readers read the underscores as the value, and an empty field submits that text (or `""` with `returnRawValue`).

Pass `showMaskWhenEmpty={false}` to keep the field empty until the first digit. The `placeholder` is then shown as a native placeholder (`aria-placeholder` on the `contenteditable` component), and an empty field submits `""`:

```tsx
<InputNumberMask
  template="(ddd) ddd-dddd"
  placeholder="(___) ___-____"
  showMaskWhenEmpty={false}
  required
/>
```

Once there is a digit, the full mask shows as usual. Deleting the last digit empties the field again.

## Mobile Keyboards and Autofill

Both components set `inputMode="numeric"`, so phones show the number keypad. You can override it, and add autofill hints:

```tsx
// Phone numbers: the phone keypad and phone autofill
<InputNumberMask template="(ddd) ddd-dddd" type="tel" inputMode="tel" autoComplete="tel" />

// Card numbers
<InputNumberMask template="dddd dddd dddd dddd" autoComplete="cc-number" />

// One-time codes
<InputNumberMask template="ddd ddd" autoComplete="one-time-code" />
```

Don't pass `type="number"`. The mask moves the caret with `setSelectionRange`, which browsers don't allow on number inputs, and number inputs can't hold literals like `(` or `-`.

## IME and Full-Width Digits

Korean, Japanese and Chinese keyboards can type full-width digits (`１２３`). Both components and both hooks convert them to ASCII digits, in typed, pasted and controlled values. While the keyboard is still composing, the text is left as typed; when the composition is committed, it goes through the mask as one edit.

This is covered by tests that replay the browser event order, but hasn't been checked with every IME and phone keyboard. Please open an issue if one misbehaves.

## Form Submission

Use `name` and `returnRawValue` to submit unmasked digits:

```tsx
<form onSubmit={e => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  console.log(data.get('phone')); // "1234567890"
}}>
  <InputNumberMask
    name="phone"
    template="(ddd) ddd-dddd"
    returnRawValue={true}
  />
  <button type="submit">Submit</button>
</form>
```

With `returnRawValue`, `InputNumberMask` submits the digits through a hidden input under `name`. `InputNumberMaskContentEditable` always submits through a hidden input under `name`: the formatted value, or the digits with `returnRawValue`.

### Form libraries

The components don't forward `onChange`, so `register()` from react-hook-form doesn't work with them. Use a controlled field instead, for example react-hook-form's `Controller`:

```tsx
<Controller
  name="phone"
  control={control}
  render={({ field }) => (
    <InputNumberMask
      template="(ddd) ddd-dddd"
      value={field.value}
      onValueChange={field.onChange}
      onBlur={field.onBlur}
      ref={field.ref}
    />
  )}
/>
```

## Styling

Each component adds a base class (`input-number-mask` or `input-number-mask-content-editable`) and a small stylesheet, which React renders once in `<head>` however many fields you have. A `className` you pass is added next to the base class.

## API Reference

### Component Props

Both components also accept the usual attributes of their element (`<input>` or `<div>`), except `onChange` and `onInput`. A `ref` points to the `<input>` or the `contenteditable` `<div>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `template` | `string` | Required | The mask pattern. `d` represents a digit slot; every other character is a literal. |
| `placeholder` | `string` | `undefined` | Characters shown in empty digit slots, as long as the template. Without it, the value ends at the first empty slot. |
| `value` | `string` | `undefined` | Controlled value, formatted or digits only. |
| `defaultValue` | `string` | `undefined` | Initial value for uncontrolled use. |
| `onValueChange` | `(val: string) => void` | `undefined` | Called on every change by the user, with the formatted value (or the digits with `returnRawValue`). |
| `keepPosition` | `boolean` | `false` | If true, deletion replaces with placeholder instead of shifting. |
| `returnRawValue` | `boolean` | `false` | If true, `onValueChange` and forms receive raw digits. |
| `showMaskWhenEmpty` | `boolean` | `true` | If false, an empty field stays `""` and shows `placeholder` natively. See [Empty Fields](#empty-fields). |
| `inputMode` | `string` | `"numeric"` | The virtual keyboard phones show. |
| `placeholderColor` | `string` | `undefined` | (ContentEditable only) Color for placeholder characters. |
| `name` | `string` | `undefined` | Form field name. See [Form Submission](#form-submission). |

### Hook Options

`useInputNumberMask` and `useContentEditableMask` take `template`, `placeholder`, `keepPosition`, `value`, `onValueChange` and `showMaskWhenEmpty`, as above. `onValueChange` always receives the formatted value.

### Hook Return Values

| Value | Type | Description |
|-------|------|-------------|
| `ref` | `RefObject` | Attach to your input/div element. |
| `value` | `string` | The formatted display value. |
| `rawValue` | `string` | The unmasked raw digits. |
| `displayValue` | `string` | Deprecated alias for `value`. |

## Contributing

```bash
pnpm install
pnpm storybook # Explore all features and examples
pnpm test:ci   # Unit and DOM tests (what CI runs)
pnpm test      # Also runs the Storybook stories in a browser (needs Playwright)
```

## License

MIT
