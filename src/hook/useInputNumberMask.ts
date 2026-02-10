import { useRef, useState, useLayoutEffect } from 'react';
import { cleanInput, formatWithMask, isMatchWithMask, calculateMaskState, isDigit, getCursorPosAfterFormat } from '../utils/maskUtils';

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
     * Callback with the input value.
     * Triggered only on user interaction.
     */
    onValueChange?: (value: string) => void;

    /**
     * Controlled value. The hook will sync its internal state to this value.
     */
    value?: string;
}

export interface UseInputNumberMaskReturn {
    /** 
     * The raw value with formatting applied 
     * @example "+1 (234) 567-8900" 
     */
    value: string;
    /** 
     * Deprecated: alias for value. The value to display in the input. 
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
}: UseInputNumberMaskProps): UseInputNumberMaskReturn {

    const [value, setValue] = useState(() => {
        if (controlledValue !== undefined) {
            const digits = cleanInput(controlledValue, template);
            return formatWithMask(digits, template, placeholder);
        }
        return formatWithMask('', template, placeholder);
    });

    const [cursor, setCursor] = useState<number | null>(null);
    const ref = useRef<HTMLInputElement>(null);
    const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

    const formattedControlled = controlledValue !== undefined
        ? (keepPosition && isMatchWithMask(controlledValue, template, placeholder)
            ? controlledValue
            : formatWithMask(cleanInput(controlledValue, template), template, placeholder))
        : null;

    if (formattedControlled !== null && formattedControlled !== value) {
        setValue(formattedControlled);
    }

    useLayoutEffect(() => {
        if (ref.current && cursor !== null) {
            ref.current.setSelectionRange(cursor, cursor);
        }
    }, [cursor, value]);

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
                    onValueChange?.(result.value);
                    setCursor(result.cursor);
                }
            }
        };

        const handleInput = (e: Event) => {
            const target = e.target as HTMLInputElement;
            const inputVal = target.value;
            const rawCursor = target.selectionStart || 0;

            const prevStart = selectionRef.current.start;
            const prevEnd = selectionRef.current.end;

            const selectionLength = prevEnd - prevStart;
            const typedChars = inputVal.length - value.length + selectionLength;

            if (keepPosition && typedChars === 1 && rawCursor > 0) {
                const insertIndex = rawCursor - 1;
                const char = inputVal[insertIndex];

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
                        onValueChange?.(result.value);
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
                    requestAnimationFrame(() => {
                        if (input) input.setSelectionRange(restorePos, restorePos);
                    });
                    return;
                }

                setValue(newFormatted);
                onValueChange?.(newFormatted);

                const newCursor = getCursorPosAfterFormat(newFormatted, template, digitsBeforeCursor);
                setCursor(newCursor);
            };

            standardChange();
        };

        input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('input', handleInput);
        input.addEventListener('select', updateSelection);
        input.addEventListener('click', updateSelection);
        input.addEventListener('mouseup', updateSelection);
        input.addEventListener('keyup', updateSelection);

        return () => {
            input.removeEventListener('keydown', handleKeyDown);
            input.removeEventListener('input', handleInput);
            input.removeEventListener('select', updateSelection);
            input.removeEventListener('click', updateSelection);
            input.removeEventListener('mouseup', updateSelection);
            input.removeEventListener('keyup', updateSelection);
        };
    }, [value, template, placeholder, keepPosition, onValueChange]);

    const rawValue = cleanInput(value, template);

    return {
        value,
        displayValue: value,
        rawValue,
        ref
    };
}
