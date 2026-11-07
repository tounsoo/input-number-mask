import { flushSync } from 'react-dom';
import { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { cleanInput, formatWithMask, isMatchWithMask, calculateMaskState, normalizeDigits, diffComposition, applyCompositionChange, isFocused } from '../utils/maskUtils';

export interface UseContentEditableMaskProps {
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
     * Callback with the formatted value.
     * Triggered only on user interaction.
     */
    onValueChange?: (value: string) => void;
    /**
     * Controlled value. The hook will sync its internal state to this value.
     */
    value?: string;
    /**
     * If true, an empty field shows the template's literals and placeholder.
     * If false, the value and the element's text stay `""` until the first digit.
     * @default true
     */
    showMaskWhenEmpty?: boolean;
}

export interface UseContentEditableMaskReturn {
    /** Ref to attach to the contenteditable element */
    ref: React.RefObject<HTMLDivElement | null>;
    /**
     * The formatted value shown in the element
     * @example "+1 (234) 567-8900"
     */
    value: string;
    /**
     * Alias for `value`.
     * @deprecated Use `value` instead.
     */
    displayValue: string;
    /**
     * The unmasked digits only
     * @example "1234567890"
     */
    rawValue: string;
}

export function useContentEditableMask({
    template,
    placeholder,
    keepPosition = false,
    value: controlledValue,
    onValueChange,
    showMaskWhenEmpty = true,
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
    // True from compositionstart until the committed text is masked. A controlled
    // update then waits, so it doesn't overwrite the text the IME owns.
    const [composing, setComposing] = useState(false);
    const composingRef = useRef(false);
    // The formatted value and selection from just before an IME composition started.
    const compositionStartRef = useRef<{ value: string; start: number; end: number } | null>(null);
    // Browsers differ in when the committed text reaches the DOM: Chrome before
    // compositionend, Safari after it. So the commit waits for the next input
    // event or the next task, whichever comes first, and masks the final text.
    const pendingCommitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const commitRef = useRef<() => void>(() => { });

    // Internal state always holds the full mask; an empty field can show "" instead.
    const toDisplay = useCallback(
        (next: string) => (showMaskWhenEmpty || cleanInput(next, template).length > 0 ? next : ''),
        [showMaskWhenEmpty, template],
    );
    const displayValue = toDisplay(value);

    useEffect(() => () => {
        if (pendingCommitRef.current !== null) clearTimeout(pendingCommitRef.current);
    }, []);

    // Sync internal state to controlled value
    const formattedControlled = controlledValue !== undefined
        ? (keepPosition && isMatchWithMask(controlledValue, template, placeholder)
            ? normalizeDigits(controlledValue)
            : formatWithMask(cleanInput(controlledValue, template), template, placeholder))
        : null;

    if (!composing && formattedControlled !== null && formattedControlled !== value) {
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
        if (ref.current && ref.current.textContent !== displayValue) {
            ref.current.textContent = displayValue;
        }
    }, [displayValue]);

    useLayoutEffect(() => {
        // Only move the caret in the focused element, so a controlled update
        // doesn't move the document's selection somewhere else.
        if (ref.current && cursor !== null && isFocused(ref.current)) {
            // Restore cursor
            setCaretPosition(ref.current, cursor);
        }
    }, [cursor, value, setCaretPosition]);


    // Using native event listeners for better control (beforeinput)
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;

        const handleBeforeInput = (e: InputEvent) => {
            // Composition input can't be cancelled; the text is masked once the
            // composition ends. Input right after compositionend (Chrome's Korean IME
            // sends the next digit then) also goes through to the DOM, and the
            // pending commit masks it together with the composed text.
            if (e.isComposing || composingRef.current || pendingCommitRef.current !== null || e.inputType.includes('Composition')) return;

            if (e.inputType === 'insertText' || e.inputType === 'insertFromPaste') {
                e.preventDefault();

                // For contenteditable, browsers leave `data` null on paste and put the
                // pasted text in `dataTransfer` instead.
                const data = e.data || e.dataTransfer?.getData('text/plain') || '';
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
                    onValueChange?.(toDisplay(result.value));
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
                        onValueChange?.(toDisplay(result.value));
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
                        onValueChange?.(toDisplay(result.value));
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

        const commitComposition = () => {
            if (pendingCommitRef.current !== null) clearTimeout(pendingCommitRef.current);
            pendingCommitRef.current = null;
            setComposing(false);

            const before = compositionStartRef.current;
            compositionStartRef.current = null;
            if (!before) return;

            // The IME wrote straight into the DOM. Apply what it changed as one edit
            // of the pre-composition value, so the text goes through the mask.
            const text = el.textContent || '';
            // From an empty field ("" shown because showMaskWhenEmpty is off) the
            // whole text goes into an empty mask.
            const fromEmpty = before.value === '';
            const baseValue = fromEmpty ? formatWithMask('', template, placeholder) : before.value;
            const change = fromEmpty
                ? { start: 0, end: 0, text }
                : diffComposition(before.value, text, before.start, before.end);
            const result = applyCompositionChange(baseValue, template, placeholder, change, keepPosition);
            const shown = toDisplay(result.value);

            // Write the DOM now: React state may not change (nothing kept), and then
            // no effect would remove the composed text.
            if (el.textContent !== shown) el.textContent = shown;
            setCaretPosition(el, result.cursor);
            setValue(result.value);
            setCursor(result.cursor);
            if (result.value !== baseValue) onValueChange?.(shown);
        };
        commitRef.current = commitComposition;

        const handleCompositionStart = () => {
            // A new composition right after another one: settle the first.
            if (pendingCommitRef.current !== null) commitComposition();
            composingRef.current = true;
            // The DOM shows the formatted value here, even right after a commit
            // that hasn't re-rendered yet.
            compositionStartRef.current = { value: el.textContent || '', ...getSelectionIndices(el) };
            setComposing(true);
        };

        const handleCompositionEnd = () => {
            composingRef.current = false;
            if (pendingCommitRef.current !== null) clearTimeout(pendingCommitRef.current);
            // flushSync so the listeners re-bind with the committed value before any later key.
            pendingCommitRef.current = setTimeout(() => flushSync(() => commitRef.current()), 0);
        };

        const handleInput = () => {
            if (!composingRef.current && pendingCommitRef.current !== null) commitComposition();
        };

        el.addEventListener('beforeinput', handleBeforeInput as EventListener);
        el.addEventListener('input', handleInput);
        el.addEventListener('compositionstart', handleCompositionStart);
        el.addEventListener('compositionend', handleCompositionEnd);
        el.addEventListener('focus', handleFocus);
        return () => {
            el.removeEventListener('beforeinput', handleBeforeInput as EventListener);
            el.removeEventListener('input', handleInput);
            el.removeEventListener('compositionstart', handleCompositionStart);
            el.removeEventListener('compositionend', handleCompositionEnd);
            el.removeEventListener('focus', handleFocus);
        };
    }, [value, template, placeholder, keepPosition, onValueChange, getSelectionIndices, setCaretPosition, toDisplay]);

    const rawValue = cleanInput(value, template);

    return {
        ref,
        value: displayValue,
        displayValue,
        rawValue
    };
}
