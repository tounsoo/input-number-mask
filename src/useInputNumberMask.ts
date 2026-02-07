import { useRef, useState, useLayoutEffect } from 'react';
import { cleanInput, formatWithMask, isDigit } from './utils/maskUtils';

/**
 * useInputNumberMask
 * 
 * A hook for masking number inputs with template support.
 * 
 * @param template The mask template. 'd' represents a digit. All other characters are treated as literals.
 *                 Example: "+1 (ddd) ddd-dddd" for US phone numbers.
 * @param placeholder Optional full-length placeholder. Characters that match the template literals 
 *                    will be displayed. 'd' positions can be filled with a placeholder char or kept as is.
 *                    Example: "dd/mm/yyyy" for a date mask "dd/mm/yyyy".
 * @param keepPosition If true, deleting a character will replace it with the placeholder char (if valid)
 *                     or keep the cursor position without shifting subsequent characters (if supported).
 *                     For now, we'll implement standard behavior where backspace deletes and shifts, 
 *                     unless specific requirements enforce strict position keeping.
 *                     TODO: fully implement "keep position" logic if needed.
 */
interface UseInputNumberMaskProps {
    template: string;
    placeholder?: string;
    keepPosition?: boolean;
}

interface UseInputNumberMaskReturn {
    value: string; // The raw value with formatting (e.g. "+1 (234) 567-8900")
    displayValue: string; // The value to display in the input
    rawValue: string; // The unmasked digits (e.g. "12345678")
    ref: React.RefObject<HTMLInputElement | null>;
}

export function useInputNumberMask({
    template,
    placeholder,
    keepPosition = false,
}: UseInputNumberMaskProps): UseInputNumberMaskReturn {

    const [value, setValue] = useState(() => formatWithMask('', template, placeholder));
    const [cursor, setCursor] = useState<number | null>(null);
    const ref = useRef<HTMLInputElement>(null);

    useLayoutEffect(() => {
        if (ref.current && cursor !== null) {
            ref.current.setSelectionRange(cursor, cursor);
        }
    }, [cursor, value]);

    // Ref-based Event Handling
    useLayoutEffect(() => {
        const input = ref.current;
        if (!input) return;

        const handleKeyDown = (e: globalThis.KeyboardEvent) => {
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
                        setCursor(start);
                        return;
                    } else {
                        // Standard delete range (shift)
                        const newValRaw = value.slice(0, start) + value.slice(end);
                        const newDigits = cleanInput(newValRaw, template);
                        const formatted = formatWithMask(newDigits, template, placeholder);
                        setValue(formatted);
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
                    setCursor(deleteIndex);
                } else {
                    // Shift behavior
                    const newValRaw = value.slice(0, deleteIndex) + value.slice(deleteIndex + 1);
                    const newDigits = cleanInput(newValRaw, template);
                    const formatted = formatWithMask(newDigits, template, placeholder);
                    setValue(formatted);
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
                        setCursor(start);
                        return;
                    } else {
                        const newValRaw = value.slice(0, start) + value.slice(end);
                        const newDigits = cleanInput(newValRaw, template);
                        const formatted = formatWithMask(newDigits, template, placeholder);
                        setValue(formatted);
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
                    setCursor(start);
                } else {
                    // Shift behavior
                    const newValRaw = value.slice(0, deleteIndex) + value.slice(deleteIndex + 1);
                    const newDigits = cleanInput(newValRaw, template);
                    const formatted = formatWithMask(newDigits, template, placeholder);
                    setValue(formatted);
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

                setValue(newFormatted);

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
                // Measure diff against current state `value` (mapped in closure)
                // NOTE: `value` in this closure is stale if not included in dependency array.
                // We need strict dependency on `value`.
                if (inputVal.length > value.length) {
                    const insertIndex = rawCursor - 1;
                    const char = inputVal[insertIndex];

                    if (!isDigit(char)) {
                        standardChange();
                        return;
                    }

                    let targetIndex = insertIndex;
                    while (targetIndex < template.length) {
                        if (template[targetIndex] === 'd') {
                            break;
                        }
                        targetIndex++;
                    }

                    if (targetIndex >= template.length) {
                        standardChange();
                        return;
                    }

                    const newValue = value.substring(0, targetIndex) + char + value.substring(targetIndex + 1);

                    setValue(newValue);
                    setCursor(targetIndex + 1);
                    return;
                }
            }

            standardChange();
        };

        input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('input', handleInput);

        return () => {
            input.removeEventListener('keydown', handleKeyDown);
            input.removeEventListener('input', handleInput);
        };
    }, [value, template, placeholder, keepPosition]); // Re-bind when value changes to have fresh closure

    const rawValue = cleanInput(value, template);

    return {
        value,
        displayValue: value,
        rawValue,
        ref
    };
}
