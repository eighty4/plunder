import { devices } from 'playwright-core'
import type { CaptureScreenshotsOptions } from './captureScreenshots.ts'
import type { BrowserEngine, BrowserOptions } from './playwrightBrowsers.ts'

const defaultDeviceLabals: Readonly<Array<keyof typeof devices>> =
    Object.freeze([
        'Galaxy S8',
        'Galaxy S9+',
        'Galaxy Tab S4',
        'iPad (gen 7)',
        'iPad Mini',
        'iPad Pro 11',
        'iPhone X',
        'iPhone 15',
        'iPhone 15 Plus',
        'iPhone 15 Pro',
        'iPhone 15 Pro Max',
        'Pixel 5',
        'Pixel 7',
    ])

export type DeviceDefinition =
    | {
          browser: BrowserEngine
          label: string
          type: 'desktop'
          landscape: BrowserDefinition
      }
    | {
          browser: BrowserEngine
          label: string
          type: 'mobile'
          landscape: BrowserDefinition
          portrait: BrowserDefinition
      }

export type BrowserDefinition = {
    deviceScaleFactor?: number
    viewport?: {
        height: number
        width: number
    }
}

export function getDefaultDeviceLabels(): Array<string> {
    return [...defaultDeviceLabals] as Array<string>
}

export function getSupportedDeviceLabels(): Array<{
    label: string
    default: boolean
}> {
    return Object.keys(devices)
        .filter(label => !label.endsWith(' landscape'))
        .map(label => ({
            label,
            default: defaultDeviceLabals.includes(label),
        }))
        .sort((d1, d2) => {
            if (d1.label < d2.label) {
                return -1
            } else if (d1.label > d2.label) {
                return 1
            } else {
                return 0
            }
        })
}

export function getDeviceLabelSearchMatches(
    deviceQueries: Array<string>,
): Array<string> {
    return Object.keys(searchDeviceDefinitions(deviceQueries)).sort()
}

export function resolveDevices(
    opts: Pick<CaptureScreenshotsOptions, 'deviceQueries' | 'modernDevices'>,
): Array<DeviceDefinition> {
    const devices = resolveDeviceQueries(opts.deviceQueries)
    if (opts.modernDevices) {
        const queryMatchedLabels = devices.map(d => d.label)
        for (const device of getModernDevices()) {
            if (!queryMatchedLabels.includes(device.label)) {
                devices.push(device)
            }
        }
    }
    return devices
}

export function resolveDeviceQueries(
    query: CaptureScreenshotsOptions['deviceQueries'],
): Array<DeviceDefinition> {
    if (query === false) {
        return []
    } else if (Array.isArray(query)) {
        return searchDeviceDefinitions(query)
    } else {
        throw new Error('bad argument')
    }
}

export function getModernDevices(): Array<DeviceDefinition> {
    return buildDeviceDefinitions(defaultDeviceLabals)
}

function searchDeviceDefinitions(
    deviceQueries: Array<string>,
): Array<DeviceDefinition> {
    const searchableDeviceQueries = deviceQueries.map(deviceQuery =>
        deviceQuery.toLowerCase(),
    )
    const searchableDeviceLabels = getSearchableDeviceRecord()
    const deviceLabelMatches: Array<keyof typeof devices> = []
    for (const [searchable, deviceLabel] of Object.entries(
        searchableDeviceLabels,
    )) {
        for (const query of searchableDeviceQueries) {
            if (searchable.includes(query)) {
                deviceLabelMatches.push(deviceLabel)
                break
            }
        }
    }
    return buildDeviceDefinitions(deviceLabelMatches)
}

function getSearchableDeviceRecord(): Record<string, keyof typeof devices> {
    const result: Record<string, keyof typeof devices> = {}
    for (const deviceLabel of Object.keys(devices)) {
        if (!deviceLabel.endsWith(' landscape')) {
            result[deviceLabel.toLowerCase()] = deviceLabel
        }
    }
    return result
}

function buildDeviceDefinitions(
    deviceLabels: Readonly<Array<keyof typeof devices>>,
): Array<DeviceDefinition> {
    const result: Array<DeviceDefinition> = []
    for (const deviceLabel of deviceLabels) {
        const primary = getBrowserOptions(deviceLabel)
        const landscapeLabel = deviceLabel + ' landscape'
        const browser: BrowserEngine = devices[deviceLabel].defaultBrowserType
        result.push(
            devices[landscapeLabel]
                ? {
                      browser,
                      label: deviceLabel as string,
                      type: 'mobile',
                      landscape: getBrowserOptions(landscapeLabel),
                      portrait: primary,
                  }
                : {
                      browser,
                      label: deviceLabel as string,
                      type: 'desktop',
                      landscape: primary,
                  },
        )
    }
    return result
}

function getBrowserOptions(deviceLabel: keyof typeof devices): BrowserOptions {
    const descriptor = devices[deviceLabel]
    return {
        deviceScaleFactor: descriptor.deviceScaleFactor,
        viewport: {
            height: descriptor.viewport.height,
            width: descriptor.viewport.width,
        },
    }
}
