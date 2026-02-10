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

// --- Rich Text Document Demo ---

const RichTextDocumentDemo = () => {
    const { ref: dateRef, value: dateValue } = useContentEditableMask({
        template: 'dd/dd/dddd',
        placeholder: 'mm/dd/yyyy',
    });

    const { ref: phoneRef, value: phoneValue } = useContentEditableMask({
        template: '(ddd) ddd-dddd',
        placeholder: '(___) ___-____',
    });

    // Manual Highlight Logic Example
    useLayoutEffect(() => {
        if (typeof CSS === 'undefined' || !CSS.highlights) return;

        const styleId = 'rich-text-hook-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `::highlight(hook-placeholder) { color: #aaa; font-style: italic; }`;
            document.head.appendChild(style);
        }

        const updateHighlight = (el: HTMLElement, template: string, placeholder: string = '_') => {
            const highlight = new Highlight();
            const traverse = (node: Node, globalIdx: number): number => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent || '';
                    for (let i = 0; i < text.length; i++) {
                        const idx = globalIdx + i;
                        if (idx < template.length && template[idx] === 'd' && text[idx] === (placeholder[idx] || '_')) {
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
            return highlight;
        };

        if (dateRef.current) CSS.highlights.set('hook-placeholder-date', updateHighlight(dateRef.current, 'dd/dd/dddd', 'mm/dd/yyyy'));
        if (phoneRef.current) CSS.highlights.set('hook-placeholder-phone', updateHighlight(phoneRef.current, '(ddd) ddd-dddd', '(___) ___-____'));

        // Add style for specific highlight names
        const specificStyleId = 'specific-hook-style';
        if (!document.getElementById(specificStyleId)) {
            const style = document.createElement('style');
            style.id = specificStyleId;
            style.textContent = `
                ::highlight(hook-placeholder-date) { color: #0969da; }
                ::highlight(hook-placeholder-phone) { color: #cf222e; }
             `;
            document.head.appendChild(style);
        }
    }, [dateValue, phoneValue]);

    const inlineStyle: React.CSSProperties = {
        display: 'inline-block',
        minWidth: '120px',
        borderBottom: '1px solid #ddd',
        outline: 'none',
        fontFamily: 'monospace',
        padding: '0 4px',
        verticalAlign: 'baseline'
    };

    return (
        <div style={{
            maxWidth: '600px',
            lineHeight: '2',
            fontFamily: 'serif',
            padding: '20px',
            border: '1px solid #eee',
            borderRadius: '8px'
        }}>
            <h2>Hook Integration Example</h2>
            <p>
                Patient was admitted on <div ref={dateRef} contentEditable suppressContentEditableWarning style={inlineStyle} />
                and can be reached via telephone at <div ref={phoneRef} contentEditable suppressContentEditableWarning style={inlineStyle} />.
            </p>
            <p style={{ fontSize: '0.8em', color: '#666', borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '10px' }}>
                * This example uses <code>useContentEditableMask</code> hooks directly on two separate div elements within a single paragraph.
            </p>
        </div>
    );
};

export const RichTextIntegration: Story = {
    render: () => <RichTextDocumentDemo />,
};

// --- One Large Template Demo ---

const OneLargeTemplateDemo = () => {
    const template = "ORDER #ddddd-dd CONFIRMATION: SHIP DATE dd/dd/dddd | TRACKING dddd-dddd-dddd-dddd";
    const placeholder = "ORDER #00000-00 CONFIRMATION: SHIP DATE mm/dd/yyyy | TRACKING ____-____-____-____";

    const { ref, value } = useContentEditableMask({
        template,
        placeholder,
    });

    useLayoutEffect(() => {
        if (typeof CSS === 'undefined' || !CSS.highlights || !ref.current) return;
        const el = ref.current;
        const highlight = new Highlight();

        const traverse = (node: Node, globalIdx: number): number => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent || '';
                for (let i = 0; i < text.length; i++) {
                    const idx = globalIdx + i;
                    // Highlight the placeholder characters within the slots
                    if (idx < template.length && template[idx] === 'd' && text[i] === (placeholder[idx] || '_')) {
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
        CSS.highlights.set('large-template-highlight', highlight);

        const styleId = 'large-template-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `::highlight(large-template-highlight) { color: #cf222e; font-weight: bold; background: rgba(207, 34, 46, 0.05); }`;
            document.head.appendChild(style);
        }
        return () => { CSS.highlights.delete('large-template-highlight'); };
    }, [value, template, placeholder]);

    return (
        <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '12px', border: '1px dashed #ccc' }}>
            <h3 style={{ marginTop: 0 }}>One Large Template</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                In this example, the <strong>entire paragraph</strong> is a single mask. The text like "ORDER #", "SHIP DATE", and "TRACKING" are
                hardcoded literals in the template. You can only edit the highlighted numbers.
            </p>
            <div
                ref={ref}
                contentEditable
                suppressContentEditableWarning
                style={{
                    padding: '16px',
                    fontSize: '18px',
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    lineHeight: '1.5',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}
            />
        </div>
    );
};

export const OneLargeTemplate: Story = {
    render: () => <OneLargeTemplateDemo />,
};
