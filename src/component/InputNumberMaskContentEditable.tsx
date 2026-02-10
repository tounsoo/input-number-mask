import React, { forwardRef, useEffect, useLayoutEffect, useState } from 'react';
import { useContentEditableMask } from '../hook/useContentEditableMask';
import { cleanInput, formatWithMask } from '../utils/maskUtils';
import tokens from './styles.json';

// Hoisted: static base styles computed once at module level
const t = tokens.input;
const baseStyles = `
    .input-number-mask-content-editable {
        font-family: ${t.fontFamily.$value};
        padding: ${t.padding.block.$value} ${t.padding.inline.$value};
        border: ${t.border.width.$value} ${t.border.style.$value} ${t.border.color.$value};
        border-radius: ${t.border.radius.$value};
        outline: none;
        cursor: text;
        display: ${t.contentEditable.display.$value};
        white-space: ${t.contentEditable.whiteSpace.$value};
        min-width: ${t.contentEditable.minWidth.$value};
    }
    .input-number-mask-content-editable:focus {
        border-color: ${t.focus.borderColor.$value};
        box-shadow: 0 0 0 ${t.focus.ringWidth.$value} ${t.focus.ringColor.$value};
    }
`;

export interface InputNumberMaskContentEditableProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
    /**
     * The mask template. 'd' represents a digit slot.
     * All other characters are treated as literals.
     * @example "+1 (ddd) ddd-dddd" for US phone numbers
     */
    template: string;

    /**
     * Optional full-length placeholder shown in empty slots.
     * Should match the template length.
     * @example "mm/dd/yyyy" for a date mask
     */
    placeholder?: string;

    /**
     * If true, deletion replaces with placeholder char
     * instead of shifting subsequent digits left.
     * @default false
     */
    keepPosition?: boolean;

    /**
     * If true, the `onValueChange` callback will receive the raw unmasked value.
     * If false, it receives the formatted value.
     * @default false
     */
    returnRawValue?: boolean;

    /**
     * Initial value for uncontrolled usage.
     */
    defaultValue?: string;

    /**
     * Controlled value.
     */
    value?: string;

    /**
     * Callback with the input value.
     */
    onValueChange?: (value: string) => void;

    /**
     * Color for the placeholder characters.
     * Uses CSS Highlight API.
     * @example "gray" or "#ccc"
     */
    placeholderColor?: string;

    /**
     * Name for the hidden input field.
     */
    name?: string;
}

export const InputNumberMaskContentEditable = forwardRef<HTMLDivElement, InputNumberMaskContentEditableProps>(
    ({
        template,
        placeholder,
        keepPosition,
        returnRawValue = false,
        onValueChange,
        value: controlledValue,
        defaultValue,
        placeholderColor,
        style,
        name,
        ...props
    }, ref) => {

        // Determine if we're in controlled mode
        const isControlled = controlledValue !== undefined;

        // Internal state for uncontrolled mode
        const [internalValue, setInternalValue] = useState(() => {
            if (defaultValue !== undefined) {
                const digits = cleanInput(defaultValue, template);
                return formatWithMask(digits, template, placeholder);
            }
            return formatWithMask('', template, placeholder);
        });

        // The value to pass to the hook - controlled or internal
        const valueForHook = isControlled ? controlledValue : internalValue;

        // Re-format internal value if template/placeholder changes (dynamic templates)
        useEffect(() => {
            if (!isControlled) {
                setInternalValue(prev => {
                    const digits = cleanInput(prev, template);
                    return formatWithMask(digits, template, placeholder);
                });
            }
        }, [template, placeholder, isControlled]);

        const { ref: maskRef, value: maskValue, rawValue: hookRawValue } = useContentEditableMask({
            template,
            placeholder,
            keepPosition,
            value: valueForHook,
            onValueChange: (val) => {
                // Update internal state for uncontrolled mode
                if (!isControlled) {
                    setInternalValue(val);
                }
                const raw = cleanInput(val, template);
                onValueChange?.(returnRawValue ? raw : val);
            }
        });

        // Sync external ref if provided
        useEffect(() => {
            if (typeof ref === 'function') {
                ref(maskRef.current);
            } else if (ref) {
                ref.current = maskRef.current;
            }
        }, [maskRef, ref]);

        // Unique ID for Highlight API (stable per instance)
        const [uniqueId] = useState(() => Math.random().toString(36).substr(2, 9));
        const highlightName = `placeholder-highlight-${uniqueId}`;

        // Inject ::highlight() style into document.head for CSS Highlight API compatibility
        useLayoutEffect(() => {
            if (typeof CSS === 'undefined' || !CSS.highlights) return;

            const styleId = `style-${highlightName}`;
            let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = styleId;
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = `
                ::highlight(${highlightName}) {
                    color: ${placeholderColor || '#999'};
                }
            `;

            return () => {
                document.getElementById(styleId)?.remove();
            };
        }, [highlightName, placeholderColor]);

        // Highlight API logic - Populate ranges
        useLayoutEffect(() => {
            if (typeof CSS === 'undefined' || !CSS.highlights) return;

            const el = maskRef.current;
            if (!el || !el.firstChild) {
                // If empty, clean up highlight
                if (CSS.highlights.has(highlightName)) {
                    CSS.highlights.delete(highlightName);
                }
                return;
            }

            const ranges: Range[] = [];

            // Traverse text nodes and highlight placeholder characters
            let globalIndex = 0;

            const traverseAndHighlight = (node: Node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent || '';

                    for (let i = 0; i < text.length; i++) {
                        if (globalIndex >= template.length) break;

                        const char = text[i];
                        const tChar = template[globalIndex];
                        const isDigitSlot = tChar === 'd';
                        const pChar = placeholder && globalIndex < placeholder.length ? placeholder[globalIndex] : '_';

                        if (isDigitSlot && char === pChar) {
                            const range = new Range();
                            range.setStart(node, i);
                            range.setEnd(node, i + 1);
                            ranges.push(range);
                        }
                        globalIndex++;
                    }
                } else {
                    for (let i = 0; i < node.childNodes.length; i++) {
                        traverseAndHighlight(node.childNodes[i]);
                    }
                }
            };

            traverseAndHighlight(el);

            const highlight = new Highlight(...ranges);
            CSS.highlights.set(highlightName, highlight);

            return () => {
                if (CSS.highlights && CSS.highlights.has(highlightName)) {
                    CSS.highlights.delete(highlightName);
                }
            };

        }, [maskValue, template, placeholder, maskRef, highlightName, placeholderColor]);

        const finalValue = returnRawValue ? hookRawValue : maskValue;

        return (
            <>
                <style>{baseStyles}</style>
                <div
                    role="textbox"
                    contentEditable
                    tabIndex={0}
                    suppressContentEditableWarning
                    className={`input-number-mask-content-editable ${props.className || ''}`}
                    style={style}
                    {...props}
                    ref={maskRef}
                />
                <input type="hidden" name={name} value={finalValue} />
            </>
        );
    }
);

InputNumberMaskContentEditable.displayName = 'InputNumberMaskContentEditable';
