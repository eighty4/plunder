import type { Page } from 'playwright-core'
import type { CaptureScreenshotsOptions } from './api.ts'
import type { CaptureProgressUpdater } from './captureUpdater.js'
import { findAllCss } from './cssFind.ts'
import { type CssMediaQuery, parseCssForMediaQueries } from './cssParse.ts'
import { findAllSameOriginAnchorHrefs } from './domParse.ts'
import type { BrowserManager } from './playwrightProcess.ts'
import { getBaseHref } from './url.ts'

export interface ParsePageResult {
    anchorHrefs?: Array<string>
    mediaQueries: Array<CssMediaQuery>
    url: string
}

export async function parsePageForBreakpoints(
    page: Page,
    url: string,
    recursive: boolean = false,
): Promise<ParsePageResult> {
    await page.goto(url)
    const baseHref = await getBaseHref(page)
    const css = await findAllCss(page, baseHref)
    let anchorHrefs
    if (recursive) {
        anchorHrefs = await findAllSameOriginAnchorHrefs(page, baseHref)
    }
    await page.close()
    const { mediaQueries } = parseCssForMediaQueries(css)
    return {
        anchorHrefs,
        mediaQueries,
        url,
    }
}

export async function parsePagesForCapture(
    browsers: BrowserManager,
    opts: CaptureScreenshotsOptions,
    updater: CaptureProgressUpdater,
): Promise<Array<ParsePageResult>> {
    const parsingPages: Record<string, Promise<ParsePageResult>> = {}
    const parsedPages: Array<ParsePageResult> = []

    function initParsingPages(urls: Array<string>) {
        updater.markPageParsingStarting(urls.length)
        for (const url of urls) {
            if (typeof parsingPages[url] === 'undefined') {
                parsingPages[url] = browsers
                    .newPage('chromium', true)
                    .then(page =>
                        parsePageForBreakpoints(page, url, opts.recursive),
                    )
            }
        }
    }

    async function drainCompletedParsingPages() {
        while (Object.keys(parsingPages).length) {
            const parsedPage = await Promise.race(Object.values(parsingPages))
            updater.markPageParsed()
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
