import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { InputNumberMask } from '../InputNumberMask';
import React from 'react';
import { typeAndCheckCursor } from '../../testUtils';

describe('InputNumberMask Form Submission', () => {
    it('submits formatted value by default', async () => {
        const user = userEvent.setup();
        let formData: FormData | null = null;
        const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            formData = new FormData(e.currentTarget);
        };

        render(
            <form onSubmit={handleSubmit} role="form">
                <InputNumberMask template="dd/dd/dddd" name="date" />
                <button type="submit">Submit</button>
            </form>
        );

        const input = screen.getByRole('textbox') as HTMLInputElement;
        const button = screen.getByRole('button');

        // Type partial date '1225' -> '12/25/'
        await typeAndCheckCursor(user, input, '1225', [1, 3, 4, 6]);
        expect(input).toHaveValue('12/25/');

        // Type remaining '2025' -> '12/25/2025'
        // Cursor at 6.
        // '2' -> '12/25/2' (7)
        // '0' -> '12/25/20' (8)
        // '2' -> '12/25/202' (9)
        // '5' -> '12/25/2025' (10)
        await typeAndCheckCursor(user, input, '2025', [7, 8, 9, 10]);
        expect(input).toHaveValue('12/25/2025');

        await user.click(button);

        expect(formData).not.toBeNull();
        expect(formData!.get('date')).toBe('12/25/2025');
    });

    it('submits raw value when returnRawValue is true', async () => {
        const user = userEvent.setup();
        let formData: FormData | null = null;
        const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            formData = new FormData(e.currentTarget);
        };

        render(
            <form onSubmit={handleSubmit} role="form">
                <InputNumberMask
                    template="dd/dd/dddd"
                    name="date"
                    returnRawValue={true}
                />
                <button type="submit">Submit</button>
            </form>
        );

        const input = screen.getByRole('textbox') as HTMLInputElement;
        const button = screen.getByRole('button');

        // Type full date '12252025'
        await typeAndCheckCursor(user, input, '12252025', [1, 3, 4, 6, 7, 8, 9, 10]);
        expect(input).toHaveValue('12/25/2025');

        await user.click(button);

        expect(formData).not.toBeNull();
        expect(formData!.get('date')).toBe('12252025');
    });

    it('submits correctly via requestSubmit (native-like submission)', async () => {
        const user = userEvent.setup();
        let formData: FormData | null = null;
        const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            formData = new FormData(e.currentTarget);
        };

        const { container } = render(
            <form onSubmit={handleSubmit} role="form">
                <InputNumberMask template="dd/dd/dddd" name="date" />
            </form>
        );

        const input = screen.getByRole('textbox') as HTMLInputElement;
        const form = container.querySelector('form');

        // Type full date
        await typeAndCheckCursor(user, input, '12252025', [1, 3, 4, 6, 7, 8, 9, 10]);
        expect(input).toHaveValue('12/25/2025');

        // requestSubmit mimics native submission more closely than fireEvent.submit
        form?.requestSubmit();

        expect(formData).not.toBeNull();
        expect(formData!.get('date')).toBe('12/25/2025');
    });

    it('submits raw value via requestSubmit when returnRawValue is true', async () => {
        const user = userEvent.setup();
        let formData: FormData | null = null;
        const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            formData = new FormData(e.currentTarget);
        };

        const { container } = render(
            <form onSubmit={handleSubmit} role="form">
                <InputNumberMask
                    template="dd/dd/dddd"
                    name="date"
                    returnRawValue={true}
                />
            </form>
        );

        const input = screen.getByRole('textbox') as HTMLInputElement;
        const form = container.querySelector('form');

        // Type full date
        await typeAndCheckCursor(user, input, '12252025', [1, 3, 4, 6, 7, 8, 9, 10]);
        expect(input).toHaveValue('12/25/2025');

        form?.requestSubmit();

        expect(formData).not.toBeNull();
        expect(formData!.get('date')).toBe('12252025');

    });

});

