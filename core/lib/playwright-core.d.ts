declare module 'playwright-core/lib/server' {
    let installBrowsersForNpmInstall: (browsers: string[]) => Promise<void>
    let registryDirectory: string
}
