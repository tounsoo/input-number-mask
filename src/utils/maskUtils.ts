export const isDigit = (char: string) => /\d/.test(char);

export const cleanInput = (input: string, template: string): string => {
    let extracted = '';
    let t = 0;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (t >= template.length) {
            break;
        }

        if (template[t] === 'd') {
            if (isDigit(char)) {
                extracted += char;
                t++;
            } else {
                // Ignore placeholders or garbage
            }
        } else if (template[t] === char) {
            t++;
        } else {
            let nextT = t;
            while (nextT < template.length && template[nextT] !== 'd' && template[nextT] !== char) {
                nextT++;
            }
            if (nextT < template.length && template[nextT] === 'd') {
                if (isDigit(char)) {
                    extracted += char;
                    t = nextT + 1;
                }
            } else if (nextT < template.length && template[nextT] === char) {
                t = nextT + 1;
            }
        }
    }
    return extracted;
};

export const formatWithMask = (digits: string, template: string, placeholder?: string): string => {
    let res = '';
    let dIdx = 0;

    for (let i = 0; i < template.length; i++) {
        const isSlot = template[i] === 'd';

        if (isSlot) {
            if (dIdx < digits.length) {
                res += digits[dIdx++];
            } else {
                // Empty slot
                if (placeholder && i < placeholder.length) {
                    res += placeholder[i];
                } else {
                    if (!placeholder) {
                        break;
                    }
                }
            }
        } else {
            res += template[i];
        }
    }
    return res;
};

export const applyKeepPositionChange = (
    value: string,
    template: string,
    placeholder: string | undefined,
    start: number,
    end: number,
    char: string
): { value: string; cursor: number } => {
    let newValue = value;
    let newCursor = start;

    // Deletion
    if (char === '') {
        for (let i = start; i < end; i++) {
            if (template[i] === 'd') {
                const pChar = placeholder && i < placeholder.length ? placeholder[i] : '_';
                newValue = newValue.substring(0, i) + pChar + newValue.substring(i + 1);
            }
        }
        return { value: newValue, cursor: start };
    }

    // Replacement (Selection)
    if (start !== end) {
        // 1. Replace the first digit slot at start (if it's a digit slot)
        // Actually, if we selected a range, we typically want to replace the *entire* range content
        // with the new char *at the beginning*, and clear the rest.
        // But we must respect the template chars.

        // Strategy:
        // - Clear the entire range first (replace with placeholders)
        // - Insert the char at the first available digit slot within the range (or shortly after if range starts on literal?)
        // Wait, standard input behavior replacing a selection "12/34" with "5":
        // "12/5..."
        // So effectively: delete range, then insert char.

        // Let's implement it as:
        // 1. Check if first char of selection matches the typed char
        // If so, skip it and insert at the next digit slot
        let insertStart = start;
        if (isDigit(char) && value[start] === char) {
            // The first position already has the same digit, so skip it
            insertStart = start + 1;
            // Skip any literals to find the next digit slot
            while (insertStart < end && template[insertStart] !== 'd') {
                insertStart++;
            }
        }

        // 2. Clear the range from insertStart to end (fill with placeholders)
        for (let i = insertStart; i < end; i++) {
            if (template[i] === 'd') {
                const pChar = placeholder && i < placeholder.length ? placeholder[i] : '_';
                newValue = newValue.substring(0, i) + pChar + newValue.substring(i + 1);
            }
        }

        // 3. Insert the char at insertStart (finding closest digit slot)
        let targetIndex = insertStart;
        while (targetIndex < template.length) {
            if (template[targetIndex] === 'd') {
                break;
            }
            targetIndex++;
        }

        if (targetIndex < template.length && isDigit(char)) {
            newValue = newValue.substring(0, targetIndex) + char + newValue.substring(targetIndex + 1);
            newCursor = targetIndex + 1;
        } else {
            newCursor = start;
        }

        return { value: newValue, cursor: newCursor };
    }

    // Insertion (No selection)
    // Find next digit slot
    let targetIndex = start;
    while (targetIndex < template.length) {
        if (template[targetIndex] === 'd') {
            break;
        }
        targetIndex++;
    }

    if (targetIndex < template.length && isDigit(char)) {
        newValue = newValue.substring(0, targetIndex) + char + newValue.substring(targetIndex + 1);
        newCursor = targetIndex + 1;
    } else {
        newCursor = start; // No change
    }

    return { value: newValue, cursor: newCursor };
};

export const isMatchWithMask = (value: string, template: string, placeholder?: string): boolean => {
    if (value.length !== template.length) return false;

    for (let i = 0; i < template.length; i++) {
        const char = value[i];
        const tChar = template[i];
        const pChar = placeholder && i < placeholder.length ? placeholder[i] : undefined;

        if (tChar === 'd') {
            // Must be a digit OR a placeholder char (if exists) OR '_' (if no custom placeholder)
            // Actually, existing implementation uses '_' as default placeholder in applyKeepPositionChange
            const isDigitChar = isDigit(char);
            const isPlaceholder = char === (pChar || '_');

            if (!isDigitChar && !isPlaceholder) {
                return false;
            }
        } else {
            // Literal must match
            if (char !== tChar) {
                return false;
            }
        }
    }
    return true;
};

