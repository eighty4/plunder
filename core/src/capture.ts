import {writeFile} from 'node:fs/promises'
import path from 'node:path'
import z, {ZodError} from 'zod'
import {type CssBreakpoint, type CssDimension} from './cssParse.ts'
import {resolveDeviceDefinitions} from './devices.ts'
import {makeOutDirForPageUrl} from './fileSystem.ts'
import {parsePagesForCapture} from './pageParse.ts'
import {
    type BrowserEngine,
    BrowserEngineValues,
    type BrowserOptions,
    type BrowserProcess,
    launchBrowser,
} from './playwright.ts'

export {type BrowserEngine, BrowserEngineValues} from './playwright.ts'

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
    constructor(readonly invalidFields: Array<string>) {
    }
}

function validateCaptureScreenshotsOptions(opts: CaptureScreenshotsOptions) {
    try {
        z.object({
            browser: z.enum(BrowserEngineValues),
            devices: z.union([z.boolean(), z.array(z.string())]),
            headless: z.boolean(),
            outDir: z.string(),
            recursive: z.boolean(),
            urls: z.array(z.string().url()),
        }).strict().parse(opts)
    } catch (e: any) {
        if (e instanceof ZodError) {
            throw new InvalidCaptureScreenshotsOption(e.issues.map(i => i.path.join('.')))
        } else {
            throw e
        }
    }
}

export async function captureScreenshots(opts: CaptureScreenshotsOptions) {
    validateCaptureScreenshotsOptions(opts)
    const browser = await launchBrowser(opts)
    try {
        const pages = await parsePagesForCapture(browser, opts)
        await Promise.all(pages.map(parsedPage => captureScreenshotsForPage(
            browser, parsedPage.url, parsedPage.breakpoints, opts)))
    } finally {
        await browser.close()
    }
}

// written to webpage out dir
interface CaptureScreenshotManifest {
    url: string,
    devices: Record<string, DeviceDetails>,
    screenshots: Record<string, BrowserOptions>
    breakpoints: Array<BreakpointDetails>
}

interface DeviceDetails {
    landscape: BrowserOptions
    portrait: BrowserOptions
    screenshots: Record<string, BrowserOptions>
}

interface BreakpointDetails {
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
): Promise<void> {
    const manifest = resolveScreenshotManifest(url, breakpoints, opts)
    const outDir = await makeOutDirForPageUrl(opts.outDir, url)
    const takingScreenshots = Object.entries(manifest.screenshots)
        .map(([file, browserOpts]) => {
            return screenshot(browser, outDir, url, file, browserOpts)
        })
    await Promise.all(takingScreenshots)
    await writeFile(path.join(outDir, 'plunder.json'), JSON.stringify(manifest, null, 4))
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
    await writeFile(p, await page.screenshot({
        fullPage: true,
        type: 'png',
    }))
    await page.close()
}

function resolveScreenshotManifest(
    url: string,
    breakpoints: Array<CssBreakpoint>,
    opts: CaptureScreenshotsOptions,
): CaptureScreenshotManifest {
    const manifest: CaptureScreenshotManifest = {url, screenshots: {}, devices: {}, breakpoints: []}
    if (opts.devices === true) {

    }
    const devices = resolveDeviceDefinitions(opts.devices)
    for (const [deviceLabel, {landscape, portrait}] of Object.entries(devices)) {
        const device: DeviceDetails = {landscape, portrait, screenshots: {}}
        const filenamePrefix = deviceLabel
            .replaceAll(' ', '-').replaceAll('(', '-').replaceAll(')', '-').replaceAll('--', '-').toLowerCase()
        const landscapeFilename = `${filenamePrefix}_landscape.png`.replaceAll('-_', '_')
        const portraitFilename = `${filenamePrefix}_portrait.png`.replaceAll('-_', '_')
        manifest.screenshots[landscapeFilename] = device.screenshots[landscapeFilename] = device.landscape
        manifest.screenshots[portraitFilename] = device.screenshots[portraitFilename] = device.portrait
        manifest.devices[deviceLabel] = device
    }
    for (const breakpoint of breakpoints) {
        const viewportWidths: Array<number> = []
        if (breakpoint.lowerBound) {
            viewportWidths.push(breakpoint.lowerBound.value, breakpoint.lowerBound.value - 1)
        }
        if (breakpoint.upperBound) {
            viewportWidths.push(breakpoint.upperBound.value, breakpoint.upperBound.value + 1)
        }
        const screenshots: Record<string, BrowserOptions> = {}
        for (const width of viewportWidths) {
            const file = `w_${width}.png`
            const browserOpts = {viewport: {height: 600, width}}
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
