import type { Page } from 'playwright-core'
import { findAllCss, type FindCssResult } from '../cssFind.ts'
import { type CssMediaQuery, parseCssForMediaQueries } from '../cssParse.ts'
import type { BrowserManager } from '../playwright/playwrightProcess.ts'
import { getBaseHref } from '../url.ts'
import type { CaptureScreenshotsOptions } from './capture.ts'
import type { CaptureScreenshotsUpdater } from './updater.ts'

export interface ParsePageResult {
    mediaQueries: Array<CssMediaQuery>
    url: string
}

export async function parsePageForMediaQueries(
    page: Page,
    url: string,
): Promise<ParsePageResult> {
    let css: FindCssResult
    try {
        await page.goto(url)
        const baseHref = await getBaseHref(page)
        css = await findAllCss(page, baseHref)
    } finally {
        await page.close()
    }
    const { mediaQueries } = parseCssForMediaQueries(css)
    return {
        mediaQueries,
        url,
    }
}

export async function parsePagesForMediaQueries(
    browsers: BrowserManager,
    opts: CaptureScreenshotsOptions,
    updater: CaptureScreenshotsUpdater,
): Promise<Array<ParsePageResult>> {
    const parsingPages: Record<string, Promise<ParsePageResult>> = {}
    const parsedPages: Array<ParsePageResult> = []

    function initParsingPages(urls: Array<string>) {
        updater.markPageParsingStarting(urls.length)
        for (const url of urls) {
            if (typeof parsingPages[url] === 'undefined') {
                parsingPages[url] = browsers
                    .newPage('chromium', true)
                    .then(page => parsePageForMediaQueries(page, url))
            }
        }
    }

    async function drainCompletedParsingPages() {
        while (Object.keys(parsingPages).length) {
            const parsedPage = await Promise.race(Object.values(parsingPages))
            updater.markPageParsed()
            delete parsingPages[parsedPage.url]
            parsedPages.push(parsedPage)
        }
    }

    initParsingPages(opts.urls)
    await drainCompletedParsingPages()
    return parsedPages
}
