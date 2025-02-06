import {writeFile} from 'node:fs/promises'
import path from 'node:path'
import z, {ZodError} from 'zod'
import {findAllCss} from './cssFind.js'
import {type CssBreakpoint, type CssDimension, parseCssForBreakpoints} from './cssParse.js'
import {findAllSameOriginAnchorHrefs} from './domParse.js'
import {makeOutDirForPageUrl} from './fileSystem.js'
import {type BrowserEngine, BrowserEngineValues, BrowserProcess, launchBrowser} from './playwright.js'

export {type BrowserEngine, BrowserEngineValues} from './playwright.ts'

export interface CaptureScreenshotsOptions {
    browser: BrowserEngine
    headless: boolean
    outDir: string
    recursive: boolean
    urls: Array<string>
}

export class InvalidCaptureScreenshotsOption {
    constructor(readonly invalidFields: Array<string>) {
    }
}

export function validateCaptureScreenshotsOptions(opts: CaptureScreenshotsOptions) {
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
        await Promise.all(pages.map(parsedPage => captureScreenshotsAroundBreakpoints(
            browser, parsedPage.url, parsedPage.breakpoints, opts)))
    } finally {
        await browser.close()
    }
}

async function captureScreenshotsAroundBreakpoints(browser: BrowserProcess, url: string, breakpoints: Array<CssBreakpoint>, opts: CaptureScreenshotsOptions): Promise<void> {
    const manifest: {
        url: string,
        screenshots: Record<string, { viewport: { width: number } }>,
        breakpoints: Array<{
            source: string,
            lowerBound?: CssDimension,
            upperBound?: CssDimension,
            screenshots: Array<{
                file: string,
                viewport: {
                    width: number,
                }
            }>
        }>
    } = {url, screenshots: {}, breakpoints: []}
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
    const screenshotDir = await makeOutDirForPageUrl(opts.outDir, url)
    await Promise.all(Object.entries(manifest.screenshots).map(async ([file, {viewport}]) => {
        const page = await browser.newPage({
            height: 600,
            width: viewport.width,
        })
        await page.goto(url)
        const p = path.join(screenshotDir, file)
        await writeFile(p, await page.screenshot({
            fullPage: true,
            type: 'png',
        }))
        await page.close()
    }))
    await writeFile(path.join(screenshotDir, 'plunder.json'), JSON.stringify(manifest, null, 4))
}

interface ParsePageResult {
    anchorHrefs?: Array<string>
    breakpoints: Array<CssBreakpoint>
    url: string
}

async function parsePagesForCapture(browser: BrowserProcess, opts: CaptureScreenshotsOptions): Promise<Array<ParsePageResult>> {
    const parsingPages: Record<string, Promise<ParsePageResult>> = {}
    const parsedPages: Array<ParsePageResult> = []

    function initParsingPages(urls: Array<string>) {
        for (const url of urls) {
            if (typeof parsingPages[url] === 'undefined') {
                parsingPages[url] = parsePage(url, opts.recursive)
            }
        }
    }

    async function parsePage(url: string, recursive: boolean): Promise<ParsePageResult> {
        const page = await browser.newPage()
        await page.goto(url)
        const css = await findAllCss(page)
        const anchorHrefs = recursive ? await findAllSameOriginAnchorHrefs(page) : undefined
        await page.close()
        const breakpoints = parseCssForBreakpoints(css).breakpoints
        return {
            anchorHrefs,
            breakpoints,
            url,
        }
    }

    async function drainCompletedParsingPages() {
        while (Object.keys(parsingPages).length) {
            const parsedPage = await Promise.race(Object.values(parsingPages))
            delete parsingPages[parsedPage.url]
            if (opts.recursive && parsedPage.anchorHrefs?.length) {
                initParsingPages(parsedPage.anchorHrefs!)
            }
            parsedPages.push(parsedPage)
        }
    }

    initParsingPages(opts.urls)
    await drainCompletedParsingPages()
    return parsedPages
}
