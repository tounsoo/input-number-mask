# Feature map

One file per user-facing feature. Each says how a person reaches it, how to drive it, and what end state proves it. Story ids open in Storybook at `http://localhost:6006/?path=/story/<id>`.

| Feature | File | Drive |
| --- | --- | --- |
| Masked typing and deleting in an `<input>` | [input-mask.md](input-mask.md) | consumer smoke, stories |
| Keep-position deleting | [keep-position.md](keep-position.md) | stories, unit tests |
| Contenteditable mask | [contenteditable.md](contenteditable.md) | stories, unit tests |
| Form submission and raw values | [form-values.md](form-values.md) | consumer smoke, stories |

When a feature is added or changes, update its file in the same pull request.
