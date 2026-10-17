import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BrowserEngine } from '../plunderBrowsers.ts'
import {
    type BrowserInstall,
    type BrowserLabelForCLI,
    execPlaywrightInstall,
} from './playwrightCli.ts'
import { readInstalledBrowsers } from './playwrightList.ts'

export type PlaywrightBrowserDistributions = {
    upToDate: Array<BrowserEngine>
    needsUpdate: Array<BrowserEngine>
    notInstalled: Array<BrowserEngine>
}

export async function checkPlaywrightBrowserDistributions(
    browsers: Set<BrowserEngine>,
    headless: boolean,
): Promise<PlaywrightBrowserDistributions> {
    if (!browsers.size) {
        throw new TypeError('must provide browsers to lookup')
    }
    const resolvingData = Promise.all([
        readBrowserRevisionsNeeded(),
        readInstalledBrowsers(),
    ])
    const plunderToPlaywrightMap = createMapOfBrowserLabelsForCLI(
        browsers,
        headless,
    )
    const result: PlaywrightBrowserDistributions = {
        upToDate: [],
        needsUpdate: [],
        notInstalled: [],
    }
    const [browsersManifest, installedBrowsers] = await resolvingData

    for (const browser of browsers) {
        const browserLabelForCLI = plunderToPlaywrightMap[browser]!
        const neededRevision = browsersManifest.find(
            pb => pb.name === browserLabelForCLI,
        )?.revision
        if (!neededRevision) {
            throw new TypeError(
                `${browserLabelForCLI} browser resolved for engine ${browser} could not be found in browsers.json of \`plunder-core\``,
            )
        }

        const installedBrowser = installedBrowsers.find(
            installedBrowser => installedBrowser.name === browserLabelForCLI,
        )
        if (!installedBrowser) {
            result.notInstalled.push(browser)
        } else if (installedBrowser.revision !== neededRevision) {
            result.needsUpdate.push(browser)
        } else {
            result.upToDate.push(browser)
        }
    }
    return result
}

async function readBrowserRevisionsNeeded(): Promise<Array<BrowserInstall>> {
    const browsersJsonPath = join(resolvePlaywrightCorePath(), 'browsers.json')
    const browsersJson = await readFile(browsersJsonPath, 'utf-8')
    return JSON.parse(browsersJson).browsers
}

function resolvePlaywrightCorePath(): string {
    const pwcFileUrl = import.meta.resolve('playwright-core')
    if (!/^file:\/\//.test(pwcFileUrl)) {
        throw new Error(
            'unable to resolve fs path to `playwright-core` npm dependency',
        )
    }
    return dirname(fileURLToPath(pwcFileUrl))
}

export async function installMissingBrowserDistributions(
    browsers: Set<BrowserEngine>,
    headless: boolean,
) {
    if (!browsers.size) throw TypeError()
    await execPlaywrightInstall(resolveBrowserLabelsForCLI(browsers, headless))
}

function createMapOfBrowserLabelsForCLI(
    browsers: Set<BrowserEngine>,
    headless: boolean,
): Partial<Record<BrowserEngine, BrowserLabelForCLI>> {
    const result: Partial<Record<BrowserEngine, BrowserLabelForCLI>> = {}
    for (const browser of browsers) {
        result[browser] = resolveBrowserLabelForCLI(browser, headless)
    }
    return result
}

function resolveBrowserLabelsForCLI(
    browsers: Set<BrowserEngine>,
    headless: boolean,
): Array<BrowserLabelForCLI> {
    return Array.from(browsers).map(browser =>
        resolveBrowserLabelForCLI(browser, headless),
    )
}

function resolveBrowserLabelForCLI(
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
    }
}
