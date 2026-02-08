import { render, screen, fireEvent } from '@testing-library/react';

import { describe, it, expect } from 'vitest';
import { InputNumberMask } from './InputNumberMask';
import React from 'react';

describe('InputNumberMask Form Submission', () => {
    it('submits formatted value by default', () => {
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

        const input = screen.getByRole('textbox');
        const button = screen.getByRole('button');

        // Type partial date
        fireEvent.input(input, { target: { value: '1225' } });
        // The hook (and component) relies on key/input events which fireEvent.input triggers basically
        // But for full mask behavior we might need to be careful. 
        // Our component uses the hook which updates state.

        // Wait for update? Hook updates state synchronously usually but let's check value
        expect(input).toHaveValue('12/25/');
        // Wait, default placeholder in hook is empty string if not provided, but template literals are filled?
        // Let's check '12/25' if no placeholder
        // With 'dd/dd/dddd' and input '1225', it becomes '12/25'

        // Let's type full date to be sure
        fireEvent.input(input, { target: { value: '12252025' } });
        expect(input).toHaveValue('12/25/2025');

        fireEvent.click(button);

        expect(formData).not.toBeNull();
        expect(formData!.get('date')).toBe('12/25/2025');
    });

    it('submits raw value when returnRawValue is true', () => {
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

        const input = screen.getByRole('textbox');
        const button = screen.getByRole('button');

        // Type full date
        fireEvent.input(input, { target: { value: '12252025' } });
        expect(input).toHaveValue('12/25/2025');

        fireEvent.click(button);

        expect(formData).not.toBeNull();
        expect(formData!.get('date')).toBe('12252025');
    });

    it('submits correctly via requestSubmit (native-like submission)', () => {
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

        const input = screen.getByRole('textbox');
        const form = container.querySelector('form');

        // Type full date
        fireEvent.input(input, { target: { value: '12252025' } });
        expect(input).toHaveValue('12/25/2025');

        // requestSubmit mimics native submission more closely than fireEvent.submit
        form?.requestSubmit();

        expect(formData).not.toBeNull();
        expect(formData!.get('date')).toBe('12/25/2025');
    });

    it('submits raw value via requestSubmit when returnRawValue is true', () => {
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

        const input = screen.getByRole('textbox');
        const form = container.querySelector('form');

        // Type full date
        fireEvent.input(input, { target: { value: '12252025' } });
        expect(input).toHaveValue('12/25/2025');

        form?.requestSubmit();

        expect(formData).not.toBeNull();
        expect(formData!.get('date')).toBe('12252025');

    });

});

