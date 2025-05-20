import {
    captureScreenshots,
    InvalidCaptureScreenshotsOptions,
    type CaptureProgress,
    type CaptureScreenshotsOptions,
    type CaptureScreenshotsResult,
} from '@eighty4/plunder-core'
import { createReadStream, createWriteStream } from 'node:fs'
import { appendFile, readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import ansi from './ansi.ts'
import { errorPrint } from './error.ts'

export async function captureScreenshotsCommand(
    opts: Omit<CaptureScreenshotsOptions, 'progress'>,
): Promise<never> {
    await validateCaptureOpts(opts)

    console.log('Get ready to plunder!')
    try {
        const result = await captureScreenshots({ ...opts, progress })
        await writeWebappReport(opts.outDir, result)
        process.exit(0)
    } catch (e: any) {
        if (e instanceof InvalidCaptureScreenshotsOptions) {
            errorPrint(
                'fields(s) are invalid:\n\n' +
                    Object.entries(e.fields)
                        .map(([p, m]) => {
                            if (
                                p ===
                                InvalidCaptureScreenshotsOptions.CAPTURE_CONFIGS
                            ) {
                                return `       ${m} Configure one of --css-breakpoints --device or --modern-devices.`
                            } else {
                                return `       ${p}: ${m}`
                            }
                        })
                        .join('\n\n'),
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

async function writeWebappReport(
    outDir: string,
    result: Array<CaptureScreenshotsResult>,
) {
    const webappDir = join(import.meta.dirname, '../webapp')
    await Promise.all(
        (await readdir(webappDir)).map(file =>
            streamCopy(join(webappDir, file), join(outDir, file)),
        ),
    )
    const manifests = await Promise.all(
        result.map(async ({ dir }) => {
            const manifest = await readFile(join(outDir, dir, 'plunder.json'))
            return `globalThis['plunder']['webpages'].push(${manifest.toString()})`
        }),
    )
    const bootstrap = `<script>globalThis['plunder']={mode:'result'};globalThis['plunder']['webpages']=[];${manifests.join(';')}</script>`
    await appendFile(join(outDir, 'index.html'), bootstrap)
}

async function streamCopy(from: string, to: string): Promise<void> {
    const reading = createReadStream(from)
    const writing = createWriteStream(to)
    return new Promise((res, rej) =>
        reading.pipe(writing).on('finish', res).on('error', rej),
    )
}
