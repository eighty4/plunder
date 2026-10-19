import assert from 'node:assert/strict'
import { suite, test } from 'node:test'
import { readTestOutput } from './test_output/readTestOutput.ts'
import { parsePlaywrightCliInstallDepsDryRun } from './cliInstallDepsDryRun.ts'

suite('parsePlaywrightCliInstallDepsDryRun', () => {
    test('parse list of dependencies', async () => {
        const output = await readTestOutput(
            'install_deps_dry_run/linux_chromium_1.64.1',
        )
        const result = parsePlaywrightCliInstallDepsDryRun(output)
        assert.equal(result.dependencies.length, 9)
        assert.deepEqual(result.dependencies, [
            'fonts-freefont-ttf',
            'fonts-ipafont-gothic',
            'fonts-tlwg-loma-otf',
            'fonts-unifont',
            'fonts-wqy-zenhei',
            'xfonts-cyrillic',
            'xfonts-encodings',
            'xfonts-scalable',
            'xfonts-utils',
        ])
    })
})
