import {
    CaptureHookError,
    CaptureHookImportError,
    captureScreenshots,
    CaptureWebSocket,
    InvalidCaptureOptionsError,
    type CaptureProgress,
    type CaptureScreenshotsOptions,
    type CaptureScreenshotsResult,
    UnspecifiedCaptureSourceError,
} from '@eighty4/plunder-core'
import { createReadStream, createWriteStream } from 'node:fs'
import { appendFile, readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { z } from 'zod'
import ansi from './ansi.ts'
import { confirmBrowserInstall } from './browser.ts'
import { errorPrint } from './error.ts'

export async function activeScreenshotCapture(
    installConfirmed: boolean,
): Promise<void> {
    if (!installConfirmed) {
        await confirmBrowserInstall('chromium', true)
    }
    const modulePath = fileURLToPath(import.meta.url)
    const webappPath = resolve(modulePath, '../../webapp/index.html')
    const webSocket = new CaptureWebSocket({ serveUI: webappPath })
    await webSocket.initializing()
    console.log('Plundering your webdev at http://localhost:' + webSocket.port)
    return webSocket.onClose()
}

export async function captureScreenshotsCommand(
    opts: Omit<CaptureScreenshotsOptions, 'progress'>,
    installConfirmed: boolean,
): Promise<never> {
    await validateCaptureOpts(opts)

    try {
        if (!installConfirmed) {
            await confirmBrowserInstall(opts.browser, opts.headless)
        }
        console.log('Get ready to plunder!')
        const result = await captureScreenshots({ ...opts, progress })
        await writeWebappReport(opts.outDir, result)
        process.exit(0)
    } catch (e: any) {
        const pad = '        '
        if (e instanceof UnspecifiedCaptureSourceError) {
            errorPrint(
                'Screenshot capture must have a CSS breakpoint or device configured. Configure one of --css-breakpoints --device or --modern-devices.',
            )
        } else if (e instanceof InvalidCaptureOptionsError) {
            errorPrint(
                'fields(s) are invalid:\n\n' +
                    Object.entries(e.fields)
                        .map(([p, m]) => `${pad}${p}: ${m}`)
                        .join('\n\n'),
            )
        } else if (e instanceof CaptureHookError) {
            errorPrint(
                `--capture-hook ${e.specifier} threw ${e.cause.name} during ${e.url} capture:\n\n${pad}${e.cause}`,
            )
        } else if (e instanceof CaptureHookImportError) {
            switch (e.code) {
                case 'IMPORT_NOT_FOUND':
                    errorPrint(
                        `--capture-hook ${e.specifier} could find module but it does not export a ${e.fn} function`,
                    )
                    break
                case 'IMPORT_SYNTAX_ERR':
                    errorPrint(
                        `--capture-hook ${e.specifier} threw a syntax error:\n\n${pad}${e.cause}`,
                    )
                    break
                case 'EXPORT_NOT_FOUND':
                    errorPrint(
                        `--capture-hook ${e.specifier} could find module but it does not export a ${e.fn} function`,
                    )
                    break
                case 'EXPORT_NOT_FUNCTION':
                    errorPrint(
                        `--capture-hook ${e.specifier} exports a ${e.cause} instead of a function`,
                    )
                    break
            }
        } else if (e instanceof WebappReportError) {
            errorPrint(
                `Error writing webapp report to ${opts.outDir}.\n\n${pad}${e.cause.message}`,
            )
        } else {
            errorPrint(e.message)
        }
    }
}

async function validateCaptureOpts(
    opts: Omit<CaptureScreenshotsOptions, 'progress'>,
) {
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

function progress(update: CaptureProgress) {
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
            console.log('Capturing screenshots completed!')
    }
}

class WebappReportError extends Error {
    cause: Error
    constructor(cause: Error) {
        super(cause.message, { cause })
        this.cause = cause
    }
}

async function writeWebappReport(
    outDir: string,
    result: Array<CaptureScreenshotsResult>,
) {
    try {
        const webappDir = join(import.meta.dirname, '../webapp')
        await Promise.all(
            (await readdir(webappDir)).map(file =>
                streamCopy(join(webappDir, file), join(outDir, file)),
            ),
        )
        const manifests = await Promise.all(
            result.map(async ({ dir }) => {
                const manifest = await readFile(
                    join(outDir, dir, 'plunder.json'),
                )
                return `globalThis['plunder']['webpages'].push(${manifest.toString()})`
            }),
        )
        const bootstrap = `<script>globalThis['plunder']={mode:'result'};globalThis['plunder']['webpages']=[];${manifests.join(';')}</script>`
        await appendFile(join(outDir, 'index.html'), bootstrap)
    } catch (e: any) {
        throw new WebappReportError(e)
    }
}

async function streamCopy(from: string, to: string): Promise<void> {
    const reading = createReadStream(from)
    const writing = createWriteStream(to)
    return new Promise((res, rej) =>
        reading.pipe(writing).on('finish', res).on('error', rej),
    )
}
