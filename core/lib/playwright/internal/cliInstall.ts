import type { BrowserEngine } from '../../plunderBrowsers.ts'
import { execPlaywrightInstall } from './playwrightCli.ts'
import { resolveBrowserLabelsForCLI } from './resolveLabels.ts'

export async function playwrightInstall(
    browsers: Set<BrowserEngine>,
    headless: boolean,
) {
    if (!browsers.size) throw TypeError()
    await execPlaywrightInstall(resolveBrowserLabelsForCLI(browsers, headless))
}
