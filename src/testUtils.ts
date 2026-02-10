import { expect } from 'vitest';

export const getCursorPosition = (element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
};

/**
 * Types text into an input element one character at a time and verifies the cursor position
 * after each character.
 * 
 * @param user - The userEvent instance
 * @param input - The HTMLInputElement to type into
 * @param text - The text to type
 * @param expectedCursors - Array of expected cursor positions after each character
 */
export const typeAndCheckCursor = async (user: any, input: HTMLElement, text: string, expectedCursors: number[]) => {
    const isContentEditable = input.hasAttribute('contenteditable');

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (isContentEditable) {
            await user.keyboard(char);

            if (expectedCursors[i] !== undefined) {
                const currentCursor = getCursorPosition(input);
                expect(currentCursor).toBe(expectedCursors[i]);
            }

        } else {
            await user.type(input as HTMLInputElement, char);
            if (expectedCursors[i] !== undefined) {
                expect((input as HTMLInputElement).selectionStart).toBe(expectedCursors[i]);
            }
        }
    }
};
