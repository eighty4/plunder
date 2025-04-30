import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import z, { ZodError } from 'zod'
import type { CaptureProgressCallback } from './captureProgress.js'
import { CaptureProgressUpdater } from './captureUpdater.js'
import { type CssBreakpoint, type CssDimension } from './cssParse.ts'
import { resolveDeviceDefinitions } from './devices.ts'
import { makeOutDirForPageUrl } from './fileSystem.ts'
import { parsePagesForCapture } from './pageParse.ts'
import {
    type BrowserEngine,
    BrowserEngineValues,
    type BrowserOptions,
    type BrowserProcess,
    launchBrowser,
} from './playwright.ts'

export * from './captureProgress.ts'
export { BrowserEngineValues, type BrowserEngine } from './playwright.ts'

export interface CaptureScreenshotsOptions {
    /**
     * The default browser engine to use when a browser engine is not specified by device emulation.
     */
    browser: BrowserEngine

    /**
     * Device screens to emulate for capturing landscape and portrait screenshots. Strings will be matched against
     * device names from the `devices` export of `playwright-core`. Screenshots will be captured with the browser
     * native to the emulated device (Chrome for Android devices and WebKit for iPhone).
     *
     * Boolean value of `true` specifies to capture screenshots for a selection of modern phone and tablet devices.
     * This selection of devices is defined in `getDefaultDeviceDefinitions()` of `./devices.ts`.
     */
    devices: boolean | Array<string>

    /**
     * Whether to launch browsers headless or graphically in the desktop environment.
     */
    headless: boolean

    /**
     * Root out directory for screenshot capturing.
     *
     * Webpage URIs will be parsed to create a directory structure of `$outDir/$hostname/$path1/$path2/$path3`.
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

export class InvalidCaptureScreenshotsOption {
    invalidFields: Array<string>
    constructor(invalidFields: Array<string>) {
        this.invalidFields = invalidFields
    }
}

function validateCaptureScreenshotsOptions(opts: CaptureScreenshotsOptions) {
    try {
        z.object({
            browser: z.enum(BrowserEngineValues),
            devices: z.union([z.boolean(), z.array(z.string())]),
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
            throw new InvalidCaptureScreenshotsOption(
                e.issues.map(i => i.path.join('.')),
            )
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
        const pages = await parsePagesForCapture(browser, opts, updater)
        updater.markPageParsingCompleted()
        return await Promise.all(
            pages.map(parsedPage =>
                captureScreenshotsForPage(
                    browser,
                    parsedPage.url,
                    parsedPage.breakpoints,
                    opts,
                    updater,
                ),
            ),
        )
    } finally {
        await browser.close()
    }
}

// written to webpage out dir
// exported for use in webapp
export interface CaptureScreenshotManifest {
    dir: string
    url: string
    devices: Record<string, DeviceDetails>
    screenshots: Record<string, BrowserOptions>
    breakpoints: Array<BreakpointDetails>
}

export interface DeviceDetails {
    landscape: BrowserOptions
    portrait?: BrowserOptions
    screenshots: Record<string, BrowserOptions>
}

export interface BreakpointDetails {
    source: string
    lowerBound?: CssDimension
    upperBound?: CssDimension
    screenshots: Record<string, BrowserOptions>
}

export async function captureScreenshotsForPage(
    browser: BrowserProcess,
    url: string,
    breakpoints: Array<CssBreakpoint>,
    opts: CaptureScreenshotsOptions,
    updater: CaptureProgressUpdater,
): Promise<CaptureScreenshotsResult> {
    const outDir = await makeOutDirForPageUrl(opts.outDir, url)
    const manifest = resolveScreenshotManifest(
        outDir.urlSubdir,
        url,
        breakpoints,
        opts,
    )
    updater.addToScreenshotsTotal(Object.keys(manifest.screenshots).length)
    const takingScreenshots = Object.entries(manifest.screenshots).map(
        async ([file, browserOpts]) => {
            await screenshot(browser, outDir.p, url, file, browserOpts)
            updater.markScreenshotCompleted()
        },
    )
    await Promise.all(takingScreenshots)
    await writeFile(
        path.join(outDir.p, 'plunder.json'),
        JSON.stringify(manifest, null, 4),
    )
    return {
        url,
        dir: outDir.urlSubdir,
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

function resolveScreenshotManifest(
    dir: string,
    url: string,
    breakpoints: Array<CssBreakpoint>,
    opts: CaptureScreenshotsOptions,
): CaptureScreenshotManifest {
    const manifest: CaptureScreenshotManifest = {
        dir,
        url,
        screenshots: {},
        devices: {},
        breakpoints: [],
    }
    for (const deviceDefinition of resolveDeviceDefinitions(opts.devices)) {
        const deviceScreenshots: Record<string, BrowserOptions> = {}
        const filenamePrefix = deviceDefinition.label
            .replaceAll(' ', '-')
            .replaceAll('(', '-')
            .replaceAll(')', '-')
            .replaceAll('--', '-')
            .toLowerCase()
        if (deviceDefinition.type === 'desktop') {
            const desktopFilename = `${filenamePrefix}.png`
            manifest.screenshots[desktopFilename] = deviceScreenshots[
                desktopFilename
            ] = deviceDefinition.landscape
        } else if (deviceDefinition.type === 'mobile') {
            const landscapeFilename =
                `${filenamePrefix}_landscape.png`.replaceAll('-_', '_')
            const portraitFilename =
                `${filenamePrefix}_portrait.png`.replaceAll('-_', '_')
            manifest.screenshots[landscapeFilename] = deviceScreenshots[
                landscapeFilename
            ] = deviceDefinition.landscape
            manifest.screenshots[portraitFilename] = deviceScreenshots[
                portraitFilename
            ] = deviceDefinition.portrait
        }
        manifest.devices[deviceDefinition.label] = {
            landscape: deviceDefinition.landscape,
            portrait:
                deviceDefinition.type === 'desktop'
                    ? undefined
                    : deviceDefinition.portrait,
            screenshots: deviceScreenshots,
        }
    }
    for (const breakpoint of breakpoints) {
        const viewportWidths: Array<number> = []
        if (breakpoint.lowerBound) {
            viewportWidths.push(
                breakpoint.lowerBound.value,
                breakpoint.lowerBound.value - 1,
            )
        }
        if (breakpoint.upperBound) {
            viewportWidths.push(
                breakpoint.upperBound.value,
                breakpoint.upperBound.value + 1,
            )
        }
        const screenshots: Record<string, BrowserOptions> = {}
        for (const width of viewportWidths) {
            const file = `w_${width}.png`
            const browserOpts = { viewport: { height: 600, width } }
            if (!manifest.screenshots[file]) {
                manifest.screenshots[file] = browserOpts
            }
            screenshots[file] = browserOpts
        }
        manifest.breakpoints.push({
            source: breakpoint.filename,
            lowerBound: breakpoint.lowerBound,
            upperBound: breakpoint.upperBound,
            screenshots,
        })
    }
    return manifest
}
