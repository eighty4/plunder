import { exec } from 'node:child_process'
import { resolveDependency } from './resolveDependency.ts'

export type BrowserInstall = { name: BrowserLabelForCLI; revision: string }

export type BrowserLabelForCLI =
    | 'chromium'
    | 'chromium-headless-shell'
    | 'firefox'
    | 'webkit'

export function isBrowserLabelForCLI(v: string): v is BrowserLabelForCLI {
    switch (v) {
        case 'chromium-headless-shell':
        case 'chromium':
        case 'firefox':
        case 'webkit':
            return true
        default:
            return false
    }
}

const PW_INSTALL_CMD = `node ${resolveDependency('playwright')} install`

export async function execPlaywrightInstallList(): Promise<string> {
    return await runCommand(`${PW_INSTALL_CMD} --list`)
}

export async function execPlaywrightInstall(
    browsers: Array<BrowserLabelForCLI>,
): Promise<void> {
    await runCommand(`${PW_INSTALL_CMD} --no-progress ${browsers.join(' ')}`)
}

async function runCommand(cmd: string): Promise<string> {
    return await new Promise<string>((res, rej) => {
        exec(cmd, (err, stdout) => {
            if (err) {
                rej(err)
            } else {
                res(stdout.trim())
            }
        })
    })
}
