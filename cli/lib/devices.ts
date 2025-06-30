import {
    getDefaultDeviceLabels,
    getDeviceLabelSearchMatches,
    getSupportedDeviceLabels,
} from '@eighty4/plunder-core'
import ansi from './ansi.ts'

export const DEVICES_CMD_NAME = 'devices'

export function devicesPrintCommand(query?: 'all' | Array<string>): never {
    if (query === 'all') {
        console.log(
            'Plunders modern device defaults (in bold) and searchable devices:',
        )
        for (const device of getSupportedDeviceLabels()) {
            console.log(
                '  ',
                device.default ? ansi.bold(device.label) : device.label,
            )
        }
    } else if (query?.length) {
        const deviceQueryDisplay = query
            .map((d: string) => ansi.bold(d))
            .join(', ')
        console.log(
            `Plunders devices used when querying with ${deviceQueryDisplay}:`,
        )
        for (const label of getDeviceLabelSearchMatches(query)) {
            console.log('  ', label)
        }
    } else {
        console.log('Plunders modern devices used by default:')
        for (const label of getDefaultDeviceLabels()) {
            console.log('  ', label)
        }
    }

    console.log(
        '\nPlunders device support comes from the npm package `playwright-core`.',
        '\nThe definitions used by Plunder can be extended, however, only the Playwright provided devices are used currently.',
        '\n\n  Read for more info\n    https://playwright.dev/docs/emulation#devices',
        '\n\n  And contribute your improvements\n    https://github.com/eighty4/plunder/blob/main/core/src/devices.ts',
    )
    process.exit(0)
}
