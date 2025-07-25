# Changelog

## [Unreleased]

- ???

## [v0.0.6] - 2025-07-03

### Added

- `resolveDevices` export returns device definitions resolved
  from a `CaptureScreenshotsOptions`
- `DeviceDefinition` includes a `BrowserEngine` field for the
  device's native browser
- `checkPlaywrightBrowserDistributions` checks if Playwright browser
  distributions are installed
- `lib/api.web.ts` export entrypoint for web bundling package consumers

### Fixed

- `captureScreenshots` uses an emulated device's native browser engine
  for screenshot capture
- `getSupportedDeviceLabels` filters out duplicate output from
  device configurations that support portrait and landscape modes

## [v0.0.5] - 2025-06-12

- CSS breakpoints are merged from all media queries

## [v0.0.4] - 2025-05-29

- CSS media query data structure includes code location and excerpt
- progress update callback on capture API options
- API for querying supported devices
- fix href parsing for URLs with query strings
- API for parsing a page's anchor HREFs and checking HTTP statuses

## [v0.0.3] - 2025-02-10

- device emulation screenshot capturing for phones and tablets
- collecting recursive links rewrites relative hrefs over document's base href

## [v0.0.2] - 2025-02-06

- write webpage screenshot capture manifest to output directory
- FIX closing browser context after capturing webpage screenshots

## [v0.0.1] - 2025-02-05

- capture screenshots of webpages at CSS media query page widths

[Unreleased]: https://github.com/eighty4/plunder/compare/core-v0.0.6...HEAD
[v0.0.6]: https://github.com/eighty4/plunder/compare/core-v0.0.5...core-v0.0.6
[v0.0.5]: https://github.com/eighty4/plunder/compare/core-v0.0.4...core-v0.0.5
[v0.0.4]: https://github.com/eighty4/plunder/compare/core-v0.0.3...core-v0.0.4
[v0.0.3]: https://github.com/eighty4/plunder/compare/core-v0.0.2...core-v0.0.3
[v0.0.2]: https://github.com/eighty4/plunder/compare/core-v0.0.1...core-v0.0.2
[v0.0.1]: https://github.com/eighty4/plunder/releases/tag/core-v0.0.1
