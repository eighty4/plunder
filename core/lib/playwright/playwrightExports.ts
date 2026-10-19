// these exports will be exported from `@eighty4/plunder-core`
// for non-browser module resolution

export {
    checkPlaywrightBrowserInstalls,
    type PlaywrightBrowserInstalls,
} from './internal/checkBrowsers.ts'

export {
    getBrowserInstallNeededDeps,
    getBrowserInstallsNeedingSystemDeps,
    type PlaywrightCliInstallDepsDryRun,
} from './internal/cliInstallDepsDryRun.ts'