// New shared utility
export const calculateMaskState = (
    currentValue: string,
    template: string,
    placeholder: string | undefined, // undefined implies default placeholder behavior logic where needed, though standard formatter handles it
    start: number,
    end: number,
    inputType: 'insert' | 'deleteBackward' | 'deleteForward',
    char: string = '',
    keepPosition: boolean = false
): { value: string, cursor: number } | null => {

    const isSelection = start !== end;

    if (inputType === 'insert') {
        if (keepPosition) {
            // Handle single char typing. what if char length > 1 (paste)?
            // applyKeepPositionChange logic mostly handles single char or replacement.
            // If pasted string is multiple chars, standard input usually handles it by shifting.
            // But keepPosition is specific.
            // For now assume single char for keeps. If longer, maybe fall back to standard?
            if (char.length === 1 && start < template.length) {
                return applyKeepPositionChange(currentValue, template, placeholder, start, end, char);
            }
        }

        // Standard insertion
        let newValRaw = currentValue;
        if (isSelection) {
            newValRaw = currentValue.slice(0, start) + char + currentValue.slice(end);
        } else {
            newValRaw = currentValue.slice(0, start) + char + currentValue.slice(start);
        }

        const newDigits = cleanInput(newValRaw, template);
        const formatted = formatWithMask(newDigits, template, placeholder);

        // Calculate cursor
        let currentDigits = 0;
        const beforeCursorRaw = newValRaw.slice(0, start + char.length);
        const digitsBeforeCursor = cleanInput(beforeCursorRaw, template).length;

        let newCursor = 0;
        for (let i = 0; i < formatted.length; i++) {
            if (currentDigits >= digitsBeforeCursor) break;
            if (isDigit(formatted[i]) && template[i] === 'd') {
                currentDigits++;
            }
            newCursor++;
        }
        while (newCursor < formatted.length && template[newCursor] !== 'd') {
            newCursor++;
        }

        return { value: formatted, cursor: newCursor };
    }

    if (inputType === 'deleteBackward') {
        if (start === 0 && !isSelection) return null; // No change

        if (isSelection) {
            if (keepPosition) {
                const res = applyKeepPositionChange(currentValue, template, placeholder, start, end, '');
                return res;
            } else {
                const newValRaw = currentValue.slice(0, start) + currentValue.slice(end);
                const newDigits = cleanInput(newValRaw, template);
                const formatted = formatWithMask(newDigits, template, placeholder);
                return { value: formatted, cursor: start };
            }
        }

        // Single char backspace
        let deleteIndex = start - 1;
        while (deleteIndex >= 0) {
            const isTemplateLiteral = template[deleteIndex] !== 'd';
            if (isTemplateLiteral) {
                deleteIndex--;
            } else {
                break;
            }
        }

        if (deleteIndex < 0) return null;

        if (keepPosition) {
            const pChar = placeholder && deleteIndex < placeholder.length ? placeholder[deleteIndex] : '_';
            const newVal = currentValue.substring(0, deleteIndex) + pChar + currentValue.substring(deleteIndex + 1);
            return { value: newVal, cursor: deleteIndex };
        } else {
            const newValRaw = currentValue.slice(0, deleteIndex) + currentValue.slice(deleteIndex + 1);
            const newDigits = cleanInput(newValRaw, template);
            const formatted = formatWithMask(newDigits, template, placeholder);
            return { value: formatted, cursor: deleteIndex };
        }
    }

    if (inputType === 'deleteForward') {
        if (isSelection) {
            if (keepPosition) {
                const res = applyKeepPositionChange(currentValue, template, placeholder, start, end, '');
                return res;
            } else {
                const newValRaw = currentValue.slice(0, start) + currentValue.slice(end);
                const newDigits = cleanInput(newValRaw, template);
                const formatted = formatWithMask(newDigits, template, placeholder);
                return { value: formatted, cursor: start };
            }
        }

        let deleteIndex = start;
        while (deleteIndex < template.length) {
            const isTemplateLiteral = template[deleteIndex] !== 'd';
            if (isTemplateLiteral) {
                deleteIndex++;
            } else {
                break;
            }
        }

        if (deleteIndex >= currentValue.length) return null;

        if (keepPosition) {
            const pChar = placeholder && deleteIndex < placeholder.length ? placeholder[deleteIndex] : '_';
            const newVal = currentValue.substring(0, deleteIndex) + pChar + currentValue.substring(deleteIndex + 1);
            return { value: newVal, cursor: start };
        } else {
            const newValRaw = currentValue.slice(0, deleteIndex) + currentValue.slice(deleteIndex + 1);
            const newDigits = cleanInput(newValRaw, template);
            const formatted = formatWithMask(newDigits, template, placeholder);
            return { value: formatted, cursor: start };
        }
    }

    return null;
}
