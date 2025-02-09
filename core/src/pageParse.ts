import type {CaptureScreenshotsOptions} from './api.js'
import {findAllCss} from './cssFind.js'
import {type CssBreakpoint, parseCssForBreakpoints} from './cssParse.js'
import {findAllSameOriginAnchorHrefs} from './domParse.js'
import {BrowserProcess} from './playwright.js'
import {getBaseHref} from './url.js'

export interface ParsePageResult {
    anchorHrefs?: Array<string>
    breakpoints: Array<CssBreakpoint>
    url: string,
    errors: Array<ParsePageError>
}

export interface ParsePageError {
    parseStep: 'load-page' | 'find-base-href' | 'find-css' | 'find-anchor-hrefs'
    error: any
}

class ParsePageRetryer {
    #url: string
    errors: Array<ParsePageError> = []

    constructor(url: string) {
        this.#url = url
    }

    async try<T>(fn: () => Promise<T>, parseStep: ParsePageError['parseStep']): Promise<T> {
        const RETRIES = 3
        let attempts = 0
        while (attempts < RETRIES) {
            try {
                return await fn()
            } catch (error: any) {
                this.errors.push({parseStep, error})
                attempts++
            }
        }
        throw new Error(`retried page parsing step '${parseStep}' ${RETRIES} times on page ${this.#url}`)
    }
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
        const retryer = new ParsePageRetryer(url)
        await retryer.try(() => page.goto(url), 'load-page')
        const baseHref = await retryer.try(() => getBaseHref(page), 'find-base-href')
        const css = await retryer.try(() => findAllCss(page, baseHref), 'find-css')
        let anchorHrefs
        if (recursive) {
            anchorHrefs = await retryer.try(() => findAllSameOriginAnchorHrefs(page, baseHref), 'find-anchor-hrefs')
        }
        await page.close()
        const breakpoints = parseCssForBreakpoints(css).breakpoints
        return {
            anchorHrefs,
            breakpoints,
            url,
            errors: retryer.errors,
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
