import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PlaywrightCliInstallDryRun } from './cliInstallDryRun.ts'
import type { BrowserInstall, BrowserLabelForCLI } from './playwrightCli.ts'

export async function readInstallDryRunFromBrowsersJson(): Promise<PlaywrightCliInstallDryRun> {
    const browsersJson = await readBrowsersJson()
    return {
        installs: browsersJson.browsers.map<BrowserInstall>(b => ({
            name: b.name,
            revision: b.revision,
        })),
    }
}

type BrowsersJson = {
    browsers: Array<{
        name: BrowserLabelForCLI
        revision: string
    }>
}

async function readBrowsersJson(): Promise<BrowsersJson> {
    return JSON.parse(
        await readFile(
            join(resolvePlaywrightCorePath(), 'browsers.json'),
            'utf-8',
        ),
    )
}

function resolvePlaywrightCorePath(): string {
    const pwcFileUrl = import.meta.resolve('playwright-core')
    if (!/^file:\/\//.test(pwcFileUrl)) {
        throw Error(
            'unable to resolve fs path to `playwright-core` npm dependency',
        )
    }
    return dirname(fileURLToPath(pwcFileUrl))
}
