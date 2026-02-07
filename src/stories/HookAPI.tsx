import type { UseInputNumberMaskProps, UseInputNumberMaskReturn } from '../useInputNumberMask';

/**
 * dummy component to expose hook options to Storybook ArgTypes
 */
export const HookOptions = ({
    template: _template,
    placeholder: _placeholder,
    keepPosition: _keepPosition = false
}: UseInputNumberMaskProps) => null;

/**
 * dummy component to expose hook return values to Storybook ArgTypes
 */
export const HookReturn = (_props: UseInputNumberMaskReturn) => null;
