# Keep-position deleting

With `keepPosition`, deleting a digit puts the placeholder character back in its slot instead of shifting later digits left, so a date like `12/25/2026` keeps its month and year when the day is deleted.

## Sub-features

- Backspace and Delete in the middle of a value leave the other digits in place.
- Typing into an emptied slot fills it without moving the rest.

## How to get to it (user POV)

A consumer passes `keepPosition` (and usually a `placeholder`) to `InputNumberMask`, `InputNumberMaskContentEditable` or either hook. A person deletes a digit in the middle of the value.

## Driving it with the harness

- Stories: `component-inputnumbermask--keep-position`, `component-inputnumbermaskcontenteditable--keep-position`, `hook-useinputnumbermask--keep-position-mode`. `pnpm test` runs their play functions.
- Unit tests: `src/component/__tests__/*.keepPosition.test.tsx` and `src/utils/__tests__/applyKeepPositionChange.test.ts`.

## Gotchas

- The consumer smoke run doesn't cover this yet. Add a check there when the behavior changes.
