import assert from 'node:assert/strict'
import { suite, test } from 'node:test'
import { readTestOutput } from './test_output/readTestOutput.ts'
import { parsePlaywrightCliInstallDryRun } from './cliInstallDryRun.ts'

suite('parsePlaywrightInstallDryRun', () => {
    test('parse single digit number from linux_chromium_1.64.1', async () => {
        const output = await readTestOutput('install_dry_run/chromium_1.64.1')
        const result = parsePlaywrightCliInstallDryRun(output)
        assert.equal(result.installs.length, 3)
        assert.equal(
            result.installs.find(b => b.name === 'chromium')?.revision,
            '1248',
        )
        assert.equal(
            result.installs.find(b => b.name === 'chromium-headless-shell')
                ?.revision,
            '1248',
        )
        assert.equal(
            result.installs.find(b => b.name === 'ffmpeg')?.revision,
            '1013',
        )
    })
})
