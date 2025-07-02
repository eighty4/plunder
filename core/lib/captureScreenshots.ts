import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Page } from 'playwright-core'
import z, { ZodError } from 'zod'
import { type CaptureHook, resolveCaptureHook } from './captureHook.ts'
import { resolveCaptureManifest } from './captureManifest.ts'
import { type CaptureProgressCallback } from './captureProgress.ts'
import { CaptureProgressUpdater } from './captureUpdater.ts'
import { type CssMediaQuery } from './cssParse.ts'
import { resolveDevices } from './devices.ts'
import { makeOutDirForPageUrl } from './fileSystem.ts'
import { parsePagesForCapture } from './pageParse.ts'
import {
    type BrowserEngine,
    BrowserEngineValues,
} from './playwrightBrowsers.ts'
import { installMissingBrowserDistributions } from './playwrightInstall.ts'
import { BrowserManager } from './playwrightProcess.ts'

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
     * The default browser engine to use when a browser engine is not specified
     * by device emulation.
     */
    browser: BrowserEngine

    /**
     * Path to a module exporting a function invoked before every screenshot
     * capture.
     *
     * A path to a relative `.js` or `.ts` script will use the default export
     * to prepare a page before each capture.
     *
     * A path with a `./capture.ts#pageSetup` identifier suffix will use a
     * specific export from the module. This example would import `pageSetup`
     * from `./capture.ts` and invoke the function before each screenshot
     * capture.
     *
     * The exported function signature is:
     *
     * ```
     * import type { Page } from 'playwright'
     *
     * async function (page: Page): Promise<void> {
     * }
     * ```
     *
     * The page will already be at the capture URL before the resolved
     * function is invoked.
     */
    captureHook?: string

    /**
     * Device screens to emulate for capturing landscape and portrait
     * screenshots. Strings will be matched against device names from the
     * `devices` export of `playwright-core`. Screenshots will be captured
     * with the browser native to the emulated device (Chrome for Android
     * devices and WebKit for iPhone).
     *
     * Use boolean value `false` to opt out of device queries.
     */
    deviceQueries: false | Array<string>

    /*
     * Capture screenshots with a selection of modern phone and tablet devices.
     * This selection of devices is defined in `getDefaultDeviceDefinitions()`
     * of `./devices.ts`.
     */
    modernDevices: boolean

    /**
     * Whether to launch browsers headless or graphically in the desktop
     * environment.
     */
    headless: boolean

    /**
     * Out directory for screenshot capturing.
     *
     * Webpage URIs will be parsed to create a directory structure of
     * `$outDir/$hostname/$path1/$path2/$path3`. Each webpage's subdirectory
     * in outDir will contain a plunder.json file describing the screenshot
     * capture for that webpage.
     */
    outDir: string

    /**
     * Callback that receives progress updates from screenshot capturing
     * process.
     */
    progress: CaptureProgressCallback

    /**
     * Whether to query the DOM for anchor tags and traverse websites
     * recursively. All anchor hrefs on the same domain will be included in
     * screenshot capturing.
     *
     * Use the environment variable PLUNDER_BROWSER_LIMIT to throttle
     * concurrent browser contexts.
     */
    recursive: boolean

    /**
     * URLs of webpages to perform screenshot capturing on.
     */
    urls: Array<string>
}

export class InvalidCaptureOptionsError extends Error {
    // map of paths to validation error messages
    #fields: Record<string, string>
    constructor(fields: Record<string, string>) {
        super('CaptureScreenshotsOptions was invalid')
        this.name = this.constructor.name
        this.#fields = fields
    }
    get fields(): Record<string, string> {
        return structuredClone(this.#fields)
    }
}

export class UnspecifiedCaptureSourceError extends Error {
    constructor() {
        super(
            'Must specify a device emulation or CSS breakpoint capture source',
        )
        this.name = this.constructor.name
    }
}

export function validateCaptureScreenshotsOptions(
    opts: CaptureScreenshotsOptions,
) {
    try {
        z.object({
            breakpoints: z.boolean(),
            browser: z.enum(BrowserEngineValues),
            captureHook: z.string().optional(),
            deviceQueries: z.array(z.union([z.literal(false), z.string()])),
            modernDevices: z.boolean(),
            headless: z.boolean(),
            outDir: z.string(),
            progress: z.function(),
            recursive: z.boolean(),
            urls: z.array(z.string().url()),
        })
            .strict()
            .parse(opts)
    } catch (e: any) {
        if (e instanceof ZodError) {
            const fields: Record<string, string> = {}
            e.issues.forEach(i => (fields[i.path.join('.')] = i.message))
            throw new InvalidCaptureOptionsError(fields)
        } else {
            throw e
        }
    }
    if (
        !opts.breakpoints &&
        (!opts.deviceQueries || !opts.deviceQueries.length) &&
        !opts.modernDevices
    ) {
        throw new UnspecifiedCaptureSourceError()
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
    await installCaptureBrowserDistributions(opts)
    const captureHook = opts.captureHook
        ? await resolveCaptureHook(opts.captureHook)
        : null
    const updater = new CaptureProgressUpdater(opts.progress)
    const browsers = new BrowserManager()
    try {
        const result = await Promise.all(
            Object.entries(
                await resolveUrlsAndMediaQueries(browsers, opts, updater),
            ).map(([url, mediaQueries]) =>
                captureScreenshotsForPage(
                    browsers,
                    url,
                    captureHook,
                    mediaQueries,
                    opts,
                    updater,
                ),
            ),
        )
        updater.markCompleted()
        return result
    } catch (e) {
        console.log(e)
        throw e
    } finally {
        await browsers.shutdown()
    }
}

async function installCaptureBrowserDistributions(
    opts: CaptureScreenshotsOptions,
): Promise<void> {
    await installMissingBrowserDistributions(
        new Set([
            opts.browser,
            ...resolveDevices(opts).map(device => device.browser),
        ]),
        opts.headless,
    )
}

async function resolveUrlsAndMediaQueries(
    browsers: BrowserManager,
    opts: CaptureScreenshotsOptions,
    updater: CaptureProgressUpdater,
): Promise<Record<string, null | Array<CssMediaQuery>>> {
    const result: Record<string, null | Array<CssMediaQuery>> = {}
    if (opts.breakpoints) {
        const parsedPages = await parsePagesForCapture(browsers, opts, updater)
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
    browsers: BrowserManager,
    url: string,
    captureHook: CaptureHook | null,
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
        async ([file, { browser, pageSpec }]) => {
            const page = await browsers.newPage(
                browser,
                opts.headless,
                pageSpec,
            )
            await screenshot(page, outDir.webpageOutDir, url, captureHook, file)
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
    page: Page,
    outDir: string,
    url: string,
    captureHook: CaptureHook | null,
    file: string,
) {
    await page.goto(url)
    if (captureHook !== null) {
        await captureHook(page)
    }
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
