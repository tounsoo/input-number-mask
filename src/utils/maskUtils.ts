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
