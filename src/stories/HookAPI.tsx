import type { UseInputNumberMaskProps } from '../hook/useInputNumberMask';
import type { InputNumberMaskProps } from '../component/InputNumberMask';

/**
 * dummy component to expose hook options to Storybook ArgTypes
 */
export const HookOptions = (_props: UseInputNumberMaskProps) => { void _props; return null; };

/**
 * dummy component to expose hook return values to Storybook ArgTypes
 */
export const HookReturn = () => null;

/**
 * dummy component to expose component props to Storybook ArgTypes
 */
export const ComponentProps = (_props: InputNumberMaskProps) => { void _props; return null; };
