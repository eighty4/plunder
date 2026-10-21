import type { Browser, BrowserType, Page } from 'playwright'
import type { BrowserEngine, BrowserOptions } from '../plunderBrowsers.ts'

type BrowserLaunch =
    | {
          state: 'launching'
          launching: Promise<Browser>
      }
    | {
          state: 'launched'
          launched: Browser
      }

type QueuedPageReq = {
    browser: BrowserEngine
    headless: boolean
    opts?: BrowserOptions
    res: (page: Page) => void
}

export class BrowserManager {
    // map of browser instances
    #browsers: Record<
        BrowserEngine,
        Record<'headed' | 'headless', BrowserLaunch | null>
    >
    #contextLimit: number
    #queued: Array<QueuedPageReq>

    constructor(ctxLimit: number = 2) {
        this.#browsers = {
            chromium: { headed: null, headless: null },
            firefox: { headed: null, headless: null },
            webkit: { headed: null, headless: null },
        }
        this.#contextLimit = getContextLimitEnvVar() ?? ctxLimit
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
            Object.values(this.#browsers)
                .flatMap(browsers => Object.values(browsers))
                .filter(browser => browser !== null)
                .map(async browser => {
                    switch (browser.state) {
                        case 'launched':
                            return await browser.launched.close()
                        case 'launching':
                            return await (await browser.launching).close()
                    }
                }),
        )
    }

    async #browser(
        browser: BrowserEngine,
        headless: boolean,
    ): Promise<Browser> {
        const headlessKey = headless ? 'headless' : 'headed'
        if (!this.#browsers[browser][headlessKey]) {
            this.#browsers[browser][headlessKey] = {
                state: 'launching',
                launching: launchBrowser(browser, headless),
            }
            const launched =
                await this.#browsers[browser][headlessKey].launching
            launched.once('disconnected', () =>
                this.#onBrowserDisconnected(browser, headless),
            )
            this.#browsers[browser][headlessKey] = {
                state: 'launched',
                launched,
            }
            return launched
        } else if (this.#browsers[browser][headlessKey].state === 'launching') {
            return await this.#browsers[browser][headlessKey].launching
        } else {
            return this.#browsers[browser][headlessKey].launched
        }
    }

    get #currentContextCount(): number {
        return Object.values(this.#browsers)
            .flatMap(browsers => Object.values(browsers))
            .filter(browser => browser !== null)
            .reduce((n, browser) => {
                if (browser.state === 'launching') {
                    return n
                } else {
                    return n + browser.launched.contexts().length
                }
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
        this.#browsers[browser][headless ? 'headless' : 'headed'] = null
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

function getContextLimitEnvVar(): number | undefined {
    const val = process.env['PLUNDER_BROWSER_LIMIT']
    if (val && val.length) {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed)) {
            throw TypeError(
                `environment variable PLUNDER_BROWSER_LIMIT value \`${val}\` must be a number`,
            )
        }
        return parsed
    }
    return undefined
}

async function resolvePlaywrightBrowserType(
    browser: BrowserEngine,
): Promise<BrowserType> {
    const playwright = await import('playwright')
    switch (browser) {
        case 'chromium':
        case 'firefox':
        case 'webkit':
            return playwright[browser]
        default:
            throw TypeError(`unsupported browser ${browser}`)
    }
}
