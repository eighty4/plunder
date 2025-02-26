#!/usr/bin/env node

import {
    captureScreenshots,
    type CaptureScreenshotsOptions,
    InvalidCaptureScreenshotsOption,
} from '@eighty4/plunder-core'
import { stat } from 'node:fs/promises'
import nopt from 'nopt'
import { z } from 'zod'

const ansi = {
    bold: (s: string) => `\u001b[1m${s}\u001b[0m`,
    underline: (s: string) => `\u001b[4m${s}\u001b[0m`,
    red: (s: string) => `\u001b[31m${s}\u001b[0m`,
    rewriteLines: (n: number, s: string) => {
        let seq = ''
        for (let i = 0; i < n; i++) {
            seq += `\u001b[A`
        }
        console.log(seq + s)
    },
}

const knownOpts = {
    browser: ['chromium', 'firefox', 'webkit'],
    device: [Array, String],
    devices: [Boolean],
    'not-headless': [Boolean],
    help: [Boolean],
    'out-dir': [String],
    recursive: [Boolean],
}

const shortHands = {
    b: ['--browser'],
    d: ['--device'],
    h: ['--help'],
    o: ['--out-dir'],
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
} else {
    const opts: CaptureScreenshotsOptions = {
        browser: parsed['browser'] ?? 'chromium',
        devices:
            parsed['devices'] === false
                ? false
                : parsed['device']?.length
                  ? parsed['device']
                  : true,
        outDir: parsed['out-dir'],
        headless: parsed['not-headless'] !== true,
        recursive: parsed['recursive'] === true,
        urls: parsed.argv.remain,

        progress: function (update) {
            switch (update.step) {
                case 'parsing':
                    ansi.rewriteLines(
                        1,
                        `Parsing CSS: ${update.pages.completed} / ${update.pages.total} pages parsed`,
                    )
                    break
                case 'capturing':
                    ansi.rewriteLines(
                        1,
                        `Capturing screenshots: ${update.screenshots.completed} / ${update.screenshots.total} screenshots captured`,
                    )
                    break
                case 'completed':
                    ansi.rewriteLines(1, 'Capturing screenshots completed!')
            }
        },
    }

    await validateOpts(opts)

    console.log('Get ready to plunder!')
    captureScreenshots(opts).then().catch(onError)
}

async function validateOpts(opts: CaptureScreenshotsOptions) {
    if (!opts.urls.length) {
        errorPrint('URL arguments are required', true)
    } else {
        opts.urls.forEach((url, i) => {
            try {
                z.string().url().parse(url)
            } catch (e) {
                const label = opts.urls.length === 1 ? 'URL' : `URL[${i}]`
                errorPrint(`${label} is not a valid url`)
            }
        })
    }

    if (!opts.outDir) {
        errorPrint('--out-dir is required', true)
    } else {
        try {
            if ((await stat(opts.outDir)).isFile()) {
                errorPrint('--out-dir exists as a file')
            }
        } catch (e: any) {
            if (e.code !== 'ENOENT') {
                throw e
            }
        }
    }
}

function onError(e: any) {
    if (e instanceof InvalidCaptureScreenshotsOption) {
        errorPrint(e.invalidFields.join(',') + ' field(s) are invalid')
    } else {
        errorPrint(e.message)
    }
}

function errorPrint(s: string, optParseError?: boolean) {
    console.log(ansi.bold(ansi.red('error:')), s)
    if (optParseError) {
        console.log(`\nFor more information, try '${ansi.bold('--help')}'.`)
    }
    process.exit(1)
}

function helpPrint() {
    console.log(`Plunders CSS and HTML for website QA.

${ansi.bold(ansi.underline('Usage:'))}

  Plunder CSS and output screenshots around media query breakpoints.

    ${ansi.bold('plunder')} [OPTIONS] URL...

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
