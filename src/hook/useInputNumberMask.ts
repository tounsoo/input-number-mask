import { flushSync } from 'react-dom';
import { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { cleanInput, formatWithMask, isMatchWithMask, calculateMaskState, isDigit, getCursorPosAfterFormat, normalizeDigits, diffComposition, applyCompositionChange, isFocused } from '../utils/maskUtils';

export interface UseInputNumberMaskProps {
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
     * Called when the user changes the value, with the formatted value.
     */
    onValueChange?: (value: string) => void;

    /**
     * Controlled value. The hook will sync its internal state to this value.
     */
    value?: string;

    /**
     * If true, an empty field shows the template's literals and placeholder
     * (for example `(___) ___-____`). If false, the value stays `""` until the
     * first digit, so native `required` validation, `:placeholder-shown` and
     * screen readers treat the field as empty.
     * @default true
     */
    showMaskWhenEmpty?: boolean;
}

export interface UseInputNumberMaskReturn {
    /**
     * The formatted value to show in the input. While an IME is composing, it is
     * the text as typed, unformatted.
     * @example "+1 (234) 567-8900"
     */
    value: string;
    /**
     * Alias for `value`.
     * @deprecated Use `value` instead.
     * @example "+1 (234) 567-8900"
     */
    displayValue: string;
    /** 
     * The unmasked digits only 
     * @example "1234567890" 
     */
    rawValue: string;
    /** 
     * Ref to be attached to the HTML input element 
     */
    ref: React.RefObject<HTMLInputElement | null>;
}

export function useInputNumberMask({
    template,
    placeholder,
    keepPosition = false,
    value: controlledValue,
    onValueChange,
    showMaskWhenEmpty = true,
}: UseInputNumberMaskProps): UseInputNumberMaskReturn {

    const [value, setValue] = useState(() => {
        if (controlledValue !== undefined) {
            const digits = cleanInput(controlledValue, template);
            return formatWithMask(digits, template, placeholder);
        }
        return formatWithMask('', template, placeholder);
    });

    const [cursor, setCursor] = useState<number | null>(null);
    // True while an IME composition is in progress. The value then mirrors the
    // input as typed, unformatted, so React doesn't reset the text the IME owns.
    const [composing, setComposing] = useState(false);
    const ref = useRef<HTMLInputElement>(null);
    const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
    const composingRef = useRef(false);
    // The formatted value and selection from just before the composition started.
    const compositionStartRef = useRef<{ value: string; start: number; end: number } | null>(null);
    // Browsers differ in when the committed text reaches the DOM: Chrome before
    // compositionend, Safari after it. So the commit waits for the next input
    // event or the next task, whichever comes first, and masks the final text.
    const pendingCommitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const commitRef = useRef<() => void>(() => { });
    const rafRef = useRef<number | null>(null);

    // Internal state always holds the full mask; an empty field can show "" instead.
    const toDisplay = useCallback(
        (next: string) => (showMaskWhenEmpty || cleanInput(next, template).length > 0 ? next : ''),
        [showMaskWhenEmpty, template],
    );
    const displayValue = composing ? value : toDisplay(value);

    const formattedControlled = controlledValue !== undefined
        ? (keepPosition && isMatchWithMask(controlledValue, template, placeholder)
            ? normalizeDigits(controlledValue)
            : formatWithMask(cleanInput(controlledValue, template), template, placeholder))
        : null;

    if (!composing && formattedControlled !== null && formattedControlled !== value) {
        setValue(formattedControlled);
    }

    useLayoutEffect(() => {
        if (composing) return;
        // Only move the caret in the focused input: Safari can move focus to an
        // input when setSelectionRange is called on it, e.g. on a controlled update.
        if (ref.current && cursor !== null && isFocused(ref.current)) {
            ref.current.setSelectionRange(cursor, cursor);
        }
    }, [cursor, value, composing]);

    // Cancel a pending composition commit or caret restore when the input unmounts.
    useEffect(() => () => {
        if (pendingCommitRef.current !== null) clearTimeout(pendingCommitRef.current);
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    }, []);

    useLayoutEffect(() => {
        const input = ref.current;
        if (!input) return;

        const updateSelection = () => {
            if (input) {
                selectionRef.current = {
                    start: input.selectionStart || 0,
                    end: input.selectionEnd || 0,
                };
            }
        };

        const handleKeyDown = (e: globalThis.KeyboardEvent) => {
            updateSelection();
            // Keys during an IME composition belong to the IME. Safari and older
            // browsers report some of them with keyCode 229 and isComposing false.
            // A key right after compositionend is left to the browser too; the
            // pending commit then masks the text it produced.
            if (e.isComposing || e.keyCode === 229 || composingRef.current || pendingCommitRef.current !== null) return;
            const el = e.target as HTMLInputElement;
            const start = el.selectionStart || 0;
            const end = el.selectionEnd || 0;

            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                const type = e.key === 'Backspace' ? 'deleteBackward' : 'deleteForward';

                const result = calculateMaskState(
                    value,
                    template,
                    placeholder,
                    start,
                    end,
                    type,
                    '',
                    keepPosition
                );

                if (result) {
                    setValue(result.value);
                    onValueChange?.(toDisplay(result.value));
                    setCursor(result.cursor);
                }
            }
        };

        const handleInput = (e: Event) => {
            const target = e.target as HTMLInputElement;
            const inputVal = target.value;
            const rawCursor = target.selectionStart || 0;

            if (composingRef.current || (e as InputEvent).isComposing) {
                // Don't reformat mid-composition: mirror the text so the IME keeps it.
                setValue(inputVal);
                return;
            }

            if (pendingCommitRef.current !== null) {
                commitComposition();
                return;
            }

            const prevStart = selectionRef.current.start;
            const prevEnd = selectionRef.current.end;

            const selectionLength = prevEnd - prevStart;
            const typedChars = inputVal.length - value.length + selectionLength;

            if (keepPosition && typedChars === 1 && rawCursor > 0) {
                const insertIndex = rawCursor - 1;
                const char = normalizeDigits(inputVal[insertIndex]);

                // If we have a single typed char, reuse calculateMaskState
                if (isDigit(char)) {
                    const result = calculateMaskState(
                        value, // use state value (before change)
                        template,
                        placeholder,
                        prevStart, // use previous selection
                        prevEnd,
                        'insert',
                        char,
                        true // keepPosition
                    );

                    if (result) {
                        setValue(result.value);
                        onValueChange?.(toDisplay(result.value));
                        setCursor(result.cursor);
                        return;
                    }
                }
            }

            const standardChange = () => {
                const beforeCursor = inputVal.slice(0, rawCursor);
                const digitsBeforeCursor = cleanInput(beforeCursor, template).length;

                const newDigits = cleanInput(inputVal, template);
                const newFormatted = formatWithMask(newDigits, template, placeholder);

                if (newFormatted === value) {
                    const restorePos = selectionRef.current.start;
                    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
                    rafRef.current = requestAnimationFrame(() => {
                        rafRef.current = null;
                        if (isFocused(input)) input.setSelectionRange(restorePos, restorePos);
                    });
                    return;
                }

                setValue(newFormatted);
                onValueChange?.(toDisplay(newFormatted));

                const newCursor = getCursorPosAfterFormat(newFormatted, template, digitsBeforeCursor);
                setCursor(newCursor);
            };

            standardChange();
        };

        const handleCompositionStart = () => {
            // A new composition right after another one: settle the first.
            if (pendingCommitRef.current !== null) commitComposition();
            composingRef.current = true;
            // The input shows the formatted value here, even right after a commit
            // that hasn't re-rendered yet.
            compositionStartRef.current = {
                value: input.value,
                start: input.selectionStart ?? 0,
                end: input.selectionEnd ?? 0,
            };
            // While composing, state mirrors the text the IME owns. Start the mirror
            // from what the input shows, so a field shown as "" (showMaskWhenEmpty
            // off) isn't filled with the empty mask mid-composition.
            setValue(input.value);
            setComposing(true);
        };

        const commitComposition = () => {
            if (pendingCommitRef.current !== null) clearTimeout(pendingCommitRef.current);
            pendingCommitRef.current = null;

            setComposing(false);
            const inputVal = input.value;
            const before = compositionStartRef.current;
            compositionStartRef.current = null;

            // Apply what the IME changed as one edit of the pre-composition value,
            // so keepPosition and the caret behave as they do for typing.
            // From an empty field (no compositionstart seen, or "" shown because
            // showMaskWhenEmpty is off) the whole text goes into an empty mask.
            const fromEmpty = !before || before.value === '';
            const base = fromEmpty ? { value: formatWithMask('', template, placeholder), start: 0, end: 0 } : before;
            const change = fromEmpty
                ? { start: 0, end: 0, text: inputVal }
                : diffComposition(base.value, inputVal, base.start, base.end);
            const result = applyCompositionChange(base.value, template, placeholder, change, keepPosition);

            const shown = toDisplay(result.value);
            if (input.value !== shown) input.value = shown;
            input.setSelectionRange(result.cursor, result.cursor);
            updateSelection();
            setValue(result.value);
            setCursor(result.cursor);
            if (result.value !== base.value) onValueChange?.(shown);
        };
        commitRef.current = commitComposition;

        const handleCompositionEnd = () => {
            composingRef.current = false;
            if (pendingCommitRef.current !== null) clearTimeout(pendingCommitRef.current);
            // flushSync so the listeners re-bind with the committed value before any later key.
            pendingCommitRef.current = setTimeout(() => flushSync(() => commitRef.current()), 0);
        };

        input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('compositionstart', handleCompositionStart);
        input.addEventListener('compositionend', handleCompositionEnd);
        input.addEventListener('input', handleInput);
        input.addEventListener('select', updateSelection);
        input.addEventListener('click', updateSelection);
        input.addEventListener('mouseup', updateSelection);
        input.addEventListener('keyup', updateSelection);

        return () => {
            input.removeEventListener('keydown', handleKeyDown);
            input.removeEventListener('compositionstart', handleCompositionStart);
            input.removeEventListener('compositionend', handleCompositionEnd);
            input.removeEventListener('input', handleInput);
            input.removeEventListener('select', updateSelection);
            input.removeEventListener('click', updateSelection);
            input.removeEventListener('mouseup', updateSelection);
            input.removeEventListener('keyup', updateSelection);
        };
    }, [value, template, placeholder, keepPosition, onValueChange, toDisplay]);

    const rawValue = cleanInput(value, template);

    return {
        value: displayValue,
        displayValue,
        rawValue,
        ref
    };
}
