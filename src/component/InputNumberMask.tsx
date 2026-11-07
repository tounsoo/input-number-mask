import { useCallback, useState, type InputHTMLAttributes, type Ref } from 'react';
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

export interface InputNumberMaskCoreProps {
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
     * Initial value for uncontrolled usage, formatted or digits only.
     */
    defaultValue?: string;

    /**
     * Controlled value, formatted or digits only. Pair it with `onValueChange`.
     */
    value?: string;

    /**
     * Called when the user changes the value, with the formatted value, or the
     * digits only when `returnRawValue` is true.
     */
    onValueChange?: (value: string) => void;

    /**
     * If true, an empty field shows the template's literals and `placeholder`
     * as its value (for example `(___) ___-____`).
     *
     * If false, the field stays empty until the first digit and `placeholder` is
     * also passed to the input as its native placeholder. Native `required`
     * validation, `:placeholder-shown` and screen readers then treat the field as
     * empty, and an empty field submits `""`.
     * @default true
     */
    showMaskWhenEmpty?: boolean;
}
export interface InputNumberMaskProps extends InputNumberMaskCoreProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'placeholder' | 'onChange' | 'onInput' | 'dangerouslySetInnerHTML' | 'inputMode'> {
    /**
     * The virtual keyboard mobile browsers show. The mask accepts digits only,
     * so it defaults to the numeric keypad. Pass `"tel"` for phone masks if you
     * want the phone keypad, or any other value to override it.
     * @default "numeric"
     */
    inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
}

export const InputNumberMask = ({
    template,
    placeholder,
    keepPosition,
    returnRawValue = false,
    onValueChange,
    value: controlledValue,
    defaultValue,
    inputMode = 'numeric',
    showMaskWhenEmpty = true,
    className,
    ref, // onChange was here
    ...props
}: InputNumberMaskProps & { ref?: Ref<HTMLInputElement> }) => {

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
        showMaskWhenEmpty,
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

    // Point both the hook's ref and the caller's ref at the input, and clear them on unmount.
    const mergedRef = useCallback((node: HTMLInputElement | null) => {
        maskRef.current = node;
        const cleanup = typeof ref === 'function' ? ref(node) : undefined;
        if (ref && typeof ref === 'object') ref.current = node;
        return () => {
            maskRef.current = null;
            if (typeof cleanup === 'function') cleanup();
            else if (typeof ref === 'function') ref(null);
            else if (ref) ref.current = null;
        };
    }, [maskRef, ref]);

    const rawValue = cleanInput(maskValue, template);
    const visibleInputName = returnRawValue && props.name ? undefined : props.name;

    return (
        <>
            {/* React 19 hoists this to <head> once, however many inputs render. */}
            <style href="input-number-mask" precedence="default">{baseStyles}</style>
            <input
                {...props}
                inputMode={inputMode}
                placeholder={showMaskWhenEmpty ? undefined : placeholder}
                className={className ? `input-number-mask ${className}` : 'input-number-mask'}
                name={visibleInputName}
                ref={mergedRef}
                value={maskValue}
                onChange={() => { }}
            />
            {returnRawValue && props.name && (
                <input type="hidden" name={props.name} value={rawValue} />
            )}
        </>
    );
};

InputNumberMask.displayName = 'InputNumberMask';

