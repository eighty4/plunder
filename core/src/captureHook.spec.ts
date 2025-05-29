import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { resolveCaptureHook, resolveCaptureHookImport } from './captureHook.ts'

describe('resolveCaptureHook', () => {
    let tmpDir: string

    beforeEach(async () => {
        tmpDir = await makeTempDir()
    })

    afterEach(async () => {
        await removeDir(tmpDir)
    })

    describe('calling CaptureHook', () => {
        it('throws CaptureHookError', async () => {
            const p = await makeFile(
                tmpDir,
                'capture.ts',
                `
export default async function (page) {
    throw new TypeError('Ginto Nord Condensed')
}
`,
            )
            const hook = await resolveCaptureHook(p)
            assert.equal(typeof hook, 'function')
            await assert.rejects(
                () => hook({ url: () => 'https://alistapart.com' } as any),
                (e: any) => {
                    assert.equal(e.name, 'CaptureHookError')
                    assert.equal(e.message, 'TypeError: Ginto Nord Condensed')
                    assert.equal(e.url, 'https://alistapart.com')
                    assert.equal(e.cause.name, 'TypeError')
                    assert.equal(e.cause.message, 'Ginto Nord Condensed')
                    return true
                },
            )
        })
    })

    it('error js syntax', async () => {
        const path = await makeFile(
            tmpDir,
            'capture.js',
            `
export default async function (page) => {
}
`,
        )
        await assert.rejects(
            () => resolveCaptureHook(path),
            (e: any) => {
                assert.equal(e.code, 'IMPORT_SYNTAX_ERR')
                assert.equal(e.cause.name, 'SyntaxError')
                return true
            },
        )
    })

    it('error ts syntax', async () => {
        const path = await makeFile(
            tmpDir,
            'capture.ts',
            `
import type {Playwright} from 'playwright'

export default async function (page: Playwright) => {
}
`,
        )
        await assert.rejects(
            () => resolveCaptureHook(path),
            (e: any) => {
                assert.equal(e.code, 'IMPORT_SYNTAX_ERR')
                assert.equal(e.cause.name, 'SyntaxError')
                return true
            },
        )
    })

    it('error source file not found', async () => {
        const path = join(tmpDir, 'capture.ts')
        const fn = 'pageSetup'
        const specifier = `${path}#${fn}`
        await assert.rejects(() => resolveCaptureHook(specifier), {
            name: 'CaptureHookImportError',
            message: `IMPORT_NOT_FOUND: ${specifier}`,
            code: 'IMPORT_NOT_FOUND',
            fn,
            path,
            specifier,
        })
    })

    it('error default export not found without any exports', async () => {
        const path = await makeFile(
            tmpDir,
            'capture.ts',
            'async function pageSetup() {}',
        )
        await assert.rejects(() => resolveCaptureHook(path), {
            name: 'CaptureHookImportError',
            message: `EXPORT_NOT_FOUND: ${path}`,
            code: 'EXPORT_NOT_FOUND',
            fn: 'default',
            path,
            specifier: path,
        })
    })

    it('error default export not found with named exports', async () => {
        const path = await makeFile(
            tmpDir,
            'capture.ts',
            `
export async function pageSetup() {
}`,
        )
        await assert.rejects(() => resolveCaptureHook(path), {
            name: 'CaptureHookImportError',
            message: `EXPORT_NOT_FOUND: ${path}`,
            code: 'EXPORT_NOT_FOUND',
            fn: 'default',
            path,
            specifier: path,
        })
    })

    it('error named export not found', async () => {
        const path = await makeFile(
            tmpDir,
            'capture.ts',
            `
export async function pageCapture() {
}`,
        )
        const specifier = path + '#pageSetup'
        await assert.rejects(() => resolveCaptureHook(specifier), {
            name: 'CaptureHookImportError',
            message: `EXPORT_NOT_FOUND: ${specifier}`,
            code: 'EXPORT_NOT_FOUND',
            fn: 'pageSetup',
            path,
            specifier: specifier,
        })
    })

    it('error default export not found with named exports', async () => {
        const path = await makeFile(
            tmpDir,
            'capture.ts',
            `export const capture = 'not a fn'`,
        )
        await assert.rejects(() => resolveCaptureHook(path + '#capture'), {
            name: 'CaptureHookImportError',
            message: `EXPORT_NOT_FUNCTION: ${path}#capture`,
            code: 'EXPORT_NOT_FUNCTION',
            fn: 'capture',
            path,
            specifier: path + '#capture',
            cause: 'string',
        })
    })

    it('finds default export', async () => {
        const p = await makeFile(
            tmpDir,
            'capture.ts',
            `
export default async function (page) {
    return Promise.resolve()
}
`,
        )
        const hook = await resolveCaptureHook(p)
        assert.equal(typeof hook, 'function')
    })

    it('finds named export', async () => {
        const p = await makeFile(
            tmpDir,
            'capture.ts',
            `
export async function pageSetup(page) {
    return Promise.resolve()
}
`,
        )
        const hook = await resolveCaptureHook(p + '#pageSetup')
        assert.equal(typeof hook, 'function')
    })
})

describe('resolveCaptureHookImport', () => {
    it('preserves absolute path', () => {
        assert.equal(
            resolveCaptureHookImport('/scripts/capturing.ts').path,
            '/scripts/capturing.ts',
        )
    })

    it('resolves relative path', () => {
        assert.equal(
            resolveCaptureHookImport('capturing.ts').path,
            join(process.cwd(), 'capturing.ts'),
        )
        assert.equal(
            resolveCaptureHookImport('./capturing.ts').path,
            join(process.cwd(), 'capturing.ts'),
        )
    })

    it('defaults fn to default', () => {
        assert.equal(resolveCaptureHookImport('capturing.ts').fn, 'default')
    })

    it('resolves fn export', () => {
        assert.deepEqual(resolveCaptureHookImport('capturing.ts#pageOne'), {
            path: join(process.cwd(), 'capturing.ts'),
            fn: 'pageOne',
        })
    })
})

async function makeFile(
    dirpath: string,
    filename: string,
    content: string,
): Promise<string> {
    const p = join(dirpath, filename)
    await writeFile(p, content)
    return p
}

async function makeTempDir(): Promise<string> {
    return await mkdtemp(join(tmpdir(), 'plunder-test-'))
}

async function removeDir(p: string): Promise<void> {
    await rm(p, { force: true, recursive: true })
}
