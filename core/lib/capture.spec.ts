import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { validateCaptureScreenshotsOptions } from './capture.ts'

describe('validateCaptureScreenshotsOptions', () => {
    it('throws error for all required fields', () => {
        assert.throws(
            () => validateCaptureScreenshotsOptions({} as any),
            (e: any) => {
                assert.equal(e.name, 'InvalidCaptureOptionsError')
                assert.deepEqual(e.fields, {
                    breakpoints: 'Required',
                    browser: 'Required',
                    deviceQueries: 'Required',
                    headless: 'Required',
                    modernDevices: 'Required',
                    outDir: 'Required',
                    progress: 'Required',
                    recursive: 'Required',
                    urls: 'Required',
                })
                return true
            },
        )
    })
})
