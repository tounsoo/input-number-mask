import type { Meta, StoryObj } from '@storybook/react';
import { InputNumberMaskContentEditable } from '../component/InputNumberMaskContentEditable';
import { useState } from 'react';

const meta: Meta<typeof InputNumberMaskContentEditable> = {
    title: 'Component/InputNumberMaskContentEditable',
    component: InputNumberMaskContentEditable,
    argTypes: {
        template: { control: 'text' },
        placeholder: { control: 'text' },
        keepPosition: { control: 'boolean' },
        returnRawValue: { control: 'boolean' },
        placeholderColor: { control: 'color' },
    },
};

export default meta;
type Story = StoryObj<typeof InputNumberMaskContentEditable>;

export const Default: Story = {
    args: {
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
        placeholderColor: 'red',
        'aria-label': 'Phone number',
    },
};

export const CustomPlaceholderColor: Story = {
    args: {
        template: 'dd/dd/dddd',
        placeholder: 'mm/dd/yyyy',
        placeholderColor: 'blue',
        'aria-label': 'Date of birth',
    },
};

export const KeepPosition: Story = {
    args: {
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
        keepPosition: true,
        placeholderColor: 'orange',
        'aria-label': 'Phone number',
    },
};

export const Controlled: Story = {
    args: {
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
        placeholderColor: 'green',
        'aria-label': 'Controlled phone number',
    },
    render: (args) => {
        const [value, setValue] = useState('');
        return (
            <div>
                <p>Value: {value}</p>
                <InputNumberMaskContentEditable
                    {...args}
                    value={value}
                    onValueChange={setValue}
                />
                <button onClick={() => setValue('(555) 555-5555')}>Set to 555</button>
            </div>
        );
    },
};

export const ControlledCustomPlaceholderColor: Story = {
    args: {
        template: 'dd/dd/dddd',
        placeholder: 'mm/dd/yyyy',
        placeholderColor: 'blue',
        'aria-label': 'Controlled date input',
    },
    render: (args) => {
        const [value, setValue] = useState('');
        return (
            <div>
                <p>Value: {value}</p>
                <InputNumberMaskContentEditable
                    {...args}
                    value={value}
                    onValueChange={setValue}
                />
                <button onClick={() => setValue('12/25/2025')}>Set to 12/25/2025</button>
            </div>
        );
    },
};

export const FormSubmission: Story = {
    render: () => {
        const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            alert(`Submitted: ${formData.get('phone')}`);
        };

        return (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label>
                    Phone:
                    <InputNumberMaskContentEditable
                        name="phone"
                        template="(ddd) ddd-dddd"
                        placeholder="(___) ___-____"
                        placeholderColor="purple"
                        returnRawValue
                        aria-label="Phone number input"
                    />
                </label>
                <button type="submit">Submit</button>
            </form>
        );
    },
};
export const RichTextDocument: Story = {
    render: () => {
        return (
            <div style={{
                maxWidth: '600px',
                margin: '40px auto',
                padding: '40px',
                backgroundColor: '#fff',
                boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                borderRadius: '12px',
                fontFamily: 'Georgia, serif',
                lineHeight: '1.8',
                color: '#333'
            }}>
                <h1 style={{ textAlign: 'center', marginBottom: '40px', fontFamily: 'system-ui' }}>Service Agreement</h1>
                <p>
                    This agreement is entered into on this day
                    <InputNumberMaskContentEditable
                        template="dd/dd/dddd"
                        placeholder="mm/dd/yyyy"
                        placeholderColor="#aaa"
                        style={{
                            display: 'inline-flex',
                            border: 'none',
                            borderBottom: '1px solid #ddd',
                            padding: '0 4px',
                            minWidth: '100px',
                            borderRadius: '0',
                            backgroundColor: 'transparent',
                            margin: '0 4px',
                            verticalAlign: 'baseline',
                            boxShadow: 'none',
                            fontFamily: 'monospace',
                            fontSize: '1em'
                        }}
                    />,
                    between the Client and the Service Provider.
                </p>
                <p>
                    The Client warrants that they can be reached at their primary contact number
                    <InputNumberMaskContentEditable
                        template="(ddd) ddd-dddd"
                        placeholder="(___) ___-____"
                        placeholderColor="#aaa"
                        style={{
                            display: 'inline-flex',
                            border: 'none',
                            borderBottom: '1px solid #ddd',
                            padding: '0 4px',
                            minWidth: '120px',
                            borderRadius: '0',
                            backgroundColor: 'transparent',
                            margin: '0 4px',
                            verticalAlign: 'baseline',
                            boxShadow: 'none',
                            fontFamily: 'monospace',
                            fontSize: '1em'
                        }}
                    />
                    for all official communications regarding this contract.
                </p>
                <p>
                    A non-refundable deposit of
                    <InputNumberMaskContentEditable
                        template="dddd.dd"
                        placeholder="0000.00"
                        placeholderColor="#aaa"
                        style={{
                            display: 'inline-flex',
                            border: 'none',
                            borderBottom: '1px solid #ddd',
                            padding: '0 4px',
                            minWidth: '80px',
                            borderRadius: '0',
                            backgroundColor: 'transparent',
                            margin: '0 4px',
                            verticalAlign: 'baseline',
                            boxShadow: 'none',
                            fontFamily: 'monospace',
                            fontSize: '1em'
                        }}
                    />
                    USD shall be paid upon signing.
                </p>
                <div style={{ marginTop: '50px', borderTop: '1px solid #eee', paddingTop: '20px', fontSize: '0.9em', color: '#666' }}>
                    * This document was generated electronically.
                </div>
            </div>
        );
    }
};
export const DynamicTemplateSwitcher: Story = {
    render: () => {
        const [type, setType] = useState<'visa' | 'amex' | 'phone'>('visa');

        const configs = {
            visa: {
                template: 'dddd dddd dddd dddd',
                placeholder: '•••• •••• •••• ••••',
                label: 'Visa / Mastercard'
            },
            amex: {
                template: 'dddd dddddd ddddd',
                placeholder: '•••• •••••• •••••',
                label: 'American Express'
            },
            phone: {
                template: '(ddd) ddd-dddd',
                placeholder: '(___) ___-____',
                label: 'US Phone Number'
            }
        };

        const config = configs[type];

        return (
            <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button
                        onClick={() => setType('visa')}
                        style={{ padding: '8px 12px', background: type === 'visa' ? '#0969da' : '#eee', color: type === 'visa' ? 'white' : 'black', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        Visa
                    </button>
                    <button
                        onClick={() => setType('amex')}
                        style={{ padding: '8px 12px', background: type === 'amex' ? '#0969da' : '#eee', color: type === 'amex' ? 'white' : 'black', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        Amex
                    </button>
                    <button
                        onClick={() => setType('phone')}
                        style={{ padding: '8px 12px', background: type === 'phone' ? '#0969da' : '#eee', color: type === 'phone' ? 'white' : 'black', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        Phone
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold' }}>{config.label}</label>
                    <InputNumberMaskContentEditable
                        template={config.template}
                        placeholder={config.placeholder}
                        placeholderColor="#0969da"
                        style={{
                            fontSize: '20px',
                            fontFamily: 'monospace',
                            letterSpacing: '2px',
                            minWidth: '350px'
                        }}
                    />
                    <p style={{ fontSize: '12px', color: '#666' }}>
                        Notice how the value stays masked even as you switch formats!
                    </p>
                </div>
            </div>
        );
    }
};
