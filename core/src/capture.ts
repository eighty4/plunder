import {mkdir, writeFile} from 'node:fs/promises'
import path from 'node:path'
import z, {ZodError} from 'zod'
import {findAllCss} from './cssFind.js'
import {type CssBreakpoint, parseCssForBreakpoints} from './cssParse.js'
import {findAllSameOriginAnchorHrefs} from './domParse.js'
import {makeUrlOutDir} from './fileSystem.js'
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
        await mkdir(opts.outDir, {recursive: true})
        await Promise.all(pages.map(parsedPage => captureBreakpointScreenshots(browser, parsedPage, opts)))
    } finally {
        await browser.close()
    }
}

async function captureBreakpointScreenshots(browser: BrowserProcess, parsedPage: ParsePageResult, opts: CaptureScreenshotsOptions): Promise<void> {
    const screenshotDir = await makeUrlOutDir(opts.outDir, new URL(parsedPage.url))
    const viewportWidths = Array.from(new Set(parsedPage.breakpoints.flatMap(breakpoint => {
        const viewportWidths = []
        if (breakpoint.lowerBound) {
            viewportWidths.push(breakpoint.lowerBound.value, breakpoint.lowerBound.value - 1)
        }
        if (breakpoint.upperBound) {
            viewportWidths.push(breakpoint.upperBound.value, breakpoint.upperBound.value + 1)
        }
        return viewportWidths
    })))
    await Promise.all(viewportWidths.map(async width => {
        const page = await browser.newPage({
            height: 600,
            width,
        })
        await page.goto(parsedPage.url)
        const p = path.join(screenshotDir, `w_${width}.png`)
        await writeFile(p, await page.screenshot({
            fullPage: true,
            type: 'png',
        }))
        await page.close()
    }))
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
