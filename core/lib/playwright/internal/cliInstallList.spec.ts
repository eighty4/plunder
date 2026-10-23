import assert from 'node:assert/strict'
import { suite, test } from 'node:test'
import {
    parsePlaywrightCliInstallList,
    type PlaywrightVersionInstalls,
} from './cliInstallList.ts'
import { readTestOutput } from './test_output/readTestOutput.ts'

suite('parsePlaywrightCliInstallList', () => {
    test('parse list of dependencies', async () => {
        const output = await readTestOutput('install_list/macos_1.64.1')
        const result = parsePlaywrightCliInstallList(output)
        assert.equal(result.versions.length, 4)
        assert.deepEqual(result.versions[0], {
            version: '1.53.2',
            browsers: [
                {
                    name: 'ffmpeg',
                    revision: '1011',
                },
            ],
            references: [
                '/Users/developer/workspace/plunder/node_modules/.pnpm/playwright-core@1.53.2/node_modules/playwright-core',
            ],
        } satisfies PlaywrightVersionInstalls)
        assert.deepEqual(result.versions[3], {
            version: '1.64.0',
            browsers: [
                {
                    name: 'chromium',
                    revision: '1248',
                },
                {
                    name: 'chromium-headless-shell',
                    revision: '1248',
                },
                {
                    name: 'ffmpeg',
                    revision: '1013',
                },
                {
                    name: 'firefox',
                    revision: '1555',
                },
                {
                    name: 'webkit',
                    revision: '2370',
                },
            ],
            references: [
                '/Users/developer/workspace/plunder/node_modules/.pnpm/playwright-core@1.64.0/node_modules/playwright-core',
            ],
        } satisfies PlaywrightVersionInstalls)
    })
})
