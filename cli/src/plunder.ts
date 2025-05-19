#!/usr/bin/env node

import nopt from 'nopt'
import ansi from './ansi.ts'
import { captureScreenshotsCommand } from './capture.ts'
import { DEVICES_CMD_NAME, devicesPrintCommand } from './devices.ts'
import { errorPrint } from './error.ts'
import { linkCheckingCommand, LINKS_CMD_NAME } from './links.ts'

const knownOpts = {
    all: Boolean,
    ['css-breakpoints']: Boolean,
    browser: ['chromium', 'firefox', 'webkit'],
    device: [Array, String],
    'modern-devices': Boolean,
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
        breakpoints: parsed['css-breakpoints'] === true,
        browser: parsed['browser'] ?? 'chromium',
        deviceQueries: parsed['device']?.length ? parsed['device'] : [],
        modernDevices: parsed['modern-devices'] === true,
        outDir: parsed['out'] || parsed['out-dir'],
        headless: parsed['not-headless'] !== true,
        recursive: parsed['recursive'] === true,
        urls: parsed.argv.remain,
    })
}

function helpPrint() {
    console.log(`Plunders CSS and HTML for website QA.

${ansi.bold(ansi.underline('Capturing screenshots:'))}

  Plunder CSS and capture screenshots around media query breakpoints.

    ${ansi.bold('plunder')} [OPTIONS] ${ansi.bold('--css-breakpoints')} URL...

  Capture screenshots emulating a selection of modern phones and tablets.

    ${ansi.bold('plunder')} [OPTIONS] ${ansi.bold('--modern-devices')} URL...

  Capture screenshots emulating all iPhone devices.

    ${ansi.bold('plunder')} [OPTIONS] ${ansi.bold('--device iPhone')} URL...

  ${ansi.bold(ansi.underline('Plundering options:'))}
    ${ansi.bold('-b')}, ${ansi.bold('--browser')} <BROWSER>    Browser engine used when not specified by device emulation
                               [values: chromium (default) | firefox | webkit]
        ${ansi.bold('--css-breakpoints')}      Parse CSS and capture screenshots on media query breakpoints
    ${ansi.bold('-d')}, ${ansi.bold('--device')} <DEVICE>      Device name patterns to use for screenshot capturing
        ${ansi.bold('--modern-devices')}       Emulate modern devices for screenshot capture
        ${ansi.bold('--not-headless')}         Launch browser as a GUI application
    ${ansi.bold('-o')}, ${ansi.bold('--out-dir')} <OUT_DIR>    Output directory for screenshot capture [required]

${ansi.bold(ansi.underline('Link checking:'))}

  Plunder HTML and check all anchor tags for broken links.

    ${ansi.bold('plunder')} [-o, --out-file <OUT_FILE>] ${ansi.bold('links')} URL...


${ansi.bold(ansi.underline('Listing devices:'))}

  Devices emulated with --modern-devices.

    ${ansi.bold('plunder')} ${ansi.bold('devices')}

  All available devices.

    ${ansi.bold('plunder')} --all ${ansi.bold('devices')}

  Devices that match a pattern on device labels.

    ${ansi.bold('plunder')} --device iPhone ${ansi.bold('devices')}


${ansi.bold(ansi.underline('Global options:'))}
  ${ansi.bold('-h')}, ${ansi.bold('--help')}                 Print help`)
    process.exit(0)
}
