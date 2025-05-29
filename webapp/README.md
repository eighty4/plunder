# @eighty4/plunder-webapp

This webapp runs in two modes, triggered by a global `window.plunder.mode`
value with either `active` or `result` values. The project's `vite.config.ts`
starts HTTP servers and provides proxying for the HTTP requests required for
both modes.

## How production works

This package is built as a single html file and published to npm as the
`webapp` subdirectory of the
[`@eighty4/plunder`](https://www.npmjs.com/package/@eighty4/plunder?activeTab=code)
package (in dir `../cli`).

`active` mode is launched by an HTTP server started by the Plunder CLI and uses
a WebSocket API for requesting and receiving page screenshots from the Plunder
process.

In `result` mode, the webapp is copied to a Plundering's out directory with
the capture manifest JSON files written into `<script>` tags. The app is
launched from the local filesystem and resolves images from the out directory.

## `active` mode development

Vite config will launch the WebSocket API when starting `vite dev`
with `PLUNDER_MODE=active`.

This will be the default mode if `PLUNDER_MODE` is not set or there is no
Plunder out directory at `.plunder` or pointed to be `PLUNDER_OUT_DIR`.

## `result` mode development

For `result` mode to work over `http://` instead of `file://` when developing
with Vite, `vite.config.ts` starts an HTTP server and proxies requests for
screenshots referenced in the capture manifests.

`result` mode will be the default mode for `vite dev` if a `.plunder` directory
is present or `PLUNDER_OUT_DIR` points to an existing directory.

These commands will build the project's CLI packages, create a Plunder out
directory, and start the webapp:

```bash
# from repo root, build the core and cli packages
pnpm --filter \!@eighty4/plunder-webapp build

# run plunder to capture screenshots on css breakpoints
node cli/lib/plunder.js -o webapp/.plunder https://alistapart.com --css-breakpoints

# start vite in the webapp dir
cd webapp
pnpm dev

# explicitly start vite with mode and out dir env vars
PLUNDER_MODE=result PLUNDER_OUT_DIR=.plunder pnpm dev
```

Reading the out directory's capture manifests happens when starting dev mode,
so run `pnpm dev` anytime you update the Plunder capture's out directory.

`PLUNDER_OUT_DIR` must be relative to the `vite.config.ts` file:

```bash
plunder -o zztop https://zztop.com --css-breakpoints
cd webapp
PLUNDER_OUT_DIR=../zztop pnpm dev
```

## Playwright e2e tests

Playwright is configured to run multiple Vite instances to test Plunder in
different configurations:

| address        | mode   | description |
| -------------- | ------ | ----------- |
| localhost:7979 | result | 2 websites  |
| localhost:7900 | result | 1 website   |
| localhost:7009 | active |             |

See `playwright.config.ts` for the configurations of each Vite server.

`create-test-reports.sh` will create the required out directories in
`.playwright/plunder` for the e2e tests to pass.

```bash
# run multiple plunder captures
./create-test-reports.sh

# start Vite servers and run tests
pnpm test:e2e

# run tests with the Playwright UI
pnpm test:e2e --ui

# run tests with a visible browser
pnpm test:e2e --headed
```
