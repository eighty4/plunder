import {
    isBrowserLabelForCLI,
    type BrowserInstall,
    execPlaywrightInstallList,
} from './playwrightCli.ts'

export type PlaywrightCliInstallList = {
    versions: Array<PlaywrightVersionInstalls>
}

export type PlaywrightVersionInstalls = {
    version: string
    browsers: Array<BrowserInstall>
    references: Array<string>
}

export async function playwrightInstallList(): Promise<PlaywrightCliInstallList> {
    return parsePlaywrightCliInstallList(await execPlaywrightInstallList())
}

const BLANK_LINE = /\r?\n\r?\n/
const NEWLINE = /\r?\n/

function isNotNull<T>(v: T): v is NonNullable<T> {
    return v !== null && typeof v !== 'undefined'
}

export function parsePlaywrightCliInstallList(
    output: string,
): PlaywrightCliInstallList {
    return {
        versions: output
            .split(BLANK_LINE)
            .map(versionOutput => {
                const versionLines = versionOutput.split(NEWLINE)
                const version = parsePlaywrightVersionLine(versionLines.at(0))
                if (!version) return null
                const referencesHeaderI = versionLines.findLastIndex(
                    line => !line.startsWith('    '),
                )
                if (referencesHeaderI === -1) return null
                return {
                    version,
                    browsers: versionLines
                        .slice(1, referencesHeaderI)
                        .map(parsePlaywrightBrowserInstallLine)
                        .filter(isNotNull),
                    references: versionLines
                        .slice(referencesHeaderI + 1)
                        .map(s => s.trim()),
                }
            })
            .filter(isNotNull),
    }
}

const PLAYWRIGHT_SEMVER = /: (\d+\.\d+\.\d+)$/

function parsePlaywrightVersionLine(s?: string): string | null {
    if (s) {
        const match = s.match(PLAYWRIGHT_SEMVER)
        if (match && match.length > 1) {
            return match[1]
        }
    }
    return null
}

function parsePlaywrightBrowserInstallLine(s: string): BrowserInstall | null {
    const pathSepI = s.lastIndexOf('/')
    if (pathSepI === -1) return null
    const installSpecifier = s.slice(pathSepI + 1)
    const splitI = installSpecifier.lastIndexOf('-')
    if (splitI === -1) return null
    const name = installSpecifier.substring(0, splitI).replace(/_/g, '-')
    if (!isBrowserLabelForCLI(name)) return null
    const revision = installSpecifier.substring(splitI + 1)
    return { name, revision }
}
