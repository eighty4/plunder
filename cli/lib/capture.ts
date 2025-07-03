import { createReadStream, createWriteStream } from 'node:fs'
import { appendFile, readdir, readFile, stat } from 'node:fs/promises'
import { createServer as createHttpServer } from 'node:http'
import { join as joinPath, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import {
    CaptureHookError,
    CaptureHookImportError,
    type CaptureProgress,
    type CaptureScreenshotsOptions,
    type CaptureScreenshotsResult,
    captureScreenshots,
    InvalidCaptureOptionsError,
    launchCaptureWebSocket,
    UnspecifiedCaptureSourceError,
} from '@eighty4/plunder-core'
import { z } from 'zod'
import ansi from './ansi.ts'
import {
    confirmBrowserInstalls,
    confirmCaptureBrowserInstalls,
} from './browser.ts'
import { errorPrint } from './error.ts'

export function isDevUI(): boolean {
    switch (process.env.PLUNDER_DEV_UI) {
        case '1':
        case 'true':
            return true
        default:
            return false
    }
}

export async function activeScreenshotCapture(
    installConfirmed: boolean,
    headless: boolean,
): Promise<void> {
    if (!installConfirmed) {
        await confirmBrowserInstalls(
            new Set(['chromium', 'firefox', 'webkit']),
            headless,
        )
    }
    const modulePath = fileURLToPath(import.meta.url)
    const webappPath = resolve(modulePath, '../../webapp/index.html')
    const webSocket = await launchCaptureWebSocket({ serveUI: webappPath })
    console.log('Plundering your webdev at http://localhost:' + webSocket.port)
    return new Promise(() => {})
}

export type CaptureScreenshotsCommandOptions = {
    installConfirmed: boolean
    bootyPort: false | number
}

export async function captureScreenshotsCommand(
    opts: Omit<CaptureScreenshotsOptions, 'progress'>,
    { bootyPort, installConfirmed }: CaptureScreenshotsCommandOptions,
): Promise<never> {
    await validateCaptureOpts(opts)

    try {
        if (!installConfirmed) {
            await confirmCaptureBrowserInstalls(
                opts.browser,
                opts.headless,
                opts.modernDevices,
                opts.deviceQueries,
            )
        }
        const result = await captureScreenshots({ ...opts, progress })
        await writeWebappReport(opts.outDir, result)
        if (bootyPort === false) {
            console.log(
                'See your QA booty at',
                ansi.green(joinPath(opts.outDir, 'index.html')),
            )
        } else if (process.stdin.isTTY) {
            await serveWebappReport(bootyPort, opts.outDir)
        }
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
            errorPrint(e)
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
        case 'starting':
            console.log('Get ready to plunder!')
            break
        case 'parsing':
            const parsingOutput = `Parsing CSS: ${update.pages.completed} / ${update.pages.total} pages completed`
            if (update.pages.completed === 0) {
                console.log(parsingOutput)
            } else if (update.pages.completed === update.pages.total) {
                ansi.rewriteLines(1, `${parsingOutput} \u001b[32m✔\u001b[0m`)
            } else {
                ansi.rewriteLines(1, parsingOutput)
            }
            break
        case 'capturing':
            const capturingOutput = `Capturing screenshots: ${update.screenshots.completed} / ${update.screenshots.total} screenshots captured`
            if (update.screenshots.completed === 0) {
                console.log(capturingOutput)
            } else if (
                update.screenshots.completed === update.screenshots.total
            ) {
                ansi.rewriteLines(1, `${capturingOutput} \u001b[32m✔\u001b[0m`)
            } else {
                ansi.rewriteLines(1, capturingOutput)
            }
            break
        case 'completed':
            console.log('Plundering is complete!')
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

async function serveWebappReport(port: number, outDir: string): Promise<void> {
    const server = createHttpServer((req, res) => {
        if (req.method !== 'GET') {
            res.writeHead(405)
            res.end()
        } else if (req.url === '/') {
            const p = joinPath(outDir, 'index.html')
            const reading = createReadStream(p)
            res.setHeader('Content-Type', 'text/html')
            reading.pipe(res)
            reading.on('error', err => {
                console.error(
                    `GET ${req.url} file read ${p} error ${err.message}`,
                )
                res.statusCode = 500
                res.end()
            })
        } else {
            const p = joinPath(outDir, req.url!)
            const reading = createReadStream(p)
            res.setHeader('Content-Type', 'image/png')
            reading.pipe(res)
            reading.on('error', err => {
                console.error(
                    `GET ${req.url} file read ${p} error ${err.message}`,
                )
                res.statusCode = 500
                res.end()
            })
        }
    })
    return new Promise((res, rej) => {
        server.listen(port, () => {
            const url = 'http://localhost:' + port
            console.log(`\nSee your QA booty at ${ansi.green(url)}`)
        })
        server.once('close', res)
        server.once('error', rej)
    })
}

async function streamCopy(from: string, to: string): Promise<void> {
    const reading = createReadStream(from)
    const writing = createWriteStream(to)
    return new Promise((res, rej) =>
        reading.pipe(writing).on('finish', res).on('error', rej),
    )
}
