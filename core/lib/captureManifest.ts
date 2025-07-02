import {
    type CssBreakpoint,
    type CssDimension,
    type CssMediaQuery,
    type CssUom,
} from './cssParse.ts'
import { type CaptureScreenshotsOptions } from './captureScreenshots.ts'
import { type DeviceDefinition, resolveDevices } from './devices.ts'
import {
    type BrowserEngine,
    type BrowserOptions,
} from './playwrightBrowsers.ts'

// representation of json written to capture out dir for each
// captured webpage types are exported from lib and used by webapp
export interface CaptureScreenshotManifest {
    dir: string
    devices: Array<DeviceScreenshots>
    mediaQueryBreakpoints: Array<MediaQueryBreakpoint> | null
    screenshots: Record<string, ScreenshotConfiguration>
    url: string
}

export interface ScreenshotConfiguration {
    browser: BrowserEngine
    pageSpec: BrowserOptions
}

export interface MediaQueryBreakpoint {
    bound: 'exact' | 'lower' | 'upper'
    dimension: CssDimension
    locations: Array<MediaQueryLocation>
    screenshotOn: string
    screenshotOut: string
}

export type MediaQueryLocation = Pick<CssMediaQuery, 'code' | 'filename'>

export interface BreakpointScreenshots {
    bound: 'lower' | 'upper'
    dimension: CssDimension
    screenshotOn: string
    screenshotOut: string
}

export interface DeviceScreenshots {
    definition: DeviceDefinition
    landscape: string
    portrait?: string
}

export function resolveCaptureManifest(
    dir: string,
    url: string,
    mediaQueries: Array<CssMediaQuery> | null,
    opts: CaptureScreenshotsOptions,
): CaptureScreenshotManifest {
    const manifest: CaptureScreenshotManifest = {
        dir,
        devices: [],
        mediaQueryBreakpoints: null,
        screenshots: {},
        url,
    }
    resolveDeviceScreenshots(manifest, opts)
    if (mediaQueries) {
        resolveMediaQueryScreenshots(manifest, mediaQueries, opts)
    }
    return manifest
}

type DuplicateTracking = Record<
    CssBreakpoint['bound'],
    Record<CssUom, Record<number, Array<CssMediaQuery>>>
>

function createMergingStructure(): DuplicateTracking {
    return {
        exact: {
            px: {},
            rem: {},
        },
        lower: {
            px: {},
            rem: {},
        },
        upper: {
            px: {},
            rem: {},
        },
    }
}

function resolveMediaQueryScreenshots(
    manifest: CaptureScreenshotManifest,
    mediaQueries: Array<CssMediaQuery>,
    opts: CaptureScreenshotsOptions,
) {
    manifest.mediaQueryBreakpoints = []
    const merging = createMergingStructure()
    for (const mediaQuery of mediaQueries) {
        for (const breakpoint of mediaQuery.breakpoints) {
            const mergingBoundAndUnit =
                merging[breakpoint.bound][breakpoint.dimension.uom]
            if (!mergingBoundAndUnit[breakpoint.dimension.value]) {
                mergingBoundAndUnit[breakpoint.dimension.value] = []
            }
            mergingBoundAndUnit[breakpoint.dimension.value].push(mediaQuery)
        }
    }
    const viewportWidths: Array<number> = []
    for (const [bound, dimensionUomMap] of Object.entries(merging)) {
        for (const [uom, dimensionValueMap] of Object.entries(
            dimensionUomMap,
        )) {
            for (const [value, mediaQueries] of Object.entries(
                dimensionValueMap,
            )) {
                const dimension: CssDimension = {
                    uom: uom as CssUom,
                    value: parseInt(value, 10),
                }
                const locations = mediaQueries.map(({ code, filename }) => ({
                    code,
                    filename,
                }))
                switch (bound) {
                    case 'exact':
                        throw new Error('unsupported breakpoint bound ' + bound)
                        break
                    case 'lower':
                        const lowerOn = dimension.value
                        const lowerOut = dimension.value - 1
                        manifest.mediaQueryBreakpoints.push({
                            bound,
                            dimension,
                            locations,
                            screenshotOn: `w_${lowerOn}.png`,
                            screenshotOut: `w_${lowerOut}.png`,
                        })
                        viewportWidths.push(lowerOn, lowerOut)
                        break
                    case 'upper':
                        const upperOn = dimension.value
                        const upperOut = dimension.value + 1
                        manifest.mediaQueryBreakpoints.push({
                            bound,
                            dimension,
                            locations,
                            screenshotOn: `w_${upperOn}.png`,
                            screenshotOut: `w_${upperOut}.png`,
                        })
                        viewportWidths.push(upperOn, upperOut)
                        break
                }
            }
        }
    }
    for (const width of new Set(viewportWidths)) {
        const file = `w_${width}.png`
        if (!manifest.screenshots[file]) {
            manifest.screenshots[file] = {
                browser: opts.browser,
                pageSpec: { viewport: { height: 600, width } },
            }
        }
    }
}

function resolveDeviceScreenshots(
    manifest: CaptureScreenshotManifest,
    opts: CaptureScreenshotsOptions,
) {
    for (const definition of resolveDevices(opts)) {
        const filenamePrefix = deviceScreenshotPrefix(definition.label)
        let landscape: string = ''
        let portrait: string | undefined = undefined
        if (definition.type === 'desktop') {
            landscape = `${filenamePrefix}.png`
            manifest.screenshots[landscape] = {
                browser: definition.browser,
                pageSpec: definition.landscape,
            }
        } else if (definition.type === 'mobile') {
            landscape = `${filenamePrefix}_landscape.png`.replaceAll('-_', '_')
            manifest.screenshots[landscape] = {
                browser: definition.browser,
                pageSpec: definition.landscape,
            }
            portrait = `${filenamePrefix}_portrait.png`.replaceAll('-_', '_')
            manifest.screenshots[portrait] = {
                browser: definition.browser,
                pageSpec: definition.portrait,
            }
        }
        manifest.devices.push({
            definition,
            landscape,
            portrait,
        })
    }
    manifest.devices.sort((d1, d2) => {
        if (d1.definition.label < d2.definition.label) {
            return -1
        } else if (d1.definition.label > d2.definition.label) {
            return 1
        } else {
            return 0
        }
    })
}

function deviceScreenshotPrefix(device: string): string {
    return device
        .replaceAll(' ', '-')
        .replaceAll('(', '-')
        .replaceAll(')', '-')
        .replaceAll('--', '-')
        .toLowerCase()
}
