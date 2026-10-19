import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { validateCaptureScreenshotsOptions } from './captureScreenshots.ts'

describe('validateCaptureScreenshotsOptions', () => {
    it('throws error for all required fields', () => {
        assert.throws(
            () => validateCaptureScreenshotsOptions({} as any),
            (e: any) => {
                assert.equal(e.name, 'InvalidCaptureOptionsError')
                assert.equal(
                    new Set(Object.keys(e.fields)).difference(
                        new Set([
                            'breakpoints',
                            'browser',
                            'deviceQueries',
                            'headless',
                            'modernDevices',
                            'outDir',
                            'progress',
                            'recursive',
                            'urls',
                        ]),
                    ).size,
                    0,
                )
                return true
            },
        )
    })
})
