# Plunder - QA for webpages

Playwright automates browsers using really nifty APIs built into web browsers.

This library and CLI builds on that to automate tasks for QA testing webpages.
Thanks to Playwright, it works across all major browsers and operating systems.

## Getting started

```bash
# run directly from npm
npx @eighty4/plunder -h

# install to path and run
npm i -g @eighty4/plunder@latest
plunder -h
```

## Layout and media query QA

Plunder will take screenshots of a webpage as they would look on phones, tablets
or varying pixel density desktops.

Additionally every CSS media query will add a screenshot breakpoint where
a screenshot will be taken one pixel before and after the breakpoint.

```bash
plunder --out-dir www_qa https://alistapart.com
```

You can reuse the `--out-dir` path for QAing multiple sites and pages
because webpage data will be isolated by website host and webpage path.

By default, Plunder will emulate a variety of modern phones and tablets.

### Emphasis on a device

Device presets are available that can be added with `--device` or `-d`.
This flag is a search param, so `-d ipad` will match all modern iPad devices.

```bash
# emulate ipad and iphone devices
plunder -o www_qa -d ipad -d iphone https://alistapart.com

# emulate high pixel density
plunder -o www_qa -d hidpi https://alistapart.com
```

### List devices

```bash
# list modern devices used by default
plunder devices

# see result of an explicit device queries
plunder -d hidpi devices

# an exhustive list of queryable devices
plunder -a devices
```

## Webpage liveness and healthcheck QA

### Checking a webpage's anchor tags

```bash
plunder links https://alistapart.com
```

## Contributing

pnpm and Node 23 are required for development.

### Build and run from a fresh checkout

```bash
pnpm i
pnpm -r build && node cli/lib/plunder.js -h
```

### Web report development

The web report is built with Vite and added to a Plunder capture's output directory by the CLI program.
The webapp opens images from the file system via relative paths.

For this to work with Vite's development server running on localhost, the Vite server will bootstrap the app and proxy HTTP requests for screenshots to a Plunder capture's out directory.

This command can be used for rebuilding and running Plunder with the default location for Vite to bootstrap the dev server:

```bash
rm -rf webapp/.plunder && pnpm -r build && node cli/lib/plunder.js -o webapp/.plunder https://alistapart.com --device "iPad Mini"
cd webapp && pnpm dev
```

Bootstrapping happens on startup of the app, so run `pnpm dev` anytime you update the Plunder capture's out directory.

To override the default `.plunder` path, use `PLUNDER_OUT_DIR` env var (this is relative to `vite.config.js`):

```bash
plunder -o zztop https://zztop.com --device "iPad Mini"
PLUNDER_OUT_DIR=../zztop pnpm dev
```

### CICD checks

The `ci_verify.sh` script runs through all the CICD checks done on GitHub Actions:

```bash
./ci_verify.sh
```
