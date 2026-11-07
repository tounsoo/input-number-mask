# Contenteditable mask

`InputNumberMaskContentEditable` and `useContentEditableMask` apply the same mask to an element with `contenteditable`, so a masked value can sit inline in rich text, with the empty slots drawn in a placeholder color.

## Sub-features

- Typing and deleting through `beforeinput`.
- Paste: plain text from the clipboard is cleaned to digits.
- Custom placeholder color, controlled use, and switching the template at run time.
- A hidden input carries the value into a form.

## How to get to it (user POV)

A consumer renders `<InputNumberMaskContentEditable template="dd/dd/dddd" />`, or puts the hook's `ref` on their own element. A person clicks into it and types or pastes.

## Driving it with the harness

- Stories: `component-inputnumbermaskcontenteditable--default`, `--keep-position`, `--controlled`, `--form-submission`, `--rich-text-document`, `--dynamic-template-switcher`; `hook-usecontenteditablemask--default`, `--custom-date`. `pnpm test` runs their play functions in Chromium.
- Unit tests: `src/component/__tests__/InputNumberMaskContentEditable*.test.tsx` and `src/hook/__tests__/useContentEditableMask*.test.ts*`.

## Gotchas

- jsdom has no real editing or CSS Custom Highlight API, so the unit tests stub them (`src/testUtils.ts`). Only Chromium proves what a person sees.
- No play function pastes yet. Check a paste change by hand in `pnpm storybook`.
- The consumer smoke run doesn't drive this component.
