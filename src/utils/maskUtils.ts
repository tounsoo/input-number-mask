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
