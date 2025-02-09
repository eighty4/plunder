import {writeFile} from 'node:fs/promises'
import path from 'node:path'
import z, {ZodError} from 'zod'
import {type CssBreakpoint, type CssDimension} from './cssParse.js'
import {makeOutDirForPageUrl} from './fileSystem.js'
import {parsePagesForCapture} from './pageParse.js'
import {type BrowserEngine, BrowserEngineValues, type BrowserProcess, launchBrowser} from './playwright.js'

export {type BrowserEngine, BrowserEngineValues} from './playwright.ts'

export interface CaptureScreenshotsOptions {
    /**
     * The default browser engine to use when a browser engine is not specified by device emulation.
     */
    browser: BrowserEngine

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
            headless: z.boolean(),
            outDir: z.string(),
            recursive: z.boolean(),
            urls: z.array(z.string().url()),
        }).parse(opts)
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
    screenshots: Record<string, Omit<ScreenshotSpec, 'file'>>
    breakpoints: Array<BreakpointDetails>
}

interface ScreenshotSpec {
    file: string
    viewport: BrowserViewport
}

interface BrowserViewport {
    width: number
}

interface BreakpointDetails {
    source: string
    lowerBound?: CssDimension
    upperBound?: CssDimension
    screenshots: Array<ScreenshotSpec>
}

export async function captureScreenshotsForPage(browser: BrowserProcess, url: string, breakpoints: Array<CssBreakpoint>, opts: CaptureScreenshotsOptions): Promise<void> {
    const manifest = resolveScreenshotsToTake(url, breakpoints)
    const outDir = await makeOutDirForPageUrl(opts.outDir, url)
    const takingScreenshots = Object.entries(manifest.screenshots)
        .map(([file, {viewport}]) => {
            return takeScreenshot(browser, outDir, url, file, viewport)
        })
    await Promise.all(takingScreenshots)
    await writeFile(path.join(outDir, 'plunder.json'), JSON.stringify(manifest, null, 4))
}

async function takeScreenshot(browser: BrowserProcess,
                              outDir: string,
                              url: string,
                              file: string,
                              viewport: BrowserViewport) {
    const page = await browser.newPage({
        height: 600,
        width: viewport.width,
    })
    await page.goto(url)
    const p = path.join(outDir, file)
    await writeFile(p, await page.screenshot({
        fullPage: true,
        type: 'png',
    }))
    await page.close()
}

function resolveScreenshotsToTake(url: string, breakpoints: Array<CssBreakpoint>): CaptureScreenshotManifest {
    const manifest: CaptureScreenshotManifest = {url, screenshots: {}, breakpoints: []}
    breakpoints.forEach(breakpoint => {
        const viewportWidths: Array<number> = []
        if (breakpoint.lowerBound) {
            viewportWidths.push(breakpoint.lowerBound.value, breakpoint.lowerBound.value - 1)
        }
        if (breakpoint.upperBound) {
            viewportWidths.push(breakpoint.upperBound.value, breakpoint.upperBound.value + 1)
        }
        manifest.breakpoints.push({
            source: breakpoint.filename,
            lowerBound: breakpoint.lowerBound,
            upperBound: breakpoint.upperBound,
            screenshots: viewportWidths.map(width => {
                const file = `w_${width}.png`
                if (!manifest.screenshots[file]) {
                    manifest.screenshots[file] = {viewport: {width}}
                }
                return {file, viewport: {width}}
            }),
        })
    })
    return manifest
}
