---
"@tounsoo/input-number-mask": patch
---

Ship TypeScript declarations again. 1.2.0 was published without any `.d.ts` files, because the library build cleared tsc's output before packing. The package now includes bundled `dist/index.d.ts` for `import` and `dist/index.d.cts` for `require`, and both CI and the publish step now check the packed output with publint, arethetypeswrong and an export check, so the types can't go missing again.
