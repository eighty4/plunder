import { exec } from 'node:child_process'
import { join } from 'node:path'
import { resolveDependency } from './resolveDependency.ts'

export type BrowserInstall = { name: BrowserLabelForCLI; revision: string }

export type BrowserLabelForCLI =
    | 'chromium'
    | 'chromium-headless-shell'
    | 'ffmpeg'
    | 'firefox'
    | 'webkit'

export type FallibleCommandResult = {
    output: string
    success: boolean
}

export function isBrowserLabelForCLI(v: string): v is BrowserLabelForCLI {
    switch (v) {
        case 'chromium-headless-shell':
        case 'chromium':
        case 'ffmpeg':
        case 'firefox':
        case 'webkit':
            return true
        default:
            return false
    }
}

const PW_CLI_ABS_PATH = join(resolveDependency('playwright'), 'cli.js')

export async function execPlaywrightInstallList(): Promise<string> {
    return await runCommand(`node ${PW_CLI_ABS_PATH} install --list`)
}

export async function execPlaywrightInstall(
    browsers: Array<BrowserLabelForCLI>,
): Promise<void> {
    await runCommand(
        `node ${PW_CLI_ABS_PATH} install --no-progress ${browsers.join(' ')}`,
    )
}

export async function execPlaywrightInstallDryRun(
    browsers: Array<BrowserLabelForCLI>,
): Promise<string> {
    return await runCommand(
        `node ${PW_CLI_ABS_PATH} install ${browsers.join(' ')} --dry-run`,
    )
}

export async function execPlaywrightInstallDepsDryRun(
    browsers: Array<BrowserLabelForCLI>,
): Promise<FallibleCommandResult> {
    return await runFallibleCommand(
        `node ${PW_CLI_ABS_PATH} install-deps ${browsers.join(' ')} --dry-run`,
    )
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

async function runFallibleCommand(cmd: string): Promise<FallibleCommandResult> {
    return await new Promise<FallibleCommandResult>((res, rej) => {
        exec(cmd, (err, stdout) => {
            if (err) {
                if ('code' in err && typeof err.code === 'number') {
                    res({
                        success: false,
                        output: stdout.trim(),
                    })
                } else {
                    rej(err)
                }
            } else {
                res({
                    success: true,
                    output: stdout.trim(),
                })
            }
        })
    })
}
