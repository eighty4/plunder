#!/usr/bin/env node

import nopt from 'nopt'
import ansi from './ansi.ts'
import {
    activeScreenshotCapture,
    captureScreenshotsCommand,
} from './capture.ts'
import { devicesPrintCommand } from './devices.ts'
import { errorPrint } from './error.ts'
import { linkCheckingCommand } from './links.ts'

const knownOpts = {
    all: Boolean,
    ['capture-hook']: String,
    ['confirm-install']: Boolean,
    ['css-breakpoints']: Boolean,
    browser: ['chromium', 'firefox', 'webkit'],
    device: [Array, String],
    'modern-devices': Boolean,
    'not-headless': Boolean,
    help: Boolean,
    out: String,
    'out-dir': String,
    'out-file': String,
    ui: Boolean,
}

const shortHands = {
    a: ['--all'],
    b: ['--browser'],
    d: ['--device'],
    h: ['--help'],
    o: ['--out'],
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

type PlunderMode = 'capture' | 'devices' | 'links'

const mode = (function resolveMode(): PlunderMode | null {
    if (parsed.argv.remain.length) {
        switch (parsed.argv.remain[0]) {
            case 'devices':
            case 'links':
                return parsed.argv.remain[0] as PlunderMode
            case 'capture':
                if (parsed.help) {
                    return 'capture'
                }
        }
    }
    if (parsed.help && parsed.argv.cooked.length === 1) {
        return null
    } else {
        return 'capture'
    }
})()

function isSkipConfirmInstall(): boolean {
    return parsed['confirm-install'] === true
}

if (parsed.help) {
    helpPrint()
} else if (mode === 'devices') {
    devicesPrintCommand(
        parsed.all ? 'all' : parsed.device?.length ? parsed.device : undefined,
    )
} else if (mode === 'links') {
    await linkCheckingCommand(
        {
            outputFile: parsed['out'] || parsed['out-file'],
            urls: parsed.argv.remain.filter(remain => remain !== 'links'),
        },
        isSkipConfirmInstall(),
    )
} else if (parsed['ui'] === true) {
    await activeScreenshotCapture(
        isSkipConfirmInstall(),
        parsed['not-headless'] !== true,
    )
} else {
    await captureScreenshotsCommand(
        {
            breakpoints: parsed['css-breakpoints'] === true,
            browser: parsed['browser'] ?? 'chromium',
            captureHook: parsed['capture-hook'],
            deviceQueries: parsed['device']?.length ? parsed['device'] : [],
            modernDevices: parsed['modern-devices'] === true,
            outDir: parsed['out'] || parsed['out-dir'],
            headless: parsed['not-headless'] !== true,
            recursive: parsed['recursive'] === true,
            urls: parsed.argv.remain.filter(remain => remain !== 'capture'),
        },
        isSkipConfirmInstall(),
    )
}

function helpPrint(): never {
    const sectionHeader = (s: string): string =>
        `\n${ansi.bold(ansi.underline(s))}`
    console.log(`Plunders CSS and HTML for website QA.`)

    if (mode === null) {
        console.log(`${sectionHeader('Capturing screenshots:')}
  ${ansi.bold('plunder')} --css-breakpoints --out-dir web_qa URL...
  ${ansi.bold('plunder')} --device iPhone --out-dir web_qa URL...
  ${ansi.bold('plunder')} --modern-devices --out-dir web_qa URL...
${sectionHeader('Listing devices:')}
  ${ansi.bold('plunder')} devices
  ${ansi.bold('plunder')} devices --all
  ${ansi.bold('plunder')} devices --device iPhone
${sectionHeader('Link checking:')}
  ${ansi.bold('plunder')} links URL...
${sectionHeader('Read extensive docs with:')}
  ${ansi.bold('plunder capture -h')}
  ${ansi.bold('plunder devices -h')}
  ${ansi.bold('plunder links -h')}`)
    }

    // capture -h content
    if (mode === 'capture') {
        console.log(`${sectionHeader('Capturing screenshots:')}

 Use a webapp UI to command screenshot capturing.

    ${ansi.bold('plunder')} --ui

 Plunder CSS and capture screenshots around media query breakpoints.

    ${ansi.bold('plunder')} [OPTIONS] ${ansi.bold('--css-breakpoints')} URL...

 Capture screenshots emulating a selection of modern phones and tablets.

    ${ansi.bold('plunder')} [OPTIONS] ${ansi.bold('--modern-devices')} URL...

 Capture screenshots emulating all iPhone devices.

    ${ansi.bold('plunder')} [OPTIONS] ${ansi.bold('--device iPhone')} URL...

 ${ansi.bold('Options:')}
    ${ansi.bold('-b')}, ${ansi.bold('--browser')} <BROWSER>    Browser engine used when not specified by device emulation
                               [values: chromium (default) | firefox | webkit]
        ${ansi.bold('--capture-hook')}         Path to a script ran before each screenshot capture
        ${ansi.bold('--confirm-install')}      Confirm Playwright browser installs
        ${ansi.bold('--css-breakpoints')}      Parse CSS and capture screenshots on media query breakpoints
    ${ansi.bold('-d')}, ${ansi.bold('--device')} <DEVICE>      Device name patterns to use for screenshot capturing
        ${ansi.bold('--modern-devices')}       Emulate modern devices for screenshot capture
        ${ansi.bold('--not-headless')}         Launch browser as a GUI application
    ${ansi.bold('-o')}, ${ansi.bold('--out-dir')} <OUT_DIR>    Output directory for screenshot capture [required]

    CaptureScreenshotsOptions has very detailed docs:
        https://github.com/eighty4/plunder/blob/main/core/lib/captureScreenshots.ts#L20

Read about all commands with '${ansi.bold('plunder --help')}'.`)
    }

    // links -h content
    if (mode === 'links') {
        console.log(`${sectionHeader('Link checking:')}

 Plunder HTML and check all anchor tags for broken links.

    ${ansi.bold('plunder')} [-o, --out-file <OUT_FILE>] ${ansi.bold('links')} URL...

 ${ansi.bold('Options:')}
        ${ansi.bold('--confirm-install')}      Confirm Playwright browser installs

Read about all commands with '${ansi.bold('plunder --help')}'.`)
    }

    // devices -h content
    if (mode === 'devices') {
        console.log(`${sectionHeader('Listing devices:')}

 Devices emulated when using --modern-devices.

    ${ansi.bold('plunder')} ${ansi.bold('devices')}

 All available devices to use with --device.

    ${ansi.bold('plunder')} --all ${ansi.bold('devices')}

 Test device queries that match a pattern on device labels.

    ${ansi.bold('plunder')} --device iPhone ${ansi.bold('devices')}

Read about all commands with '${ansi.bold('plunder --help')}'.`)
    }

    process.exit(0)
}
