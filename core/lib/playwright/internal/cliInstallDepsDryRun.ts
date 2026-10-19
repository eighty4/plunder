import type { BrowserEngine } from '../../plunderBrowsers.ts'
import { execPlaywrightInstallDepsDryRun } from './playwrightCli.ts'
import {
    resolveBrowserLabelForCLI,
    resolveBrowserLabelsForCLI,
} from './resolveLabels.ts'

export async function getBrowserInstallsNeedingSystemDeps(
    browsers: Set<BrowserEngine>,
    headless: boolean,
): Promise<Array<BrowserEngine>> {
    if (!browsers.size) throw TypeError()
    const results: Array<BrowserEngine | null> = await Promise.all(
        Array.from(browsers).map(async browser => {
            const result = await execPlaywrightInstallDepsDryRun([
                resolveBrowserLabelForCLI(browser, headless),
            ])
            if (result.success) {
                return null
            } else {
                return browser
            }
        }),
    )
    return results.filter(result => result !== null)
}

export type PlaywrightCliInstallDepsDryRun = {
    dependencies: Array<string>
}

export async function getBrowserInstallNeededDeps(
    browsers: Set<BrowserEngine>,
    headless: boolean,
): Promise<PlaywrightCliInstallDepsDryRun> {
    const result = await execPlaywrightInstallDepsDryRun(
        resolveBrowserLabelsForCLI(browsers, headless),
    )
    if (result.success) {
        return { dependencies: [] }
    } else {
        return parsePlaywrightCliInstallDepsDryRun(result.output)
    }
}

export function parsePlaywrightCliInstallDepsDryRun(
    output: string,
): PlaywrightCliInstallDepsDryRun {
    return {
        dependencies: output
            .split(/\r?\n/)
            .slice(1)
            .map(s => s.trim()),
    }
}
