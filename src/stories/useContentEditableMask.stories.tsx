import type { Meta, StoryObj } from '@storybook/react-vite';
import { useContentEditableMask, type UseContentEditableMaskProps } from '../hook/useContentEditableMask';
import { useState, useLayoutEffect } from 'react';

// Wrapper component to demonstrate hook usage
const HookDemo = (props: UseContentEditableMaskProps & { label?: string, placeholderColor?: string }) => {
    const { label = 'Editable Input', placeholderColor = '#999', ...hookProps } = props;
    const { ref, value, rawValue } = useContentEditableMask(hookProps);

    // Unique ID for Highlight API
    const [uniqueId] = useState(() => Math.random().toString(36).substr(2, 9));
    const highlightName = `hook-placeholder-${uniqueId}`;

    useLayoutEffect(() => {
        if (typeof CSS === 'undefined' || !CSS.highlights) return;
        const styleId = `style-${highlightName}`;
        let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = `::highlight(${highlightName}) { color: ${placeholderColor}; }`;
        return () => { document.getElementById(styleId)?.remove(); };
    }, [highlightName, placeholderColor]);

    useLayoutEffect(() => {
        if (typeof CSS === 'undefined' || !CSS.highlights || !ref.current) return;
        const el = ref.current;
        const highlight = new Highlight();

        const traverse = (node: Node, globalIdx: number): number => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent || '';
                for (let i = 0; i < text.length; i++) {
                    const idx = globalIdx + i;
                    if (idx < props.template.length && props.template[idx] === 'd' && text[i] === (props.placeholder?.[idx] || '_')) {
                        const range = new Range();
                        range.setStart(node, i);
                        range.setEnd(node, i + 1);
                        highlight.add(range);
                    }
                }
                return globalIdx + text.length;
            } else {
                let currentIdx = globalIdx;
                for (let i = 0; i < node.childNodes.length; i++) {
                    currentIdx = traverse(node.childNodes[i], currentIdx);
                }
                return currentIdx;
            }
        };

        traverse(el, 0);
        CSS.highlights.set(highlightName, highlight);
        return () => { CSS.highlights.delete(highlightName); };
    }, [value, props.template, props.placeholder, highlightName]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 'bold' }}>{label}</label>
            <div
                ref={ref}
                contentEditable
                suppressContentEditableWarning
                style={{
                    padding: '8px 12px',
                    fontSize: '16px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    width: '300px',
                    outline: 'none',
                    fontFamily: 'monospace',
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
    title: 'Hook/useContentEditableMask',
    component: HookDemo,
    parameters: {
        docs: {
            description: {
                component: `
The \`useContentEditableMask\` hook provides masking functionality specifically for \`contenteditable\` elements.
It handles cursor management, "beforeinput" events, and provides formatted/raw values.

**Note:** You must manually handle the rendering of the placeholder highlight if you want custom colors, as the hook only manages the text content and cursor.

## Basic Usage
\`\`\`tsx
import { useContentEditableMask } from 'input-number-mask';

function MyComponent() {
    const { ref, value } = useContentEditableMask({
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
    });

    return (
        <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
        />
    );
}
\`\`\`
                `,
            },
        },
    },
    argTypes: {
        template: { control: 'text' },
        placeholder: { control: 'text' },
        keepPosition: { control: 'boolean' },
        placeholderColor: { control: 'color' },
    },
};

export default meta;
type Story = StoryObj<typeof HookDemo>;

export const Default: Story = {
    args: {
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
        placeholderColor: 'green',
    },
};

export const CustomDate: Story = {
    args: {
        template: 'dd/dd/dddd',
        placeholder: 'mm/dd/yyyy',
        placeholderColor: 'blue',
    },
};
