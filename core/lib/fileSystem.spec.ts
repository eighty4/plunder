import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { suite, test } from 'node:test'
import { makeOutDirForPageUrl } from './fileSystem.ts'

suite('makeOutDirForPageUrl', () => {
    test('for root domain', async () => {
        for (const protocol of ['http', 'https']) {
            const testRootDir = await mkdtemp(join(tmpdir(), 'PLUNDER-TEST-'))
            const result = await makeOutDirForPageUrl(
                testRootDir,
                protocol + '://alistapart.com',
            )
            assert.ok(existsSync(result.webpageOutDir))
            assert.equal(
                result.webpageOutDir,
                join(testRootDir, 'alistapart.com'),
            )
            assert.equal(result.webpageSubpathWithinOutDir, 'alistapart.com')
        }
    })
    test('for website subpath', async () => {
        for (const protocol of ['http', 'https']) {
            const testRootDir = await mkdtemp(join(tmpdir(), 'PLUNDER-TEST-'))
            const result = await makeOutDirForPageUrl(
                testRootDir,
                protocol + '://alistapart.com/and/apageapart',
            )
            assert.ok(existsSync(result.webpageOutDir))
            assert.equal(
                result.webpageOutDir,
                join(testRootDir, 'alistapart.com/and/apageapart'),
            )
            assert.equal(
                result.webpageSubpathWithinOutDir,
                'alistapart.com/and/apageapart',
            )
        }
    })
})
