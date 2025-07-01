import type { Browser, Page } from 'playwright'
import type { BrowserType } from 'playwright-core'
import { installBrowsersForNpmInstall } from 'playwright-core/lib/server'

export const BrowserEngineValues = ['chromium', 'firefox', 'webkit'] as const

export type BrowserEngine = (typeof BrowserEngineValues)[number]

export interface PlaywrightOptions {
    browser?: BrowserEngine
    contextLimit?: number
    headless?: boolean
}

export interface BrowserOptions {
    deviceScaleFactor?: number
    viewport?: {
        height: number
        width: number
    }
}

export async function launchBrowser(
    opts?: PlaywrightOptions,
): Promise<BrowserProcess> {
    const browser = opts?.browser || 'chromium'
    const headless = opts?.headless ?? true
    await installBrowsersForNpmInstall([
        resolvePlaywrightBrowserEngine(browser, headless),
    ])
    const browserType = await resolvePlaywrightBrowserType(browser)
    return new BrowserProcess(
        await browserType.launch({ headless }),
        opts?.contextLimit,
    )
}

function getContextLimitEnvVar() {
    const envVar = process.env['PLUNDER_BROWSER_LIMIT']
    if (envVar && envVar.length) {
        try {
            return parseInt(envVar, 10)
        } catch (ignore) {}
    }
}

export class BrowserProcess {
    #browser: Browser
    #contextLimit: number
    #queued: Array<{ res: (page: Page) => void; opts?: BrowserOptions }> = []

    constructor(browser: Browser, ctxLimit: number = 2) {
        this.#browser = browser
        this.#contextLimit = getContextLimitEnvVar() ?? ctxLimit
    }

    async newPage(opts?: BrowserOptions): Promise<Page> {
        if (this.#browser.contexts().length > this.#contextLimit) {
            return new Promise(res => {
                this.#queued.push({ res, opts })
            })
        } else {
            return this.#newPage(opts)
        }
    }

    async close(): Promise<void> {
        this.#queued = []
        return this.#browser.close()
    }

    async #newPage(opts?: BrowserOptions): Promise<Page> {
        this.#contextLimit++
        const page = await this.#browser.newPage({
            viewport: opts?.viewport,
        })
        page.on('close', this.#onPageClose)
        return page
    }

    #onPageClose = (page: Page) => {
        page.off('close', this.#onPageClose)
        this.#contextLimit--
        this.#resolveQueued()
    }

    #resolveQueued() {
        if (this.#queued.length) {
            const { res, opts } = this.#queued.pop()!
            this.#newPage(opts).then(res)
        }
    }
}

function resolvePlaywrightBrowserEngine(
    browser: BrowserEngine,
    headless: boolean,
): string {
    switch (browser) {
        case 'chromium':
            if (headless) {
                return 'chromium-headless-shell'
            } else {
                return 'chromium'
            }
        case 'firefox':
            return 'firefox'
        case 'webkit':
            return 'webkit'
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
