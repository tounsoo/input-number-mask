import type { Meta, StoryObj } from '@storybook/react-vite';
import { useInputNumberMask, type UseInputNumberMaskProps } from '../hook/useInputNumberMask';
import { useState } from 'react';

// Wrapper component to demonstrate hook usage
const HookDemo = (props: UseInputNumberMaskProps & { label?: string }) => {
    const { label = 'Input', ...hookProps } = props;
    const { ref, value, rawValue } = useInputNumberMask(hookProps);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="hook-demo-input" style={{ fontWeight: 'bold' }}>
                {label}
            </label>
            <input
                id="hook-demo-input"
                ref={ref}
                value={value}
                onChange={() => { }} // Hook handles input via ref
                style={{
                    padding: '8px 12px',
                    fontSize: '16px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    width: '300px',
                }}
            />
            <div style={{ fontSize: '12px', color: '#666' }}>
                <strong>Display Value:</strong> {value}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
                <strong>Raw Value:</strong> {rawValue}
            </div>
        </div>
    );
};

const meta: Meta<typeof HookDemo> = {
    title: 'Hook/useInputNumberMask',
    component: HookDemo,
    parameters: {
        docs: {
            description: {
                component: `
The \`useInputNumberMask\` hook provides low-level access to input masking functionality.
It returns a ref, display value, and raw value that you can use with your own input element.

**Note:** The hook is designed for controlled inputs. You must use \`value={mask.value}\` on your input element.

## Basic Usage
\`\`\`tsx
import { useInputNumberMask } from 'input-number-mask';

function MyComponent() {
    const mask = useInputNumberMask({
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
    });

    return (
        <input
            ref={mask.ref}
            value={mask.value}
            onChange={() => {}} // Required for React controlled inputs
        />
    );
}
\`\`\`

## With External State Management
\`\`\`tsx
const [value, setValue] = useState('');
const mask = useInputNumberMask({
    template: '(ddd) ddd-dddd',
    value,                    // Sync to parent state
    onValueChange: setValue,  // Update parent on changes
});
\`\`\`

## Return Values
- \`ref\`: Attach to your input element
- \`value\`: The formatted display value (e.g., "(123) 456-7890")
- \`rawValue\`: The unmasked digits only (e.g., "1234567890")
                `,
            },
        },
    },
    argTypes: {
        template: {
            control: 'text',
            description: 'The mask template. "d" represents a digit slot.',
        },
        placeholder: {
            control: 'text',
            description: 'Optional placeholder shown in empty slots.',
        },
        keepPosition: {
            control: 'boolean',
            description: 'If true, deletion replaces with placeholder instead of shifting.',
        },
        value: {
            control: 'text',
            description: 'Controlled value.',
        },
    },
};

export default meta;
type Story = StoryObj<typeof HookDemo>;

// --- Basic Examples ---

export const PhoneNumber: Story = {
    args: {
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
        label: 'Phone Number',
    },
};

export const DateInput: Story = {
    args: {
        template: 'dd/dd/dddd',
        placeholder: 'mm/dd/yyyy',
        label: 'Date (MM/DD/YYYY)',
    },
};

export const CreditCard: Story = {
    args: {
        template: 'dddd dddd dddd dddd',
        placeholder: '•••• •••• •••• ••••',
        label: 'Credit Card',
    },
};

export const SSN: Story = {
    args: {
        template: 'ddd-dd-dddd',
        placeholder: '___-__-____',
        label: 'Social Security Number',
    },
};

// --- Feature Demonstrations ---

export const WithInitialValue: Story = {
    args: {
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
        value: '1234567890',
        label: 'Pre-filled Phone',
    },
};

export const KeepPositionMode: Story = {
    args: {
        template: 'dd/dd/dddd',
        placeholder: 'mm/dd/yyyy',
        keepPosition: true,
        value: '12122024',
        label: 'Date with Keep Position',
    },
    parameters: {
        docs: {
            description: {
                story: 'When `keepPosition` is true, deleting a digit replaces it with the placeholder character instead of shifting subsequent digits left.',
            },
        },
    },
};

// --- External State Management Example ---

const ExternalStateDemo = () => {
    const [value, setValue] = useState('');
    const { ref, value: maskValue, rawValue } = useInputNumberMask({
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
        value,
        onValueChange: setValue,
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <label htmlFor="external-state-input" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                    Phone Input with External State
                </label>
                <input
                    id="external-state-input"
                    ref={ref}
                    value={maskValue}
                    onChange={() => { }}
                    style={{
                        padding: '8px 12px',
                        fontSize: '16px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        width: '300px',
                    }}
                />
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
                <strong>Parent State:</strong> {value}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
                <strong>Display Value:</strong> {maskValue}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
                <strong>Raw Value:</strong> {rawValue}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setValue('')}>Clear</button>
                <button onClick={() => setValue('5551234567')}>Set to (555) 123-4567</button>
            </div>
        </div>
    );
};

export const WithExternalState: Story = {
    render: () => <ExternalStateDemo />,
    parameters: {
        docs: {
            description: {
                story: 'Demonstrates using the hook with external state management. The parent component controls the value via the `value` and `onValueChange` props.',
            },
        },
    },
};

// --- Custom Styling Example ---

const CustomStyledDemo = () => {
    const { ref, value, rawValue } = useInputNumberMask({
        template: 'dddd-dddd-dddd-dddd',
        placeholder: '____-____-____-____',
    });

    return (
        <div style={{
            padding: '24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
        }}>
            <label
                htmlFor="styled-input"
                style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: 'white',
                    fontWeight: 'bold',
                }}
            >
                Card Number
            </label>
            <input
                id="styled-input"
                ref={ref}
                value={value}
                onChange={() => { }}
                placeholder="Enter card number"
                style={{
                    padding: '16px 20px',
                    fontSize: '18px',
                    border: 'none',
                    borderRadius: '8px',
                    width: '350px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    letterSpacing: '2px',
                    fontFamily: 'monospace',
                }}
            />
            <div style={{ marginTop: '12px', color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                Raw: {rawValue || '(empty)'}
            </div>
        </div>
    );
};

export const CustomStyling: Story = {
    render: () => <CustomStyledDemo />,
    parameters: {
        docs: {
            description: {
                story: 'The hook gives you complete control over styling since you provide your own input element.',
            },
        },
    },
};

// --- With onValueChange Callback ---

const CallbackDemo = () => {
    const [logs, setLogs] = useState<string[]>([]);

    const { ref, value } = useInputNumberMask({
        template: 'dd:dd',
        placeholder: '--:--',
        onValueChange: (val) => {
            setLogs(prev => [...prev.slice(-4), `Value changed: "${val}"`]);
        },
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <label htmlFor="callback-input" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                    Time Input (with callback logging)
                </label>
                <input
                    id="callback-input"
                    ref={ref}
                    value={value}
                    onChange={() => { }}
                    style={{
                        padding: '8px 12px',
                        fontSize: '16px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        width: '100px',
                    }}
                />
            </div>
            <div style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                background: '#f5f5f5',
                padding: '12px',
                borderRadius: '4px',
                minHeight: '80px',
            }}>
                <strong>Callback Log:</strong>
                {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                ))}
            </div>
        </div>
    );
};

export const OnValueChangeCallback: Story = {
    render: () => <CallbackDemo />,
    parameters: {
        docs: {
            description: {
                story: 'The `onValueChange` callback is called whenever the user modifies the input value.',
            },
        },
    },
};
