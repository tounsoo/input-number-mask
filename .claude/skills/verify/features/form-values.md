# Form submission and raw values

The masked value reaches the app two ways: `onValueChange` (formatted, or the bare digits with `returnRawValue`), and the form data when the field has a `name` and sits in a `<form>`.

## Sub-features

- `onValueChange` with and without `returnRawValue`.
- `rawValue` from `useInputNumberMask`.
- Native form submission and a React-controlled form.

## How to get to it (user POV)

A consumer passes `onValueChange`, `returnRawValue` or `name`, then reads the callback or submits the form. A person types and presses Submit.

## Driving it with the harness

- Consumer smoke: checks that `onValueChange` gets `5551234567` with `returnRawValue`, and that the hook's `rawValue` is `12252026`.
- Stories: `component-inputnumbermask--return-raw-value`, `--native-form-submission`, `--react-controlled-form`, `component-inputnumbermaskcontenteditable--form-submission`, `hook-useinputnumbermask--on-value-change-callback`.
- Unit tests: `src/component/__tests__/InputNumberMask.form.test.tsx`.

## Gotchas

- Without `returnRawValue`, an empty field submits the template's literals or the whole placeholder, not `''`.
