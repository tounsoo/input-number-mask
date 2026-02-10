# @tounsoo/input-number-mask

[![npm version](https://img.shields.io/npm/v/@tounsoo/input-number-mask)](https://www.npmjs.com/package/@tounsoo/input-number-mask)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@tounsoo/input-number-mask)](https://bundlephobia.com/package/@tounsoo/input-number-mask)
[![license](https://img.shields.io/npm/l/@tounsoo/input-number-mask)](https://github.com/tounsoo/input-number-mask/blob/main/LICENSE)

A lightweight, dependency-free React library for masking input values. Supports both standard input elements and `contenteditable` containers.

## Features

- 0️⃣ **Template-based masking** (e.g., `(ddd) ddd-dddd`)
- 🏗️ **Dual Implementation** - High-level components and low-level hooks
- ✍️ **`contenteditable` Support** - Native support for rich-text environments
- 🎨 **Highlight API** - Custom placeholder coloring via `placeholderColor`
- 📍 **`keepPosition` option** - Maintains cursor position and structure on deletion
- 📦 **Zero dependencies** - Lightweight and fast
- 🧪 **Fully tested**

## Installation

```bash
pnpm add @tounsoo/input-number-mask
# or
npm install @tounsoo/input-number-mask
```

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
const { ref, value } = useInputNumberMask({ template: '(ddd) ddd-dddd' });
return <input ref={ref} value={value} onChange={() => {}} />;
```

#### `useContentEditableMask` (for `<div>`)
```tsx
const { ref, value } = useContentEditableMask({ template: 'dd/dd/dddd' });
return <div ref={ref} contentEditable suppressContentEditableWarning />;
```

## Form Submission

Use `returnRawValue` to automatically submit unmasked digits via a hidden field:

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

## API Reference

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `template` | `string` | Required | The mask pattern. `d` represents a digit slot. |
| `placeholder` | `string` | `undefined` | Display string for empty slots. |
| `keepPosition` | `boolean` | `false` | If true, deletion replaces with placeholder instead of shifting. |
| `placeholderColor` | `string` | `undefined` | (ContentEditable only) Color for placeholder characters. |
| `returnRawValue` | `boolean` | `false` | If true, `onValueChange` and forms receive raw digits. |
| `onValueChange` | `(val: string) => void` | `undefined` | Callback for value updates. |

### Hook Return Values

| Value | Type | Description |
|-------|------|-------------|
| `ref` | `RefObject` | Attach to your input/div element. |
| `value` | `string` | The formatted display value. |
| `rawValue` | `string` | The unmasked raw digits. |

## Contributing

```bash
pnpm install
pnpm storybook # Explore all features and examples
pnpm test      # Run full test suite
```

## License

MIT
