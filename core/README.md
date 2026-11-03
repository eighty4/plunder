# `@eighty4/plunder-core`

Webpage QA tooling built on [Playwright](https://playwright.dev).

This library is the backend of the `@eighty4/plunder` program:

```bash
npm i -g @eighty4/plunder

plunder -h

plunder links https://eighty4.tech

plunder --css-breakpoints --out-dir www_qa https://eighty4.tech
```

## Dependent disclaimer

While it is maintaned with care and all changes are logged in its
[CHANGELOG.md](./CHANGELOG.md), APIs are tied to development of the CLI and
are subject to breaking or removal.

## Exports are `lib/api.ts` & `lib/api.web.ts`

The APIs of this pacakge are exported from `lib/api.ts`.

A variant of exports that are web-compatible APIs are available from
`lib/api.web.ts` via the module path `@eighty4/plunder-core/web`.
