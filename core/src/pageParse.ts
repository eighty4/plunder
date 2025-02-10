import type {CaptureScreenshotsOptions} from './api.ts'
import {findAllCss} from './cssFind.ts'
import {type CssBreakpoint, parseCssForBreakpoints} from './cssParse.ts'
import {findAllSameOriginAnchorHrefs} from './domParse.ts'
import {BrowserProcess} from './playwright.ts'
import {getBaseHref} from './url.ts'

export interface ParsePageResult {
    anchorHrefs?: Array<string>
    breakpoints: Array<CssBreakpoint>
    url: string
}

export async function parsePagesForCapture(browser: BrowserProcess, opts: CaptureScreenshotsOptions): Promise<Array<ParsePageResult>> {
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
        const baseHref = await getBaseHref(page)
        const css = await findAllCss(page, baseHref)
        let anchorHrefs
        if (recursive) {
            anchorHrefs = await findAllSameOriginAnchorHrefs(page, baseHref)
        }
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
