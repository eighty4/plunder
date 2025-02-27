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

### CICD checks

The `ci_verify.sh` script runs through all the CICD checks done on GitHub Actions:

```bash
./ci_verify.sh
```
