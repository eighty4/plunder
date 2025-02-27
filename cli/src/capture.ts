import {
    captureScreenshots,
    InvalidCaptureScreenshotsOption,
    type CaptureProgress,
    type CaptureScreenshotsOptions,
} from '@eighty4/plunder-core'
import { stat } from 'node:fs/promises'
import { z } from 'zod'
import ansi from './ansi.ts'
import { errorPrint } from './error.ts'

export async function captureScreenshotsCommand(
    opts: Omit<CaptureScreenshotsOptions, 'progress'>,
): Promise<never> {
    console.log('Plundering CSS media queries for layout rendering')
    await validateCaptureOpts(opts)

    console.log('Get ready to plunder!')
    try {
        await captureScreenshots({ ...opts, progress })
        process.exit(0)
    } catch (e: any) {
        if (e instanceof InvalidCaptureScreenshotsOption) {
            errorPrint(e.invalidFields.join(',') + ' field(s) are invalid')
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
            ansi.rewriteLines(1, 'Capturing screenshots completed!')
    }
}
