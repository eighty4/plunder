import { stdin } from 'node:process'
import {
    type BrowserEngine,
    checkPlaywrightBrowserInstalls,
    getBrowserInstallNeededDeps,
    getBrowserInstallsNeedingSystemDeps,
    resolveDevices,
} from '@eighty4/plunder-core'

export type BrowserInstallOpts = {
    promptConfirmInstall: boolean
    installSystemDependencies: boolean
    showSystemDependencies: boolean
}

export async function confirmHrefCheckingBrowserInstalls(
    installOpts: BrowserInstallOpts,
) {
    await confirmBrowserInstalls(installOpts, new Set(['chromium']), true)
}

export async function confirmActiveScreenCaptureBrowserInstalls(
    installOpts: BrowserInstallOpts,
    headless: boolean,
) {
    await confirmBrowserInstalls(
        installOpts,
        new Set(['chromium', 'firefox', 'webkit']),
        headless,
    )
}

export async function confirmDeviceScreenCaptureBrowserInstalls(
    installOpts: BrowserInstallOpts,
    defaultBrowser: BrowserEngine,
    modernDevices: boolean,
    deviceQueries: false | Array<string>,
    headless: boolean,
) {
    await confirmBrowserInstalls(
        installOpts,
        resolveBrowsersForScreenCapture(
            defaultBrowser,
            modernDevices,
            deviceQueries,
        ),
        headless,
    )
}

function resolveBrowsersForScreenCapture(
    defaultBrowser: BrowserEngine,
    modernDevices: boolean,
    deviceQueries: false | Array<string>,
): Set<BrowserEngine> {
    return new Set([
        defaultBrowser,
        ...resolveDevices({ deviceQueries, modernDevices }).map(
            device => device.browser,
        ),
    ])
}

async function confirmBrowserInstalls(
    installOpts: BrowserInstallOpts,
    browsers: Set<BrowserEngine>,
    headless: boolean,
) {
    if (installOpts.showSystemDependencies) {
        await showBrowserInstallNeededDeps(browsers, headless)
    } else if (installOpts.promptConfirmInstall) {
        await promptIfBrowserInstallsNeeded(browsers, headless)
    } else {
        // in the case of `--no-confirm-install` cli arg
        // error exit if system dependencies are required
        await exitIfBrowserSystemDepsNeeded(browsers, headless)
    }
}

async function showBrowserInstallNeededDeps(
    browsers: Set<BrowserEngine>,
    headless: boolean,
) {
    const result = await getBrowserInstallNeededDeps(browsers, headless)
    if (result.dependencies.length) {
        console.log(
            `All system dependencies are present for browser(s) ${prettyListBrowsers(Array.from(browsers))}.`,
        )
        process.exit(0)
    } else {
        console.log(
            `System dependencies are missing for browser(s) ${prettyListBrowsers(Array.from(browsers))}.`,
        )
        console.log(
            'Swap `--show-deps` for `--install-deps` and these dependencies will be installed with your browsers:',
        )
        for (const dependency of result.dependencies) {
            console.log(' -', dependency)
        }
        process.exit(1)
    }
}

async function exitIfBrowserSystemDepsNeeded(
    browsers: Set<BrowserEngine>,
    headless: boolean,
) {
    const needsSystemDeps = await getBrowserInstallsNeedingSystemDeps(
        browsers,
        headless,
    )
    if (needsSystemDeps.length) {
        printInstallDepsCommandAndExit(needsSystemDeps)
    }
}

function prettyListBrowsers(b: Array<BrowserEngine>): string {
    return `${b.slice(0, -1).join(', ')} and ${b.at(-1)}`
}

function printInstallDepsCommandAndExit(
    missingSystemDeps: Array<BrowserEngine>,
): never {
    console.log(
        'Plunder uses Playwright to drive web browsers and needs to install system dependencies for the browser(s) this command uses.',
    )
    console.log(
        `The browser(s) missing dependencies are ${prettyListBrowsers(missingSystemDeps)}.`,
    )
    console.log()
    console.log(
        'Run this same command with `--install-deps` to install the dependencies the browser(s) need.',
    )
    console.log(
        'Run this same command with `--show-deps` to see the dependencies that would be installed.',
    )
    process.exit(1)
}

async function promptIfBrowserInstallsNeeded(
    browsers: Set<BrowserEngine>,
    headless: boolean,
): Promise<void> {
    const checkDists = await checkPlaywrightBrowserInstalls(browsers, headless)
    if (checkDists.needsSystemDeps.length) {
        printInstallDepsCommandAndExit(checkDists.needsSystemDeps)
    }
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
            'Use `--no-confirm-install` to skip confirming downloading Playwright browsers in a non-tty/CICD environment.',
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
