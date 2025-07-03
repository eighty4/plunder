# Plunder - QA for webpages

Playwright automates browsers using really nifty APIs built into web browsers.

This program builds on that to automate tasks for QA testing webpages.
Thanks to Playwright, it works across all major browsers and operating systems.

## Getting started

The Plunder CLI is published to npm as
[@eighty4/plunder](https://www.npmjs.com/package/@eighty4/plunder)
and its API is published as
[@eighty4/plunder-core](https://www.npmjs.com/package/@eighty4/plunder-core).

```bash
# run directly from npm
npx @eighty4/plunder -h

# install globally and run
npm i -g @eighty4/plunder@latest
plunder -h
```

## CSS media query QA

Pludering webpages with `--css-breakpoints` will use
[LightningCSS](https://lightningcss.dev/) to capture screenshots on a
CSS breakpoint and 1px outside of a CSS breakpoint.

```bash
plunder --css-breakpoints --out-dir www_qa https://alistapart.com
```

Let's go back to the [LightningCSS website](https://lightningcss.dev/) again
and appreciate those neon light effects!

## Device emulation QA

Plunder takes screenshots of a webpage as they would look on phones,
tablets or varying pixel density desktops.

### Testing across modern devices

Capture screenshots emulating a curated selection of modern phones and tablets
with `--modern-devices`:

```bash
plunder --modern-devices --out-dir www_qa https://alistapart.com
```

### Selecting devices with `--device` queries

Device presets are available that can be added with `--device` or `-d`.
This flag is a search param, so `-d ipad` will match all modern iPad devices.

```bash
# emulate ipad and iphone devices
plunder --device ipad --device iphone --out-dir www_qa  https://alistapart.com

# emulate high pixel density
plunder --device hidpi --out-dir www_qa https://alistapart.com
```

### Listing devices

```bash
# list modern devices used with --modern-devices flag
plunder devices

# see result of an explicit device query
plunder -d hidpi devices

# see exhustive list of queryable devices
plunder -a devices
```

## Webpage liveness and healthcheck QA

### Checking a webpage's anchor tags

```bash
plunder links https://alistapart.com
```

## Contributing

pnpm and Node >23 are required for development.

Plunder embraces Node's TypeScript support and uses TypeScript without
compiling for development workflows. Node 23 will emit warnings about
experimental type stripping support. Upgrading to Node 24 will help.

### Upgrading to Node 24 with `nvm`

```
nvm install 24
nvm use 24
npm i -g pnpm
```

[Or get Node.js from the source](https://nodejs.org/en/download/current).

### Build and run CLI

```bash
pnpm i
pnpm --filter \!@eighty4/plunder-webapp build
node cli/lib/plunder.js -h
```

### Webapp development

Plunder out directories will have a web report written to the out directory's
root. The web report is built with React and Vite and distributed with the CLI
package `@eighty4/plunder`.

The [webapp package's README.md](./webapp/README.md) has details on running
the Vite app.

### CICD checks

The `ci_verify.sh` script runs through all the CICD checks done on GitHub Actions:

```bash
./ci_verify.sh
```

The script has flags to symlink the `ci_verify.sh` as git hooks.

```bash
./ci_verify.sh --on-git-commit
./ci_verify.sh --on-git-push
```
