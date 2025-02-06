import type {Browser, Page} from 'playwright'
import type {BrowserContextOptions, BrowserType} from 'playwright-core'

export const BrowserEngineValues = ['chromium', 'firefox', 'webkit'] as const

export type BrowserEngine = typeof BrowserEngineValues[number]

export interface PlaywrightOptions {
    browser?: BrowserEngine
    contextLimit?: number
    headless?: boolean
}

export async function launchBrowser(opts?: PlaywrightOptions): Promise<BrowserProcess> {
    const browser = opts?.browser || 'chromium'
    const headless = opts?.headless ?? true
    await installPlaywrightBrowser(browser, headless)
    const browserType = await resolvePlaywrightBrowserType(browser)
    return new BrowserProcess(await browserType.launch({headless}), opts?.contextLimit)
}

export class BrowserProcess {
    #browser: Browser
    #contextLimit: number
    #queued: Array<{ res: (page: Page) => void, viewport?: BrowserContextOptions['viewport'] }> = []

    constructor(browser: Browser, ctxLimit: number = 8) {
        this.#browser = browser
        this.#contextLimit = ctxLimit
    }

    async newPage(viewport?: BrowserContextOptions['viewport']): Promise<Page> {
        if (this.#browser.contexts().length > this.#contextLimit) {
            return new Promise((res) => {
                this.#queued.push({res, viewport})
            })
        } else {
            return this.#newPage(viewport)
        }
    }

    async close(): Promise<void> {
        this.#queued = []
        return this.#browser.close()
    }

    async #newPage(viewport?: BrowserContextOptions['viewport']): Promise<Page> {
        this.#contextLimit++
        const page = await this.#browser.newPage({viewport})
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
            const {res, viewport} = this.#queued.pop()!
            this.#newPage(viewport).then(res)
        }
    }
}

async function installPlaywrightBrowser(browser: BrowserEngine, headless: boolean) {
    // @ts-ignore
    await (await import('playwright-core/lib/server'))
        .installBrowsersForNpmInstall([resolvePlaywrightBrowserEngine(browser, headless)])
}

function resolvePlaywrightBrowserEngine(browser: BrowserEngine, headless: boolean): string {
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

async function resolvePlaywrightBrowserType(browser: BrowserEngine): Promise<BrowserType> {
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
