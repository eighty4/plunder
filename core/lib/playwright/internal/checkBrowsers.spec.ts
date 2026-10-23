import assert from 'node:assert/strict'
import { suite, test } from 'node:test'
import type { BrowserEngine } from '../../plunderBrowsers.ts'
import { type PlaywrightCliInstallList } from './cliInstallList.ts'
import { type PlaywrightCliInstallDryRun } from './cliInstallDryRun.ts'
import {
    internalCheckPlaywrightBrowserInstalls,
    type PlaywrightBrowserInstalls,
} from './checkBrowsers.ts'

suite('internalCheckPlaywrightBrowserInstalls', () => {
    test('detects up to date installed browser', () => {
        const browsers: Set<BrowserEngine> = new Set(['chromium'])
        const headless = true
        const installDryRun: PlaywrightCliInstallDryRun = {
            installs: [{ name: 'chromium-headless-shell', revision: '1234' }],
        }
        const installList: PlaywrightCliInstallList = {
            versions: [
                {
                    version: 'Some Playwright Version',
                    browsers: [
                        {
                            name: 'chromium-headless-shell',
                            revision: '1234',
                        },
                    ],
                    references: ['/irrelevant/path/to/does/not/matter'],
                },
            ],
        }
        const result = internalCheckPlaywrightBrowserInstalls(
            browsers,
            headless,
            installList,
            installDryRun,
        )
        assert.deepEqual(result, {
            needsUpdate: [],
            notInstalled: [],
            upToDate: ['chromium'],
        } satisfies Omit<PlaywrightBrowserInstalls, 'needsSystemDeps'>)
    })
    test('detects needs update installed browser', () => {
        const browsers: Set<BrowserEngine> = new Set(['chromium'])
        const headless = true
        const installDryRun: PlaywrightCliInstallDryRun = {
            installs: [{ name: 'chromium-headless-shell', revision: '1234' }],
        }
        const installList: PlaywrightCliInstallList = {
            versions: [
                {
                    version: 'Some Playwright Version',
                    browsers: [
                        {
                            name: 'chromium-headless-shell',
                            revision: '3513',
                        },
                    ],
                    references: ['/irrelevant/path/to/does/not/matter'],
                },
            ],
        }
        const result = internalCheckPlaywrightBrowserInstalls(
            browsers,
            headless,
            installList,
            installDryRun,
        )
        assert.deepEqual(result, {
            needsUpdate: ['chromium'],
            notInstalled: [],
            upToDate: [],
        } satisfies Omit<PlaywrightBrowserInstalls, 'needsSystemDeps'>)
    })
    test('detects not installed browser', () => {
        const browsers: Set<BrowserEngine> = new Set(['chromium'])
        const headless = true
        const installDryRun: PlaywrightCliInstallDryRun = {
            installs: [{ name: 'chromium-headless-shell', revision: '1234' }],
        }
        const installList: PlaywrightCliInstallList = {
            versions: [
                {
                    version: 'Some Playwright Version',
                    browsers: [
                        {
                            name: 'webkit',
                            revision: '1234',
                        },
                    ],
                    references: ['/irrelevant/path/to/does/not/matter'],
                },
            ],
        }
        const result = internalCheckPlaywrightBrowserInstalls(
            browsers,
            headless,
            installList,
            installDryRun,
        )
        assert.deepEqual(result, {
            needsUpdate: [],
            notInstalled: ['chromium'],
            upToDate: [],
        } satisfies Omit<PlaywrightBrowserInstalls, 'needsSystemDeps'>)
    })
})
