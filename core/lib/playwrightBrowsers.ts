export const BrowserEngineValues = ['chromium', 'firefox', 'webkit'] as const

export type BrowserEngine = (typeof BrowserEngineValues)[number]

export interface BrowserOptions {
    deviceScaleFactor?: number
    viewport?: {
        height: number
        width: number
    }
}
