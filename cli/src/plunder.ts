import {stat} from 'node:fs/promises'
import nopt from 'nopt'
import {z} from 'zod'
import {
    captureScreenshots,
    type CaptureScreenshotsOptions,
    InvalidCaptureScreenshotsOption,
} from '@eighty4/plunder-core'

const ascii = {
    bold: (s: string) => `\u001b[1m${s}\u001b[0m`,
    underline: (s: string) => `\u001b[4m${s}\u001b[0m`,
    red: (s: string) => `\u001b[31m${s}\u001b[0m`,
}

const knownOpts = {
    'browser': ['chromium', 'firefox', 'webkit'],
    'not-headless': [Boolean],
    'help': [Boolean],
    'out-dir': [String],
    'recursive': [Boolean],
}

const shortHands = {
    'b': ['--browser'],
    'h': ['--help'],
    'o': ['--out-dir'],
    'r': ['--recursive'],
}

nopt.invalidHandler = function (key: string, value: string, _type: any, data: Record<string, any>) {
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
    const opts = {
        browser: parsed['browser'] ?? 'chromium',
        outDir: parsed['out-dir'],
        headless: parsed['not-headless'] !== true,
        recursive: parsed['recursive'] === true,
        urls: parsed.argv.remain,
    }

    await validateOpts(opts)

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
    console.log(ascii.bold(ascii.red('error:')), s)
    if (optParseError) {
        console.log(`\nFor more information, try '${ascii.bold('--help')}'.`)
    }
    process.exit(1)
}

function helpPrint() {
    console.log(`Plunders CSS of websites and outputs screenshots around media query breakpoints.

${ascii.bold(ascii.underline('Usage:'))} ${ascii.bold('plunder')} [OPTIONS] URL...

${ascii.bold(ascii.underline('Options:'))}
  ${ascii.bold('-b')}, ${ascii.bold('--browser')} <BROWSER>    Browser engine [values: chromium (default) | firefox | webkit]
      ${ascii.bold('--not-headless')}         Launch browser as a headless process [defaults to false]
  ${ascii.bold('-o')}, ${ascii.bold('--out-dir')} <OUT_DIR>    Output directory for screenshot capture [required]
  ${ascii.bold('-r')}, ${ascii.bold('--recursive')}            Recursively plunders links to pages on same domain [defaults to false]
  ${ascii.bold('-h')}, ${ascii.bold('--help')}                 Print help`)
    process.exit(0)
}
