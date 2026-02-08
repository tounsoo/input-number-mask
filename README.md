# @tounsoo/input-number-mask

[![npm version](https://img.shields.io/npm/v/@tounsoo/input-number-mask)](https://www.npmjs.com/package/@tounsoo/input-number-mask)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@tounsoo/input-number-mask)](https://bundlephobia.com/package/@tounsoo/input-number-mask)
[![license](https://img.shields.io/npm/l/@tounsoo/input-number-mask)](https://github.com/tounsoo/input-number-mask/blob/main/LICENSE)

A lightweight, dependency-free React hook for masking input values. Perfect for phone numbers, dates, credit cards, and more.

## Features

- 0️⃣ **Template-based masking** (e.g., `(ddd) ddd-dddd`)
- ⌨️ **Intuitive typing & deletion**
- 📍 **`keepPosition` option** to maintain cursor position and placeholder structure on deletion
- 🧩 **Headless UI** - completely unstyled, brings your own inputs
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

### Basic Example

```tsx
import { useInputNumberMask } from '@tounsoo/input-number-mask';

const PhoneInput = () => {
  const mask = useInputNumberMask({
    template: '(ddd) ddd-dddd',
    placeholder: '(___) ___-____'
  });

  return (
    <input {...mask} type="tel" />
  );
};
```

### Using with `<form>` (Submitting Raw Values)

The hook exposes the `rawValue` (unmasked) which you can include in your form submission using a hidden input.

```tsx
import { useInputNumberMask } from '@tounsoo/input-number-mask';

export const MyForm = () => {
    // 1. Initialise the mask
    const phoneMask = useInputNumberMask({
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Access the raw value from the hidden input
        console.log('Phone (Raw):', formData.get('phone_raw')); 
        // Output: "1234567890"

        // Access the formatted value if needed
        console.log('Phone (Formatted):', formData.get('phone_display')); 
        // Output: "(123) 456-7890"
    };

    return (
        <form onSubmit={handleSubmit}>
            <label htmlFor="phone">Phone Number</label>
            {/* The visible input handles the mask interaction */}
            <input 
                {...phoneMask} 
                name="phone_display" 
                id="phone" 
                required 
            />
            
            {/* Hidden input to submit the clean value */}
            <input 
                type="hidden" 
                name="phone_raw" 
                value={phoneMask.rawValue} 
            />
            
            <button type="submit">Submit</button>
        </form>
    );
};
```

### Options

| Option | Type | Default | Description |
|Template|`string`|Required|The mask pattern. `d` represents a digit.|
|Placeholder|`string`|Required| The display string when input is empty or partial.|
|keepPosition|`boolean`|`false`| If true, deleting a character replaces it with the placeholder char instead of shifting subsequent characters.|

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
