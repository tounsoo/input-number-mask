# @tounsoo/input-number-mask

[![npm version](https://img.shields.io/npm/v/@tounsoo/input-number-mask)](https://www.npmjs.com/package/@tounsoo/input-number-mask)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@tounsoo/input-number-mask)](https://bundlephobia.com/package/@tounsoo/input-number-mask)
[![license](https://img.shields.io/npm/l/@tounsoo/input-number-mask)](https://github.com/tounsoo/input-number-mask/blob/main/LICENSE)

A lightweight, dependency-free React hook and component for masking input values. Perfect for phone numbers, dates, credit cards, and more.

## Features

- 0️⃣ **Template-based masking** (e.g., `(ddd) ddd-dddd`)
- ⌨️ **Intuitive typing & deletion**
- 📍 **`keepPosition` option** to maintain cursor position and placeholder structure on deletion
- 🧩 **Headless UI** - completely unstyled, bring your own inputs
- 🎛️ **Controlled & Uncontrolled** - supports both patterns
- 📦 **Zero dependencies** (peer dependency on React)
- 🧪 **Fully tested**

## Installation

```bash
pnpm add @tounsoo/input-number-mask
# or
npm install @tounsoo/input-number-mask
# or
yarn add @tounsoo/input-number-mask
```

## Usage

### Component (Recommended)

The `InputNumberMask` component is the easiest way to use input masking:

```tsx
import { InputNumberMask } from '@tounsoo/input-number-mask';

// Uncontrolled
<InputNumberMask
  template="(ddd) ddd-dddd"
  placeholder="(___) ___-____"
  defaultValue="1234567890"
  onValueChange={(val) => console.log(val)}
/>

// Controlled
const [value, setValue] = useState('');
<InputNumberMask
  template="(ddd) ddd-dddd"
  placeholder="(___) ___-____"
  value={value}
  onValueChange={setValue}
/>

### ContentEditable Component

For scenarios requiring `contentEditable` behavior (e.g. rich text integration or custom cursor handling):

```tsx
import { InputNumberMaskContentEditable } from '@tounsoo/input-number-mask';

<InputNumberMaskContentEditable
  template="(ddd) ddd-dddd"
  placeholder="(___) ___-____"
  placeholderColor="GrayText" 
  onValueChange={setValue}
/>
```

### Hook (For Custom Implementations)

Use the hook directly when you need full control over your input element:

```tsx
import { useInputNumberMask } from '@tounsoo/input-number-mask';

const PhoneInput = () => {
  const mask = useInputNumberMask({
    template: '(ddd) ddd-dddd',
    placeholder: '(___) ___-____',
  });

  return (
    <input
      ref={mask.ref}
      value={mask.value}
      onChange={() => {}} // Required for React controlled inputs
      type="tel"
    />
  );
};
```

### Form Submission

#### Using Component with `returnRawValue`

The component supports automatic raw value submission via hidden input:

```tsx
import { InputNumberMask } from '@tounsoo/input-number-mask';

export const MyForm = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // With returnRawValue=true, the hidden input submits raw digits
    console.log('Phone:', formData.get('phone')); 
    // Output: "1234567890"
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="phone">Phone Number</label>
      <InputNumberMask
        template="(ddd) ddd-dddd"
        placeholder="(___) ___-____"
        name="phone"
        id="phone"
        returnRawValue={true}
        required
      />
      <button type="submit">Submit</button>
    </form>
  );
};
```

#### Using Hook with Hidden Input

```tsx
import { useInputNumberMask } from '@tounsoo/input-number-mask';

export const MyForm = () => {
  const phoneMask = useInputNumberMask({
    template: '(ddd) ddd-dddd',
    placeholder: '(___) ___-____',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    console.log('Phone:', formData.get('phone')); // "1234567890"
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="phone">Phone Number</label>
      <input
        ref={phoneMask.ref}
        value={phoneMask.value}
        onChange={() => {}}
        id="phone"
        required
      />
      <input type="hidden" name="phone" value={phoneMask.rawValue} />
      <button type="submit">Submit</button>
    </form>
  );
};
```

## API

### `InputNumberMask` Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `template` | `string` | Required | The mask pattern. `d` represents a digit slot. |
| `placeholder` | `string` | `undefined` | The display string for empty slots. |
| `keepPosition` | `boolean` | `false` | If true, deletion replaces with placeholder char instead of shifting. |
| `value` | `string` | `undefined` | Controlled value. |
| `defaultValue` | `string` | `undefined` | Initial value for uncontrolled usage. |
| `onValueChange` | `(value: string) => void` | `undefined` | Called when the value changes. |
| `returnRawValue` | `boolean` | `false` | If true, `onValueChange` receives raw digits and a hidden input is used for form submission. |

### `useInputNumberMask` Hook Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `template` | `string` | Required | The mask pattern. `d` represents a digit slot. |
| `placeholder` | `string` | `undefined` | The display string for empty slots. |
| `keepPosition` | `boolean` | `false` | If true, deletion replaces with placeholder char instead of shifting. |
| `value` | `string` | `undefined` | Controlled value. |
| `onValueChange` | `(value: string) => void` | `undefined` | Called when the value changes. |

### Hook Return Values

| Property | Type | Description |
|----------|------|-------------|
| `ref` | `RefObject<HTMLInputElement>` | Attach to your input element. |
| `value` | `string` | The formatted display value (e.g., "(123) 456-7890"). |
| `rawValue` | `string` | The unmasked digits only (e.g., "1234567890"). |

## Contributing

### Development

To start the development server with Storybook:

```bash
pnpm install
pnpm storybook
```

### Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

**When making changes:**

1. Make your code changes
2. Create a changeset:
   ```bash
   pnpm changeset
   ```
3. Follow the prompts to describe your changes and select the version bump type (patch/minor/major)
4. Commit the changeset file along with your changes
5. Push to main

**Publishing flow:**

- When changesets are merged to main, a "Version Packages" PR is automatically created
- Merging the Version Packages PR will automatically publish to npm

## License

MIT
