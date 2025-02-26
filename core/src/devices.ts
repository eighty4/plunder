import { devices } from 'playwright-core'
import type { BrowserOptions } from './playwright.ts'

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

export function getDefaultDeviceLabels(): Array<string> {
    return [...defaultDeviceLabals] as Array<string>
}

export function getSupportedDeviceLabels(): Array<{
    label: string
    default: boolean
}> {
    return Object.keys(devices)
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

export type DeviceDefinition = {
    label: string
    landscape: BrowserOptions
} & (
    | {
          type: 'desktop'
      }
    | {
          type: 'mobile'
          portrait: BrowserOptions
      }
)

export function resolveDeviceDefinitions(
    query: boolean | Array<string>,
): Array<DeviceDefinition> {
    if (query === false) {
        return []
    } else if (query === true) {
        return getDefaultDeviceDefinitions()
    } else if (Array.isArray(query)) {
        return searchDeviceDefinitions(query)
    } else {
        throw new Error('bad argument')
    }
}

function getDefaultDeviceDefinitions(): Array<DeviceDefinition> {
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
        result.push(
            devices[landscapeLabel]
                ? {
                      label: deviceLabel as string,
                      type: 'mobile',
                      landscape: getBrowserOptions(landscapeLabel),
                      portrait: primary,
                  }
                : {
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
        viewport: {
            height: descriptor.viewport.height,
            width: descriptor.viewport.width,
        },
    }
}
