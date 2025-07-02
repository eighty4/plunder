import { stdin } from 'node:process'
import {
    type BrowserEngine,
    checkPlaywrightBrowserDistributions,
    resolveDevices,
} from '@eighty4/plunder-core'

export async function confirmCaptureBrowserInstalls(
    defaultBrowser: BrowserEngine,
    headless: boolean,
    modernDevices: boolean,
    deviceQueries: false | Array<string>,
): Promise<void> {
    await confirmBrowserInstalls(
        new Set([
            defaultBrowser,
            ...resolveDevices({ deviceQueries, modernDevices }).map(
                device => device.browser,
            ),
        ]),
        headless,
    )
}

export async function confirmBrowserInstalls(
    browsers: Set<BrowserEngine>,
    headless: boolean,
): Promise<void> {
    const checkDists = await checkPlaywrightBrowserDistributions(
        browsers,
        headless,
    )
    const updateCount =
        checkDists.needsUpdate.length + checkDists.notInstalled.length
    if (updateCount === 0) {
        return
    }
    const multipleUpdates = updateCount > 1
    const desc: Array<string> = []
    desc.push('Plunder uses Playwright to drive web browsers and needs to')
    if (checkDists.notInstalled.length) {
        desc.push('install')
        if (checkDists.notInstalled.length > 1) {
            desc.push(
                checkDists.notInstalled
                    .slice(0, checkDists.notInstalled.length - 1)
                    .map(browserDisplayName)
                    .join(', '),
            )
            desc.push(
                `and ${browserDisplayName(checkDists.notInstalled[checkDists.notInstalled.length - 1])}`,
            )
        } else {
            desc.push(`a ${browserDisplayName(checkDists.notInstalled[0])}`)
        }
        if (checkDists.needsUpdate.length) {
            desc.push('and')
        }
    }
    if (checkDists.needsUpdate.length) {
        desc.push('update')
        if (checkDists.needsUpdate.length > 1) {
            desc.push(
                checkDists.needsUpdate
                    .slice(0, checkDists.needsUpdate.length - 1)
                    .map(browserDisplayName)
                    .join(', '),
            )
            desc.push(
                `and ${browserDisplayName(checkDists.needsUpdate[checkDists.needsUpdate.length - 1])}`,
            )
        } else {
            desc.push(`a ${browserDisplayName(checkDists.needsUpdate[0])}`)
        }
    }
    desc.push(
        'Playwright browser',
        multipleUpdates ? 'distributions.' : 'distribution.',
    )
    console.log(desc.join(' '), '\n')
    if (!process.stdin.isTTY) {
        console.log(
            'Use `--confirm-install` to confirm downloading Playwright browsers in a non-tty environment.',
        )
        process.exit(1)
    } else {
        console.log(
            `You can read about Playwright's browsers at https://playwright.dev/docs/browsers.`,
        )
        console.log()
        console.log('Press Y to continue.')
        switch (await readCharFromStdin()) {
            case 'Y':
            case 'y':
                break
            default:
                process.exit(1)
        }
    }
}

function browserDisplayName(browser: BrowserEngine): string {
    switch (browser) {
        case 'chromium':
            return 'Chrome'
        case 'firefox':
            return 'Firefox'
        case 'webkit':
            return 'Safari'
    }
}

async function readCharFromStdin(): Promise<string> {
    stdin.setRawMode(true)
    try {
        return await new Promise<string>(res => {
            stdin.on('data', chunk => {
                // support ctrl-c during raw mode
                if (chunk[0] === 3) {
                    process.exit(0)
                }
                res(chunk.toString())
            })
        })
    } finally {
        stdin.setRawMode(false)
    }
}
