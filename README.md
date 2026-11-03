# Plunder - QA for webpages

Playwright automates browsers using really
[nifty APIs](https://chromedevtools.github.io/devtools-protocol/)
built into web browsers.

This program builds on Playwright to automate tasks for QA testing webpages.
Thanks to Playwright, it works across all major browsers and operating systems.

## Getting started

The Plunder CLI is published to npm as
[@eighty4/plunder](https://www.npmjs.com/package/@eighty4/plunder).

```bash
npm i -g @eighty4/plunder

plunder -h
```

## CSS media query QA

Pludering webpages with `--css-breakpoints` will use
[LightningCSS](https://lightningcss.dev/) to capture screenshots on a
CSS breakpoint and 1px outside of a CSS breakpoint.

```bash
plunder --css-breakpoints --out-dir www_qa https://alistapart.com
```

Let's revisit the [LightningCSS website](https://lightningcss.dev/)
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

Guides for development are in [docs/CONTRIBUTING.md](/docs/CONTRIBUTING.md).
