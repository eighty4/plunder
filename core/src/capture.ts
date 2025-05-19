import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import z, { ZodError } from 'zod'
import { resolveCaptureManifest } from './captureManifest.ts'
import { type CaptureProgressCallback } from './captureProgress.ts'
import { CaptureProgressUpdater } from './captureUpdater.ts'
import { type CssMediaQuery } from './cssParse.ts'
import { makeOutDirForPageUrl } from './fileSystem.ts'
import { parsePagesForCapture } from './pageParse.ts'
import {
    type BrowserEngine,
    BrowserEngineValues,
    type BrowserOptions,
    type BrowserProcess,
    launchBrowser,
} from './playwright.ts'

export interface CaptureScreenshotsOptions {
    /**
     * Whether to parse a webpage's CSS media queries for breakpoints. CSS
     * breakpoints are taken 1px on and 1px out of a media query's bounds.
     *
     * A `@media (400 > width > 800)` media query with an upper and lower bound
     * will create 4 screenshots at 400, 401, 799 and 800 pixels.
     */
    breakpoints: boolean

    /**
     * The default browser engine to use when a browser engine is not specified by device emulation.
     */
    browser: BrowserEngine

    /**
     * Device screens to emulate for capturing landscape and portrait screenshots. Strings will be matched against
     * device names from the `devices` export of `playwright-core`. Screenshots will be captured with the browser
     * native to the emulated device (Chrome for Android devices and WebKit for iPhone).
     *
     * Use boolean value `false` to opt out of device queries.
     */
    deviceQueries: false | Array<string>

    /*
     * Capture screenshots with a selection of modern phone and tablet devices.
     * This selection of devices is defined in `getDefaultDeviceDefinitions()` of `./devices.ts`.
     */
    modernDevices: boolean

    /**
     * Whether to launch browsers headless or graphically in the desktop environment.
     */
    headless: boolean

    /**
     * Out directory for screenshot capturing.
     *
     * Webpage URIs will be parsed to create a directory structure of `$outDir/$hostname/$path1/$path2/$path3`.
     * Each webpage's subdirectory in outDir will contain a plunder.json file describing the screenshot
     * capture for that webpage.
     */
    outDir: string

    /**
     * Callback that receives progress updates from screenshot capturing process.
     */
    progress: CaptureProgressCallback

    /**
     * Whether to query the DOM for anchor tags and traverse websites recursively. All anchor hrefs on the same domain
     * will be included in screenshot capturing.
     *
     * Use the environment variable PLUNDER_BROWSER_LIMIT to throttle concurrent browser contexts.
     */
    recursive: boolean

    /**
     * URLs of webpages to perform screenshot capturing on.
     */
    urls: Array<string>
}

export class InvalidCaptureScreenshotsOptions {
    static get CAPTURE_CONFIGS() {
        return 'CAPTURE_CONFIGS'
    }
    // map of paths to validation error messages
    #fields: Record<string, string>
    constructor(fields: Record<string, string>) {
        this.#fields = fields
    }
    get fields(): Record<string, string> {
        return this.#fields
    }
}

function validateCaptureScreenshotsOptions(opts: CaptureScreenshotsOptions) {
    try {
        z.object({
            breakpoints: z.boolean(),
            browser: z.enum(BrowserEngineValues),
            deviceQueries: z.array(z.union([z.literal(false), z.string()])),
            modernDevices: z.boolean(),
            headless: z.boolean(),
            outDir: z.string(),
            progress: z.function(),
            recursive: z.boolean(),
            urls: z.array(z.string().url()),
        })
            .strict()
            .refine(
                d =>
                    d.breakpoints ||
                    (d.deviceQueries && d.deviceQueries.length) ||
                    d.modernDevices,
                {
                    message:
                        'Screenshot capture must have a CSS breakpoint or device configured.',
                    params: { type: 'CAPTURE_CONFIGS' },
                },
            )
            .parse(opts)
    } catch (e: any) {
        if (e instanceof ZodError) {
            const fields: Record<string, string> = {}
            e.issues.forEach(i => {
                if (
                    i.code === 'custom' &&
                    i.params?.type ===
                        InvalidCaptureScreenshotsOptions.CAPTURE_CONFIGS
                ) {
                    fields[i.params.type] = i.message
                } else {
                    fields[i.path.join('.')] = i.message
                }
            })
            throw new InvalidCaptureScreenshotsOptions(fields)
        } else {
            throw e
        }
    }
}

export interface CaptureScreenshotsResult {
    url: string
    dir: string
}

export async function captureScreenshots(
    opts: CaptureScreenshotsOptions,
): Promise<Array<CaptureScreenshotsResult>> {
    validateCaptureScreenshotsOptions(opts)
    const updater = new CaptureProgressUpdater(opts.progress)
    const browser = await launchBrowser(opts)
    try {
        const result = await Promise.all(
            Object.entries(
                await resolveUrlsAndMediaQueries(browser, opts, updater),
            ).map(([url, mediaQueries]) =>
                captureScreenshotsForPage(
                    browser,
                    url,
                    mediaQueries,
                    opts,
                    updater,
                ),
            ),
        )
        updater.markCompleted()
        return result
    } finally {
        await browser.close()
    }
}

async function resolveUrlsAndMediaQueries(
    browser: BrowserProcess,
    opts: CaptureScreenshotsOptions,
    updater: CaptureProgressUpdater,
): Promise<Record<string, null | Array<CssMediaQuery>>> {
    const result: Record<string, null | Array<CssMediaQuery>> = {}
    if (opts.breakpoints) {
        const parsedPages = await parsePagesForCapture(browser, opts, updater)
        for (const { url, mediaQueries } of parsedPages) {
            result[url] = mediaQueries
        }
        updater.markPageParsingCompleted()
    } else {
        opts.urls.forEach(url => (result[url] = null))
    }
    return result
}

async function captureScreenshotsForPage(
    browser: BrowserProcess,
    url: string,
    mediaQueries: Array<CssMediaQuery> | null,
    opts: CaptureScreenshotsOptions,
    updater: CaptureProgressUpdater,
): Promise<CaptureScreenshotsResult> {
    const outDir = await makeOutDirForPageUrl(opts.outDir, url)
    const manifest = resolveCaptureManifest(
        outDir.webpageSubpathWithinOutDir,
        url,
        mediaQueries,
        opts,
    )
    updater.addToScreenshotsTotal(Object.keys(manifest.screenshots).length)
    const takingScreenshots = Object.entries(manifest.screenshots).map(
        async ([file, browserOpts]) => {
            await screenshot(
                browser,
                outDir.webpageOutDir,
                url,
                file,
                browserOpts,
            )
            updater.markScreenshotCompleted()
        },
    )
    await Promise.all(takingScreenshots)
    await writeFile(
        path.join(outDir.webpageOutDir, 'plunder.json'),
        JSON.stringify(manifest, null, 4),
    )
    return {
        url,
        dir: outDir.webpageSubpathWithinOutDir,
    }
}

async function screenshot(
    browser: BrowserProcess,
    outDir: string,
    url: string,
    file: string,
    opts: BrowserOptions,
) {
    const page = await browser.newPage(opts)
    await page.goto(url)
    const p = path.join(outDir, file)
    await writeFile(
        p,
        await page.screenshot({
            fullPage: true,
            type: 'png',
        }),
    )
    await page.close()
}
