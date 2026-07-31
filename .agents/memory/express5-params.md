---
name: Express 5 middleware params type fix
description: req.params values typed as string | string[] when route uses inline adminOnly middleware, causing TS2345 errors with parseInt.
---

When you add `adminOnly` (or any async middleware) inline on a parameterized route:
```ts
router.put("/packages/:id", adminOnly, async (req, res) => {
  const id = parseInt(req.params.id);  // TS error: string | string[]
```
TypeScript infers `req.params[key]` as `string | string[]` for routes with inline middleware chaining.

**Fix:** Wrap with `String()`:
```ts
const id = parseInt(String(req.params.id));
```

**Why:** Express 5 strict types expose a stricter `ParamsDictionary` when middleware is chained inline vs `router.use()` prefix pattern.

**How to apply:** Any time you add `adminOnly` or similar middleware inline on a `/:id` parameterized route, cast params with `String()`.
