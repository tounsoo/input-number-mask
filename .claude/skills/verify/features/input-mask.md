# Masked typing and deleting in an input

`InputNumberMask` and `useInputNumberMask` format digits into a `template`, where each `d` is a digit slot and every other character is a literal: `(ddd) ddd-dddd` turns `5551234567` into `(555) 123-4567`. Non-digits are dropped, and the caret skips literals.

## Sub-features

- Typing fills slots left to right and inserts the literals.
- Backspace and Delete remove a digit and shift the rest left.
- `placeholder` fills empty slots, as in `mm/dd/yyyy`.
- Controlled (`value` + `onValueChange`) and uncontrolled (`defaultValue`) use.

## How to get to it (user POV)

A consumer renders `<InputNumberMask template="(ddd) ddd-dddd" />`, or calls `useInputNumberMask({ template })` and puts the returned `ref` and `value` on their own `<input>`. A person clicks the field and types.

## Driving it with the harness

- Consumer smoke: `node .claude/skills/verify/consumer-smoke.mjs` types `5551234567` into the packed component and `12252026` into the packed hook, and presses Backspace once.
- Stories: `component-inputnumbermask--basic`, `--date-format`, `--credit-card`, `--with-placeholder`, `--controlled`, `--uncontrolled-default-value`; `hook-useinputnumbermask--phone-number`, `--date-input`, `--with-external-state`. `pnpm test` runs their play functions.

## Gotchas

- `type="number"` breaks the mask, because `setSelectionRange` throws on number inputs.
- An empty field still shows the template's leading literals, or the whole placeholder, so its value is never `''`.
- jsdom doesn't lay out text, so caret position checks in jsdom only prove the selection numbers, not what a person sees.
