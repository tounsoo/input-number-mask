import { useRef, useState, useLayoutEffect, useCallback } from 'react';
import { cleanInput, formatWithMask, isMatchWithMask, calculateMaskState } from '../utils/maskUtils';

export interface UseContentEditableMaskProps {
    template: string;
    placeholder?: string;
    keepPosition?: boolean;
    onValueChange?: (value: string) => void;
    value?: string;
}

export interface UseContentEditableMaskReturn {
    ref: React.RefObject<HTMLDivElement | null>;
    value: string;
    displayValue: string;
    rawValue: string;
}

export function useContentEditableMask({
    template,
    placeholder,
    keepPosition = false,
    value: controlledValue,
    onValueChange,
}: UseContentEditableMaskProps): UseContentEditableMaskReturn {

    const [value, setValue] = useState(() => {
        if (controlledValue !== undefined) {
            const digits = cleanInput(controlledValue, template);
            return formatWithMask(digits, template, placeholder);
        }
        return formatWithMask('', template, placeholder);
    });

    const ref = useRef<HTMLDivElement>(null);
    const [cursor, setCursor] = useState<number | null>(null);

    // Sync internal state to controlled value
    const formattedControlled = controlledValue !== undefined
        ? (keepPosition && isMatchWithMask(controlledValue, template, placeholder)
            ? controlledValue
            : formatWithMask(cleanInput(controlledValue, template), template, placeholder))
        : null;

    if (formattedControlled !== null && formattedControlled !== value) {
        setValue(formattedControlled);
    }

    // Helper to get selection range indices
    const getSelectionIndices = useCallback((element: HTMLElement) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return { start: 0, end: 0 };

        const range = selection.getRangeAt(0);

        // Calculate start
        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(element);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        const start = preSelectionRange.toString().length;

        // Calculate end
        const end = start + range.toString().length;

        return { start, end };
    }, []);

    // Helper to set caret position
    const setCaretPosition = useCallback((element: HTMLElement, pos: number) => {
        const selection = window.getSelection();
        const range = document.createRange();
        if (!element.firstChild) {
            return;
        }

        let charCount = 0;
        let found = false;

        const traverse = (node: Node) => {
            if (found) return;
            if (node.nodeType === Node.TEXT_NODE) {
                const nextCharCount = charCount + (node.textContent?.length || 0);
                if (pos <= nextCharCount) {
                    range.setStart(node, pos - charCount);
                    range.collapse(true);
                    found = true;
                    return;
                }
                charCount = nextCharCount;
            } else {
                for (let i = 0; i < node.childNodes.length; i++) {
                    traverse(node.childNodes[i]);
                }
            }
        }

        traverse(element);

        if (found) {
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
    }, []);

    // Update DOM content when value changes
    useLayoutEffect(() => {
        if (ref.current && ref.current.textContent !== value) {
            ref.current.textContent = value;
        }
    }, [value]);

    useLayoutEffect(() => {
        if (ref.current && cursor !== null) {
            // Restore cursor
            setCaretPosition(ref.current, cursor);
        }
    }, [cursor, value, setCaretPosition]);


    // Using native event listeners for better control (beforeinput)
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;

        const handleBeforeInput = (e: InputEvent) => {
            if (e.inputType === 'insertText' || e.inputType === 'insertFromPaste') {
                e.preventDefault();

                const data = e.data || '';
                const { start, end } = getSelectionIndices(el);

                // ContentEditable paste with multiple chars?
                // calculateMaskState currently assumes single char special handling or standard insert.
                // Standard insert logic handles string insertion correctly.
                // keepPosition logic inside `calculateMaskState` currently checks `char.length === 1`.
                // So pasting multiple chars will fall back to standard insert, which is expected behavior usually (shift).

                const result = calculateMaskState(
                    value,
                    template,
                    placeholder,
                    start,
                    end,
                    'insert',
                    data,
                    keepPosition
                );

                if (result) {
                    setValue(result.value);
                    onValueChange?.(result.value);
                    setCursor(result.cursor);
                }
            }

            if (e.inputType.startsWith('delete')) {
                e.preventDefault();
                const { start, end } = getSelectionIndices(el);

                if (e.inputType === 'deleteContentBackward') {
                    const result = calculateMaskState(
                        value,
                        template,
                        placeholder,
                        start,
                        end,
                        'deleteBackward',
                        '',
                        keepPosition
                    );

                    if (result) {
                        setValue(result.value);
                        onValueChange?.(result.value);
                        setCursor(result.cursor);
                    }

                } else if (e.inputType === 'deleteContentForward') {
                    const result = calculateMaskState(
                        value,
                        template,
                        placeholder,
                        start,
                        end,
                        'deleteForward',
                        '',
                        keepPosition
                    );

                    if (result) {
                        setValue(result.value);
                        onValueChange?.(result.value);
                        setCursor(result.cursor);
                    }
                }
            }
        };

        const handleFocus = () => {
            // Match native input behavior: if empty (only mask), move to start
            const raw = cleanInput(value, template);
            if (raw.length === 0) {
                // Find first digit slot
                const firstSlot = template.indexOf('d');
                if (firstSlot !== -1) {
                    setCaretPosition(el, firstSlot);
                    // Update state so it persists
                    setCursor(firstSlot);
                }
            }
        };

        el.addEventListener('beforeinput', handleBeforeInput as EventListener);
        el.addEventListener('focus', handleFocus);
        return () => {
            el.removeEventListener('beforeinput', handleBeforeInput as EventListener);
            el.removeEventListener('focus', handleFocus);
        };
    }, [value, template, placeholder, keepPosition, onValueChange, getSelectionIndices, setCaretPosition]);

    const rawValue = cleanInput(value, template);

    return {
        ref,
        value,
        displayValue: value,
        rawValue
    };
}
