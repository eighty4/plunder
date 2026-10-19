import type { BrowserEngine } from '../../plunderBrowsers.ts'
import type { BrowserLabelForCLI } from './playwrightCli.ts'

export function resolveBrowserLabelsForCLI(
    browsers: Set<BrowserEngine>,
    headless: boolean,
): Array<BrowserLabelForCLI> {
    return Array.from(browsers).map(browser =>
        resolveBrowserLabelForCLI(browser, headless),
    )
}

export function resolveBrowserLabelForCLI(
    browser: BrowserEngine,
    headless: boolean,
): BrowserLabelForCLI {
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
        default:
            throw TypeError()
    }
}

export function resolveBrowserEngine(
    browser: BrowserLabelForCLI,
): BrowserEngine {
    switch (browser) {
        case 'chromium':
        case 'chromium-headless-shell':
            return 'chromium'
        case 'firefox':
            return 'firefox'
        case 'webkit':
            return 'webkit'
        default:
            throw TypeError()
    }
}
