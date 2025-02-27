#!/usr/bin/env node

import nopt from 'nopt'
import ansi from './ansi.ts'
import { captureScreenshotsCommand } from './capture.ts'
import { DEVICES_CMD_NAME, devicesPrintCommand } from './devices.ts'
import { errorPrint } from './error.ts'
import { linkCheckingCommand, LINKS_CMD_NAME } from './links.ts'

const knownOpts = {
    all: Boolean,
    browser: ['chromium', 'firefox', 'webkit'],
    device: [Array, String],
    devices: Boolean,
    'not-headless': Boolean,
    help: Boolean,
    out: String,
    'out-dir': String,
    'out-file': String,
    recursive: Boolean,
}

const shortHands = {
    a: ['--all'],
    b: ['--browser'],
    d: ['--device'],
    h: ['--help'],
    o: ['--out'],
    r: ['--recursive'],
}

nopt.invalidHandler = function (
    key: string,
    value: string,
    _type: any,
    data: Record<string, any>,
) {
    if (data.help) {
        helpPrint()
    } else {
        errorPrint(`--${key} ${value} is an invalid value`, true)
    }
}

nopt.unknownHandler = function (key: string) {
    errorPrint(`--${key} is an unknown option`, true)
}

const parsed = nopt(knownOpts, shortHands)

if (parsed.help) {
    helpPrint()
} else if (parsed.argv.remain.includes(DEVICES_CMD_NAME)) {
    devicesPrintCommand(
        parsed.all ? 'all' : parsed.device?.length ? parsed.device : undefined,
    )
} else if (parsed.argv.remain.includes(LINKS_CMD_NAME)) {
    await linkCheckingCommand({
        outputFile: parsed['out'] || parsed['out-file'],
        urls: parsed.argv.remain.filter(remain => remain !== LINKS_CMD_NAME),
    })
} else {
    await captureScreenshotsCommand({
        browser: parsed['browser'] ?? 'chromium',
        devices:
            parsed['devices'] === false
                ? false
                : parsed['device']?.length
                  ? parsed['device']
                  : true,
        outDir: parsed['out'] || parsed['out-dir'],
        headless: parsed['not-headless'] !== true,
        recursive: parsed['recursive'] === true,
        urls: parsed.argv.remain,
    })
}

function helpPrint() {
    console.log(`Plunders CSS and HTML for website QA.

${ansi.bold(ansi.underline('Usage:'))}

  Plunder CSS and output screenshots around media query breakpoints.

    ${ansi.bold('plunder')} [OPTIONS] URL...

  Plunder emulated devices and list modern defaults, all available or use -d to see device query matches.

    ${ansi.bold('plunder')} [-a, --all] [-d, --device <DEVICE>] ${ansi.bold('devices')}

  Plunder HTML and check all anchor tag HREFs for broken links.

    ${ansi.bold('plunder')} [-o, --out-file <OUT_FILE>] ${ansi.bold('links')} URL...

${ansi.bold(ansi.underline('Options:'))}
  ${ansi.bold('-b')}, ${ansi.bold('--browser')} <BROWSER>    Browser engine [values: chromium (default) | firefox | webkit]
  ${ansi.bold('-d')}, ${ansi.bold('--device')} <DEVICE>      Device name patterns to use for screenshot capturing
      ${ansi.bold('--no-devices')}           Excludes device emulation for screenshot capturing [defaults to false]
      ${ansi.bold('--not-headless')}         Launch browser as a headless process [defaults to false]
  ${ansi.bold('-o')}, ${ansi.bold('--out-dir')} <OUT_DIR>    Output directory for screenshot capture [required]
  ${ansi.bold('-r')}, ${ansi.bold('--recursive')}            Recursively plunders links to pages on same domain [defaults to false]
  ${ansi.bold('-h')}, ${ansi.bold('--help')}                 Print help`)
    process.exit(0)
}
