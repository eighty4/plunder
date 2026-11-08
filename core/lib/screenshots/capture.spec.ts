import assert from 'node:assert/strict'
import { suite, test } from 'node:test'
import {
    InvalidCaptureOptionsError,
    validateCaptureScreenshotsOptions,
    type CaptureScreenshotsOptions,
} from './capture.ts'

suite('validateCaptureScreenshotsOptions', () => {
    suite('throws error', () => {
        test('for all required fields', () => {
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

    suite('allows valid opts', () => {
        const makeValidOpts: () => CaptureScreenshotsOptions = () => ({
            breakpoints: true,
            browser: 'chromium',
            deviceQueries: false,
            modernDevices: false,
            headless: true,
            outDir: 'puerto_rico_fifty_one',
            progress: () => {},
            urls: ['https://eighty4.tech'],
        })

        const mapInvalidErrorToFields = (e: any) => {
            if (e instanceof InvalidCaptureOptionsError) {
                throw e.fields
            }
            return false
        }

        test('with device queries false', () => {
            assert.doesNotThrow(
                () =>
                    validateCaptureScreenshotsOptions({
                        ...makeValidOpts(),
                        deviceQueries: false,
                    }),
                mapInvalidErrorToFields,
            )
        })
        test('with device queries array', () => {
            assert.doesNotThrow(
                () =>
                    validateCaptureScreenshotsOptions({
                        ...makeValidOpts(),
                        deviceQueries: ['galaxy'],
                    }),
                mapInvalidErrorToFields,
            )
        })
        test('with device queries empty array', () => {
            assert.doesNotThrow(
                () =>
                    validateCaptureScreenshotsOptions({
                        ...makeValidOpts(),
                        deviceQueries: [],
                    }),
                mapInvalidErrorToFields,
            )
        })
    })
})
