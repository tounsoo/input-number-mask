import { useRef, useState, useLayoutEffect } from 'react';
import { cleanInput, formatWithMask, isDigit, applyKeepPositionChange, isMatchWithMask } from '../utils/maskUtils';

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

    // Sync internal state to controlled value on every render
    // This ensures the input reverts when parent doesn't update the controlled value
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
            const isSelection = start !== end;



            if (e.key === 'Backspace') {
                if (start === 0 && !isSelection) return;
                // We prevent default to handle the state update manually
                e.preventDefault();

                let deleteIndex = start - 1;

                if (isSelection) {
                    if (keepPosition) {
                        // Replace range with placeholders
                        let newVal = value;
                        for (let i = start; i < end; i++) {
                            if (template[i] === 'd') {
                                const pChar = placeholder && i < placeholder.length ? placeholder[i] : '_';
                                newVal = newVal.substring(0, i) + pChar + newVal.substring(i + 1);
                            }
                        }
                        setValue(newVal);
                        onValueChange?.(newVal);
                        setCursor(start);
                        return;
                    } else {
                        // Standard delete range (shift)
                        const newValRaw = value.slice(0, start) + value.slice(end);
                        const newDigits = cleanInput(newValRaw, template);
                        const formatted = formatWithMask(newDigits, template, placeholder);
                        setValue(formatted);
                        onValueChange?.(formatted);
                        setCursor(start);
                        return;
                    }
                }

                // Single char backspace
                while (deleteIndex >= 0) {
                    const isTemplateLiteral = template[deleteIndex] !== 'd';
                    if (isTemplateLiteral) {
                        deleteIndex--;
                    } else {
                        break;
                    }
                }

                if (deleteIndex < 0) return; // Nothing to delete

                if (keepPosition) {
                    const pChar = placeholder && deleteIndex < placeholder.length ? placeholder[deleteIndex] : '_';
                    const newVal = value.substring(0, deleteIndex) + pChar + value.substring(deleteIndex + 1);
                    setValue(newVal);
                    onValueChange?.(newVal);
                    setCursor(deleteIndex);
                } else {
                    // Shift behavior
                    const newValRaw = value.slice(0, deleteIndex) + value.slice(deleteIndex + 1);
                    const newDigits = cleanInput(newValRaw, template);
                    const formatted = formatWithMask(newDigits, template, placeholder);
                    setValue(formatted);
                    onValueChange?.(formatted);
                    setCursor(deleteIndex);
                }
            } else if (e.key === 'Delete') {
                e.preventDefault();
                // Delete forward
                if (isSelection) {
                    if (keepPosition) {
                        let newVal = value;
                        for (let i = start; i < end; i++) {
                            if (template[i] === 'd') {
                                const pChar = placeholder && i < placeholder.length ? placeholder[i] : '_';
                                newVal = newVal.substring(0, i) + pChar + newVal.substring(i + 1);
                            }
                        }
                        setValue(newVal);
                        onValueChange?.(newVal);
                        setCursor(start);
                        return;
                    } else {
                        const newValRaw = value.slice(0, start) + value.slice(end);
                        const newDigits = cleanInput(newValRaw, template);
                        const formatted = formatWithMask(newDigits, template, placeholder);
                        setValue(formatted);
                        onValueChange?.(formatted);
                        setCursor(start);
                        return;
                    }
                }

                // Single char delete
                let deleteIndex = start;
                while (deleteIndex < template.length) {
                    const isTemplateLiteral = template[deleteIndex] !== 'd';
                    if (isTemplateLiteral) {
                        deleteIndex++;
                    } else {
                        break;
                    }
                }

                if (deleteIndex >= value.length) return;

                if (keepPosition) {
                    const pChar = placeholder && deleteIndex < placeholder.length ? placeholder[deleteIndex] : '_';
                    const newVal = value.substring(0, deleteIndex) + pChar + value.substring(deleteIndex + 1);
                    setValue(newVal);
                    onValueChange?.(newVal);
                    setCursor(start);
                } else {
                    // Shift behavior
                    const newValRaw = value.slice(0, deleteIndex) + value.slice(deleteIndex + 1);
                    const newDigits = cleanInput(newValRaw, template);
                    const formatted = formatWithMask(newDigits, template, placeholder);
                    setValue(formatted);
                    onValueChange?.(formatted);
                    setCursor(start);
                }
            }
        };

        const handleInput = (e: Event) => {
            // We cast to InputEvent or basic Event. target is HTMLInputElement.
            const target = e.target as HTMLInputElement;
            const inputVal = target.value;
            const rawCursor = target.selectionStart || 0;

            // Standard behavior logic
            const standardChange = () => {
                const beforeCursor = inputVal.slice(0, rawCursor);
                const digitsBeforeCursor = cleanInput(beforeCursor, template).length;

                const newDigits = cleanInput(inputVal, template);
                const newFormatted = formatWithMask(newDigits, template, placeholder);

                // If the formatted value didn't change (e.g., non-digit typed), 
                // restore cursor to previous position directly (can't rely on state 
                // because setting same value won't trigger effect)
                if (newFormatted === value) {
                    const restorePos = selectionRef.current.start;
                    requestAnimationFrame(() => {
                        if (input) {
                            input.setSelectionRange(restorePos, restorePos);
                        }
                    });
                    return;
                }

                setValue(newFormatted);
                onValueChange?.(newFormatted);

                let currentDigits = 0;
                let newCursor = 0;
                for (let i = 0; i < newFormatted.length; i++) {
                    if (currentDigits >= digitsBeforeCursor) {
                        break;
                    }
                    if (isDigit(newFormatted[i]) && template[i] === 'd') {
                        currentDigits++;
                    }
                    newCursor++;
                }

                while (newCursor < newFormatted.length && template[newCursor] !== 'd') {
                    newCursor++;
                }

                setCursor(newCursor);
            };

            if (keepPosition) {
                const prevStart = selectionRef.current.start;
                const prevEnd = selectionRef.current.end;
                const wasSelection = prevStart !== prevEnd;
                const selectionLength = prevEnd - prevStart;
                const typedChars = inputVal.length - value.length + selectionLength;

                // Handle single character input (typing one digit)
                if (typedChars === 1 && rawCursor > 0) {
                    const insertIndex = rawCursor - 1;
                    const char = inputVal[insertIndex];

                    if (isDigit(char)) {
                        // For selection replacement, use the selection range
                        // For cursor insertion (no selection), use the cursor position
                        const startPos = wasSelection ? prevStart : insertIndex;
                        const endPos = wasSelection ? prevEnd : insertIndex;

                        // Only apply keepPosition if within template bounds
                        // If cursor is at/beyond template length (e.g., typing at end),
                        // fall through to standardChange() for normal fill behavior
                        if (startPos < template.length) {
                            const result = applyKeepPositionChange(
                                value,
                                template,
                                placeholder,
                                startPos,
                                endPos,
                                char
                            );

                            setValue(result.value);
                            onValueChange?.(result.value);
                            setCursor(result.cursor);
                            return;
                        }
                    }
                }
            }

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
    }, [value, template, placeholder, keepPosition, onValueChange]); // Re-bind when value changes to have fresh closure

    const rawValue = cleanInput(value, template);

    return {
        value,
        displayValue: value,
        rawValue,
        ref
    };
}
