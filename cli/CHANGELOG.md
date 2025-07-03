# Changelog

## [Unreleased]

### Added

- Screenshot capture will start an HTTP server to view web report from
  `--out-dir` at port 7979 or configured with `--booty-port`

## [v0.0.7] - 2025-07-03

### Added

- Screenshot capture and link checking will prompt user before starting
  Playwright browser downloads

### Fixed

- `plunder devices --all` does not show duplicate entries for landscape mode

## [v0.0.6] - 2025-06-12

- `plunder.json` capture manifests and webapp interace merge CSS breakpoints from all media qeueries

## [v0.0.5] - 2025-05-29

- CLI plunder removes default plundering parameters in favor of opting in for CSS parsing and devices
- CLI updates progress of CSS parsing and screenshot capture
- CLI command `devices` lists device labels
- CLI command `links` checks anchor tags HREFs
- CLI creates a web report to view captured screenshots

## [v0.0.4] - 2025-02-10

- device emulation screenshot capturing for phones and tablets
- collecting recursive links rewrites relative hrefs over document's base href

## [v0.0.3] - 2025-02-06

- write webpage screenshot capture manifest to output directory
- FIX closing browser context after capturing webpage screenshots

## [v0.0.2] - 2025-02-05

- FIX running package as executable program

## [v0.0.1] - 2025-02-05

- capture screenshots of webpages at CSS media query page widths

[Unreleased]: https://github.com/eighty4/plunder/compare/cli-v0.0.7...HEAD
[v0.0.7]: https://github.com/eighty4/plunder/compare/cli-v0.0.6...cli-v0.0.7
[v0.0.6]: https://github.com/eighty4/plunder/compare/cli-v0.0.5...cli-v0.0.6
[v0.0.5]: https://github.com/eighty4/plunder/compare/cli-v0.0.4...cli-v0.0.5
[v0.0.4]: https://github.com/eighty4/plunder/compare/cli-v0.0.3...cli-v0.0.4
[v0.0.3]: https://github.com/eighty4/plunder/compare/cli-v0.0.2...cli-v0.0.3
[v0.0.2]: https://github.com/eighty4/plunder/compare/cli-v0.0.1...cli-v0.0.2
[v0.0.1]: https://github.com/eighty4/plunder/releases/tag/cli-v0.0.1
