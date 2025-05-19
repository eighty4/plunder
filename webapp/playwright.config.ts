import { defineConfig, devices, type TestOptions } from '@playwright/test'

type PlunderWebServer = {
    env: Record<string, string>
    mode: 'active' | 'result'
    port: number
}

const modes: Array<PlunderWebServer> = [
    {
        env: {
            PLUNDER_WS_PORT: 7090,
        },
        mode: 'active',
        port: 7009,
    },
    {
        env: {
            PLUNDER_OUT_DIR: '.playwright/plunder/single-page',
        },
        mode: 'result',
        port: 7900,
    },
    {
        env: {
            PLUNDER_OUT_DIR: '.playwright/plunder/multiple-pages',
        },
        mode: 'result',
        port: 7979,
    },
]

export function activeApiConfig(): TestOptions {
    return {
        baseURL: 'http://localhost:' + modes[0].port,
    }
}

export function singlePageConfig(): TestOptions {
    return {
        baseURL: 'http://localhost:' + modes[1].port,
    }
}

export function multiPageConfig(): TestOptions {
    return {
        baseURL: 'http://localhost:' + modes[2].port,
    }
}

export default defineConfig({
    outputDir: '.playwright/results',
    testDir: 'e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [['html', { outputFolder: '.playwright/report' }]],
    use: {
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: modes.map(({ env, mode, port }) => ({
        command: 'pnpm dev',
        env: {
            ...env,
            PLUNDER_MODE: mode,
            VITE_PORT: port,
        },
        url: 'http://localhost:' + port,
        reuseExistingServer: false,
        stdout: 'pipe',
        stderr: 'pipe',
    })),
})
