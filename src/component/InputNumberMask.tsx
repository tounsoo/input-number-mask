import React, { forwardRef, useEffect, useState } from 'react';
import { useInputNumberMask } from '../hook/useInputNumberMask';
import { cleanInput, formatWithMask } from '../utils/maskUtils';
import tokens from './styles.json';

// Hoisted: static base styles computed once at module level
const t = tokens.input;
const baseStyles = `
    .input-number-mask {
        font-family: ${t.fontFamily.$value};
        padding: ${t.padding.block.$value} ${t.padding.inline.$value};
        border: ${t.border.width.$value} ${t.border.style.$value} ${t.border.color.$value};
        border-radius: ${t.border.radius.$value};
        outline: none;
        cursor: text;
    }
    .input-number-mask:focus {
        border-color: ${t.focus.borderColor.$value};
        box-shadow: 0 0 0 ${t.focus.ringWidth.$value} ${t.focus.ringColor.$value};
    }
`;

export interface InputNumberMaskProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue'> {
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
     * If true, the `onValueChange` callback will receive the raw unmasked value.
     * If false, it receives the formatted value.
     * @default false
     */
    returnRawValue?: boolean;

    /**
     * Initial value for uncontrolled usage.
     */
    defaultValue?: string;

    /**
     * Controlled value.
     */
    value?: string;

    /**
     * Callback with the input value.
     */
    onValueChange?: (value: string) => void;
}

export const InputNumberMask = forwardRef<HTMLInputElement, InputNumberMaskProps>(
    ({
        template,
        placeholder,
        keepPosition,
        returnRawValue = false,
        onValueChange,
        value: controlledValue,
        defaultValue,
        onChange,
        ...props
    }, ref) => {

        // Determine if we're in controlled mode
        const isControlled = controlledValue !== undefined;

        // Internal state for uncontrolled mode
        const [internalValue, setInternalValue] = useState(() => {
            if (defaultValue !== undefined) {
                const digits = cleanInput(defaultValue, template);
                return formatWithMask(digits, template, placeholder);
            }
            return formatWithMask('', template, placeholder);
        });

        // The value to pass to the hook - controlled or internal
        const valueForHook = isControlled ? controlledValue : internalValue;

        const { ref: maskRef, value: maskValue } = useInputNumberMask({
            template,
            placeholder,
            keepPosition,
            value: valueForHook,
            onValueChange: (val) => {
                // Update internal state for uncontrolled mode
                if (!isControlled) {
                    setInternalValue(val);
                }
                const raw = cleanInput(val, template);
                onValueChange?.(returnRawValue ? raw : val);
            }
        });

        // Sync external ref if provided
        useEffect(() => {
            if (typeof ref === 'function') {
                ref(maskRef.current);
            } else if (ref) {
                ref.current = maskRef.current;
            }
        }, [maskRef, ref]);

        const rawValue = cleanInput(maskValue, template);
        const visibleInputName = returnRawValue && props.name ? undefined : props.name;

        return (
            <>
                <style>{baseStyles}</style>
                <input
                    {...props}
                    className={`input-number-mask ${props.className || ''}`}
                    name={visibleInputName}
                    ref={maskRef}
                    value={maskValue}
                    onChange={(e) => {
                        onChange?.(e);
                    }}
                />
                {returnRawValue && props.name && (
                    <input type="hidden" name={props.name} value={rawValue} />
                )}
            </>
        );
    }
);

InputNumberMask.displayName = 'InputNumberMask';

