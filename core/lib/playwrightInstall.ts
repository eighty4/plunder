import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    installBrowsersForNpmInstall,
    registryDirectory,
} from 'playwright-core/lib/server'
import type { BrowserEngine } from './playwrightBrowsers.ts'

export type PlaywrightBrowserDistributions = {
    upToDate: Array<BrowserEngine>
    needsUpdate: Array<BrowserEngine>
    notInstalled: Array<BrowserEngine>
}

export async function checkPlaywrightBrowserDistributions(
    browsers: Array<BrowserEngine>,
    headless: boolean,
): Promise<PlaywrightBrowserDistributions> {
    if (!browsers.length) {
        throw new TypeError('must provide browsers to lookup')
    }
    const playwrightDistNames = browsers.map(browser =>
        resolvePlaywrightBrowserEngine(browser, headless),
    )
    const [playwrightManifest, playwrightDists] = await Promise.all([
        readBrowsersManifest(),
        readInstalledDistributions(),
    ])
    const result: PlaywrightBrowserDistributions = {
        upToDate: [],
        needsUpdate: [],
        notInstalled: [],
    }

    for (let i = 0; i < browsers.length; i++) {
        const browser: BrowserEngine = browsers[i]
        const playwrightDistName = playwrightDistNames[i]
        const formattedDistName = playwrightDistName.replace(/-/g, '_')
        const playwrightDistRevision = playwrightManifest.find(
            pb => pb.name === playwrightDistName,
        )?.revision
        if (!playwrightDistRevision) {
            throw new TypeError(
                `${playwrightDistName} browser resolved for engine ${browser} could not be found in browsers.json of 'plunder-core'`,
            )
        }
        const expectedPlaywrightDist = `${formattedDistName}-${playwrightDistRevision}`
        if (playwrightDists.includes(expectedPlaywrightDist)) {
            result.upToDate.push(browser)
        } else if (
            playwrightDists.some(pbd => pbd.startsWith(`${formattedDistName}-`))
        ) {
            result.needsUpdate.push(browser)
        } else {
            result.notInstalled.push(browser)
        }
    }
    return result
}

async function readBrowsersManifest(): Promise<
    Array<{ name: string; revision: string }>
> {
    const pwcFileUrl = import.meta.resolve('playwright-core')
    if (!/^file:\/\//.test(pwcFileUrl)) {
        throw new Error('asdf')
    }
    const browsersJsonPath = join(
        dirname(fileURLToPath(pwcFileUrl)),
        'browsers.json',
    )
    const browsersJson = await readFile(browsersJsonPath, 'utf-8')
    return JSON.parse(browsersJson).browsers
}

async function readInstalledDistributions(): Promise<Array<string>> {
    try {
        return await readdir(registryDirectory)
    } catch (e: unknown) {
        if (
            e !== null &&
            typeof e === 'object' &&
            'code' in e &&
            e.code === 'ENOENT'
        ) {
            return []
        } else {
            throw e
        }
    }
}

export async function installMissingBrowserDistributions(
    browser: BrowserEngine,
    headless: boolean,
) {
    await installBrowsersForNpmInstall([
        resolvePlaywrightBrowserEngine(browser, headless),
    ])
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
