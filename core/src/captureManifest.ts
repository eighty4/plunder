import { type CaptureScreenshotsOptions } from './capture.ts'
import {
    type CssCodeExcerpt,
    type CssDimension,
    type CssMediaQuery,
} from './cssParse.ts'
import { type DeviceDefinition, resolveDevices } from './devices.ts'
import { type BrowserOptions } from './playwright.ts'

// representation of json written to capture out dir for each
// captured webpage types are exported from lib and used by webapp
export interface CaptureScreenshotManifest {
    dir: string
    devices: Array<DeviceScreenshots>
    mediaQueries: Array<MediaQueryScreenshots> | null
    screenshots: Record<string, BrowserOptions>
    url: string
}

export interface MediaQueryScreenshots {
    filename: string
    code: CssCodeExcerpt
    breakpoints: Array<BreakpointScreenshots>
}

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
        mediaQueries: null,
        screenshots: {},
        url,
    }
    resolveDeviceScreenshots(manifest, opts)
    if (mediaQueries) {
        resolveMediaQueryScreenshots(manifest, mediaQueries)
    }
    return manifest
}

function resolveMediaQueryScreenshots(
    manifest: CaptureScreenshotManifest,
    mediaQueries: Array<CssMediaQuery>,
) {
    manifest.mediaQueries = []
    const viewportWidths: Array<number> = []
    for (const mediaQuery of mediaQueries) {
        const breakpoints: Array<BreakpointScreenshots> = []
        for (const breakpoint of mediaQuery.breakpoints) {
            switch (breakpoint.bound) {
                case 'lower':
                    const lowerOn = breakpoint.dimension.value
                    const lowerOut = breakpoint.dimension.value - 1
                    breakpoints.push({
                        bound: 'lower',
                        dimension: breakpoint.dimension,
                        screenshotOn: `w_${lowerOn}.png`,
                        screenshotOut: `w_${lowerOut}.png`,
                    })
                    viewportWidths.push(lowerOn, lowerOut)
                    break
                case 'upper':
                    const upperOn = breakpoint.dimension.value
                    const upperOut = breakpoint.dimension.value + 1
                    breakpoints.push({
                        bound: 'upper',
                        dimension: breakpoint.dimension,
                        screenshotOn: `w_${upperOn}.png`,
                        screenshotOut: `w_${upperOut}.png`,
                    })
                    viewportWidths.push(upperOn, upperOut)
                    break
                case 'exact':
                default:
                    throw new Error(
                        'unsupported breakpoint bound ' + breakpoint.bound,
                    )
            }
        }
        manifest.mediaQueries.push({
            filename: mediaQuery.filename,
            code: mediaQuery.code,
            breakpoints,
        })
    }
    for (const width of new Set(viewportWidths)) {
        const file = `w_${width}.png`
        if (!manifest.screenshots[file]) {
            manifest.screenshots[file] = {
                viewport: { height: 600, width },
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
            manifest.screenshots[landscape] = definition.landscape
        } else if (definition.type === 'mobile') {
            landscape = `${filenamePrefix}_landscape.png`.replaceAll('-_', '_')
            manifest.screenshots[landscape] = definition.landscape
            portrait = `${filenamePrefix}_portrait.png`.replaceAll('-_', '_')
            manifest.screenshots[portrait] = definition.portrait
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
