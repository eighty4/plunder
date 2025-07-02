import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { type CaptureScreenshotsOptions } from './capture.ts'
import { resolveCaptureManifest } from './captureManifest.ts'
import { compareMediaQueries, type CssMediaQuery } from './cssParse.ts'

describe('resolveCaptureManifest', () => {
    it('resolves css breakpoint screenshots', () => {
        const mediaQueries: Array<CssMediaQuery> = [
            {
                filename: 'index.css',
                code: {
                    line: 0,
                    column: 1,
                    startIndex: 0,
                    endIndex: 1,
                    excerpt: '',
                },
                breakpoints: [
                    {
                        bound: 'upper' as const,
                        dimension: {
                            uom: 'px' as const,
                            value: 800,
                        },
                    },
                    {
                        bound: 'lower' as const,
                        dimension: {
                            uom: 'px' as const,
                            value: 600,
                        },
                    },
                ],
            },
        ].sort(compareMediaQueries)
        const result = resolveCaptureManifest('dir/path', 'url', mediaQueries, {
            deviceQueries: false,
        } as CaptureScreenshotsOptions)
        assert.deepEqual(result, {
            dir: 'dir/path',
            devices: [],
            mediaQueryBreakpoints: [
                {
                    bound: 'lower',
                    dimension: { uom: 'px', value: 600 },
                    locations: [
                        {
                            filename: 'index.css',
                            code: {
                                line: 0,
                                column: 1,
                                startIndex: 0,
                                endIndex: 1,
                                excerpt: '',
                            },
                        },
                    ],
                    screenshotOn: 'w_600.png',
                    screenshotOut: 'w_599.png',
                },
                {
                    bound: 'upper',
                    dimension: { uom: 'px', value: 800 },
                    locations: [
                        {
                            filename: 'index.css',
                            code: {
                                line: 0,
                                column: 1,
                                startIndex: 0,
                                endIndex: 1,
                                excerpt: '',
                            },
                        },
                    ],
                    screenshotOn: 'w_800.png',
                    screenshotOut: 'w_801.png',
                },
            ],
            screenshots: {
                'w_599.png': {
                    viewport: {
                        height: 600,
                        width: 599,
                    },
                },
                'w_600.png': {
                    viewport: {
                        height: 600,
                        width: 600,
                    },
                },
                'w_800.png': {
                    viewport: {
                        height: 600,
                        width: 800,
                    },
                },
                'w_801.png': {
                    viewport: {
                        height: 600,
                        width: 801,
                    },
                },
            },
            url: 'url',
        })
    })

    it('resolves landscape/portrait device screenshots', () => {
        const result = resolveCaptureManifest('dir/path', 'url', [], {
            deviceQueries: ['iPhone 15 Pro Max'],
        } as CaptureScreenshotsOptions)
        assert.deepEqual(result, {
            dir: 'dir/path',
            devices: [
                {
                    definition: {
                        browser: 'webkit',
                        label: 'iPhone 15 Pro Max',
                        type: 'mobile',
                        landscape: {
                            deviceScaleFactor: 3,
                            viewport: {
                                width: 814,
                                height: 380,
                            },
                        },
                        portrait: {
                            deviceScaleFactor: 3,
                            viewport: {
                                width: 430,
                                height: 739,
                            },
                        },
                    },
                    landscape: 'iphone-15-pro-max_landscape.png',
                    portrait: 'iphone-15-pro-max_portrait.png',
                },
            ],
            mediaQueryBreakpoints: [],
            screenshots: {
                'iphone-15-pro-max_landscape.png': {
                    deviceScaleFactor: 3,
                    viewport: {
                        width: 814,
                        height: 380,
                    },
                },
                'iphone-15-pro-max_portrait.png': {
                    deviceScaleFactor: 3,
                    viewport: {
                        width: 430,
                        height: 739,
                    },
                },
            },
            url: 'url',
        })
    })

    it('resolves desktop device screenshots', () => {
        const deviceQueries = ['Desktop Chrome', 'Desktop Chrome HiDPI']
        const opts = { deviceQueries } as CaptureScreenshotsOptions
        const result = resolveCaptureManifest('dir/path', 'url', [], opts)
        assert.deepEqual(result, {
            dir: 'dir/path',
            devices: [
                {
                    definition: {
                        browser: 'chromium',
                        label: 'Desktop Chrome',
                        type: 'desktop',
                        landscape: {
                            deviceScaleFactor: 1,
                            viewport: {
                                width: 1280,
                                height: 720,
                            },
                        },
                    },
                    landscape: 'desktop-chrome.png',
                    portrait: undefined,
                },
                {
                    definition: {
                        browser: 'chromium',
                        label: 'Desktop Chrome HiDPI',
                        type: 'desktop',
                        landscape: {
                            deviceScaleFactor: 2,
                            viewport: {
                                width: 1280,
                                height: 720,
                            },
                        },
                    },
                    landscape: 'desktop-chrome-hidpi.png',
                    portrait: undefined,
                },
            ],
            mediaQueryBreakpoints: [],
            screenshots: {
                'desktop-chrome.png': {
                    deviceScaleFactor: 1,
                    viewport: {
                        width: 1280,
                        height: 720,
                    },
                },
                'desktop-chrome-hidpi.png': {
                    deviceScaleFactor: 2,
                    viewport: {
                        width: 1280,
                        height: 720,
                    },
                },
            },
            url: 'url',
        })
    })
})
