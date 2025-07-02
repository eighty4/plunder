import type { Browser, BrowserType, Page } from 'playwright'
import type { BrowserEngine, BrowserOptions } from './playwrightBrowsers.ts'

type BrowserLookup<T> = Record<
    BrowserEngine,
    Record<'headed' | 'headless', T | null>
>

type QueuedPageReq = {
    browser: BrowserEngine
    headless: boolean
    opts?: BrowserOptions
    res: (page: Page) => void
}

export class BrowserManager {
    // map of browser instances
    #browsers: BrowserLookup<Browser>
    #contextLimit: number
    // tracks browsers as they're launched to prevent relaunching
    #launched: BrowserLookup<Promise<Browser>>
    #queued: Array<QueuedPageReq>

    constructor(ctxLimit: number = 2) {
        this.#browsers = createBrowserLookup()
        this.#contextLimit = getContextLimitEnvVar() ?? ctxLimit
        this.#launched = createBrowserLookup()
        this.#queued = []
    }

    async newPage(
        browser: BrowserEngine,
        headless: boolean,
        opts?: BrowserOptions,
    ): Promise<Page> {
        if (this.#currentContextCount > this.#contextLimit) {
            return new Promise(res => {
                this.#queued.push({ browser, headless, res, opts })
            })
        } else {
            return this.#newPage(browser, headless, opts)
        }
    }

    async shutdown() {
        await Promise.all(
            Object.values(this.#launched)
                .flatMap(browsers => Object.values(browsers))
                .filter(browser => browser !== null)
                .map(async browser => (await browser).close()),
        )
    }

    async #browser(
        browser: BrowserEngine,
        headless: boolean,
    ): Promise<Browser> {
        const headlessKey = headless ? 'headless' : 'headed'
        if (!this.#launched[browser][headlessKey]) {
            this.#launched[browser][headlessKey] = launchBrowser(
                browser,
                headless,
            )
        }
        if (!this.#browsers[browser][headlessKey]) {
            this.#browsers[browser][headlessKey] = (
                await this.#launched[browser][headlessKey]
            ).once('disconnected', () =>
                this.#onBrowserDisconnected(browser, headless),
            )
        }
        return this.#browsers[browser][headlessKey]
    }

    get #currentContextCount(): number {
        return Object.values(this.#browsers)
            .flatMap(browsers => Object.values(browsers))
            .filter(browser => browser !== null)
            .reduce((n, browser) => {
                return n + browser.contexts().length
            }, 0)
    }

    async #newPage(
        browser: BrowserEngine,
        headless: boolean,
        opts?: BrowserOptions,
    ): Promise<Page> {
        this.#contextLimit++
        const page = await (
            await this.#browser(browser, headless)
        ).newPage({
            viewport: opts?.viewport,
        })
        page.once('close', this.#onPageClose)
        return page
    }

    #onBrowserDisconnected(browser: BrowserEngine, headless: boolean) {
        const headlessKey = headless ? 'headless' : 'headed'
        this.#browsers[browser][headlessKey] = this.#launched[browser][
            headlessKey
        ] = null
    }

    #onPageClose = () => {
        this.#contextLimit--
        const popped = this.#queued.pop()
        if (popped) {
            const { browser, headless, opts, res } = popped
            this.#newPage(browser, headless, opts).then(res)
        }
    }
}

async function launchBrowser(
    browser: BrowserEngine,
    headless: boolean,
): Promise<Browser> {
    const browserType = await resolvePlaywrightBrowserType(browser)
    return await browserType.launch({ headless })
}

function createBrowserLookup(): BrowserLookup<any> {
    return {
        chromium: { headed: null, headless: null },
        firefox: { headed: null, headless: null },
        webkit: { headed: null, headless: null },
    }
}

function getContextLimitEnvVar() {
    const envVar = process.env['PLUNDER_BROWSER_LIMIT']
    if (envVar && envVar.length) {
        try {
            return parseInt(envVar, 10)
        } catch (ignore) {}
    }
}

async function resolvePlaywrightBrowserType(
    browser: BrowserEngine,
): Promise<BrowserType> {
    switch (browser) {
        case 'chromium':
            return (await import('playwright')).chromium
        case 'firefox':
            return (await import('playwright')).firefox
        case 'webkit':
            return (await import('playwright')).webkit
        default:
            throw new Error(`unsupported browser ${browser}`)
    }
}
