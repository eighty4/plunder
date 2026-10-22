import type { BrowserEngine } from '../../plunderBrowsers.ts'
import { getBrowserInstallsNeedingSystemDeps } from './cliInstallDepsDryRun.ts'
import type { PlaywrightCliInstallDryRun } from './cliInstallDryRun.ts'
import {
    playwrightInstallList,
    type PlaywrightCliInstallList,
} from './cliInstallList.ts'
import { readInstallDryRunFromBrowsersJson } from './fsInstallDryRun.ts'
import { type BrowserLabelForCLI } from './playwrightCli.ts'
import {
    resolveBrowserEngine,
    resolveBrowserLabelsForCLI,
} from './resolveLabels.ts'

export type PlaywrightBrowserInstalls = {
    upToDate: Array<BrowserEngine>
    needsUpdate: Array<BrowserEngine>
    needsSystemDeps: Array<BrowserEngine>
    notInstalled: Array<BrowserEngine>
}

export async function checkPlaywrightBrowserInstalls(
    browsers: Set<BrowserEngine>,
    headless: boolean,
): Promise<PlaywrightBrowserInstalls> {
    if (!browsers.size) throw TypeError('must provide browsers to lookup')
    const installList = await playwrightInstallList()
    const installDryRun = await readInstallDryRunFromBrowsersJson()
    const gettingNeedsSystemDeps = getBrowserInstallsNeedingSystemDeps(
        browsers,
        headless,
    )
    return {
        ...internalCheckPlaywrightBrowserInstalls(
            browsers,
            headless,
            installList,
            installDryRun,
        ),
        needsSystemDeps: await gettingNeedsSystemDeps,
    }
}

export function internalCheckPlaywrightBrowserInstalls(
    browsers: Set<BrowserEngine>,
    headless: boolean,
    installList: PlaywrightCliInstallList,
    installDryRun: PlaywrightCliInstallDryRun,
): Omit<PlaywrightBrowserInstalls, 'needsSystemDeps'> {
    const installedBrowsers: Map<
        BrowserLabelForCLI,
        Set<string>
    > = mapInstalledBrowserLabelsToRevisions(installList)

    const upToDate: Array<BrowserEngine> = []
    const needsUpdate: Array<BrowserEngine> = []
    const notInstalled: Array<BrowserEngine> = []

    const neededBrowserCliLabels = resolveBrowserLabelsForCLI(
        browsers,
        headless,
    )

    for (const browser of neededBrowserCliLabels) {
        const revision = installDryRun.installs.find(
            install => install.name === browser,
        )?.revision
        if (!revision) throw TypeError()
        const browserEngine = resolveBrowserEngine(browser)
        const installedBrowserRevisions = installedBrowsers.get(browser)
        if (installedBrowserRevisions) {
            if (installedBrowserRevisions.has(revision)) {
                upToDate.push(browserEngine)
            } else {
                needsUpdate.push(browserEngine)
            }
        } else {
            notInstalled.push(browserEngine)
        }
    }
    return {
        needsUpdate,
        notInstalled,
        upToDate,
    }
}

function mapInstalledBrowserLabelsToRevisions(
    installList: PlaywrightCliInstallList,
): Map<BrowserLabelForCLI, Set<string>> {
    const result: Map<BrowserLabelForCLI, Set<string>> = new Map()
    for (const version of installList.versions) {
        for (const browser of version.browsers) {
            result
                .getOrInsertComputed(browser.name, () => new Set())
                .add(browser.revision)
        }
    }
    return result
}
