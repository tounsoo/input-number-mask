import type { UseInputNumberMaskProps, UseInputNumberMaskReturn } from '../hook/useInputNumberMask';
import type { UseContentEditableMaskProps, UseContentEditableMaskReturn } from '../hook/useContentEditableMask';
import type { InputNumberMaskProps } from '../component/InputNumberMask';
import type { InputNumberMaskContentEditableProps } from '../component/InputNumberMaskContentEditable';

/**
 * dummy components to expose hook options to Storybook ArgTypes
 */
export const HookOptions = (_props: UseInputNumberMaskProps) => { void _props; return null; };
export const HookReturn = (_props: UseInputNumberMaskReturn) => { void _props; return null; };

export const ContentEditableHookOptions = (_props: UseContentEditableMaskProps) => { void _props; return null; };
export const ContentEditableHookReturn = (_props: UseContentEditableMaskReturn) => { void _props; return null; };

/**
 * dummy components to expose component props to Storybook ArgTypes
 */
export const ComponentProps = (_props: InputNumberMaskProps) => { void _props; return null; };
export const ContentEditableComponentProps = (_props: InputNumberMaskContentEditableProps) => { void _props; return null; };
