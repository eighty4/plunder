import type { BrowserEngine } from '../../plunderBrowsers.ts'
import {
    execPlaywrightInstallDryRun,
    isBrowserLabelForCLI,
    type BrowserInstall,
} from './playwrightCli.ts'
import { resolveBrowserLabelsForCLI } from './resolveLabels.ts'

export type PlaywrightCliInstallDryRun = {
    installs: Array<BrowserInstall>
}

export async function playwrightInstallDryRun(
    browsers: Set<BrowserEngine>,
    headless: boolean,
): Promise<PlaywrightCliInstallDryRun> {
    if (!browsers.size) throw TypeError()
    const output = await execPlaywrightInstallDryRun(
        resolveBrowserLabelsForCLI(browsers, headless),
    )
    return parsePlaywrightCliInstallDryRun(output)
}

export function parsePlaywrightCliInstallDryRun(
    output: string,
): PlaywrightCliInstallDryRun {
    const sections = output.split(/\r?\n\r?\n/)
    const installs: Array<BrowserInstall> = []
    const pattern = /\(playwright (?<name>[a-z\-]+) v(?<revision>[\d]+)\)\n/
    for (const section of sections) {
        const match = section.match(pattern)
        if (match?.groups) {
            const { name, revision } = match.groups
            if (!isBrowserLabelForCLI(name)) throw TypeError()
            installs.push({ name, revision })
        }
    }
    return { installs }
}
