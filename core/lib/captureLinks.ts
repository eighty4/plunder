import { writeFile } from 'node:fs/promises'
import type { Page } from 'playwright-core'
import { ZodError, z } from 'zod'
import { playwrightInstall } from './playwright/playwrightInstall.ts'
import { BrowserManager } from './playwright/playwrightProcess.ts'
import { getBaseHref, rewriteHref } from './url.ts'
import { BrowserEngineValues, type BrowserEngine } from './plunderBrowsers.ts'

export interface CheckHrefsOptions {
    /**
     * The browser engine to use when parsing pages for anchor hrefs.
     *
     * Defaults to `chromium`.
     */
    browser?: BrowserEngine

    /**
     * Whether to launch browsers headless or graphically in the desktop
     * environment.
     *
     * Defaults to `true`.
     */
    headless?: boolean

    /**
     * Optionally write results of link checking to output file path relative to current directory.
     */
    outputFile?: string

    /**
     * URLs of webpages to perform link checking on.
     */
    urls: Array<string>
}

export class InvalidCheckHrefsOptionsError {
    readonly invalidFields: Array<string>
    constructor(invalidFields: Array<string>) {
        this.invalidFields = invalidFields
    }
}

function validateCheckHrefsOptions(opts: CheckHrefsOptions) {
    try {
        z.object({
            browser: z.enum(BrowserEngineValues).optional(),
            headless: z.boolean().optional(),
            outputFile: z.string().optional(),
            urls: z.array(z.url()),
        })
            .strict()
            .parse(opts)
    } catch (e: any) {
        if (e instanceof ZodError) {
            throw new InvalidCheckHrefsOptionsError(
                e.issues.map(i => i.path.join('.')),
            )
        } else {
            throw e
        }
    }
}

export interface CheckHrefsResult {
    good: boolean
    pages: Array<PageCheckResult>
}

export interface PageCheckResult {
    good: boolean
    hrefs: Array<HrefCheckResult>
    url: string
}

export interface HrefCheckResult {
    good: boolean
    href: string
    status: number | 'err'
}

export async function checkAnchorHrefs(
    opts: CheckHrefsOptions,
): Promise<CheckHrefsResult> {
    validateCheckHrefsOptions(opts)
    const browser = opts.browser ?? 'chromium'
    const headless = opts.headless ?? true
    await playwrightInstall(new Set([browser]), headless)
    const browsers = new BrowserManager()
    try {
        const collectedHrefs = await Promise.all(
            opts.urls.map(async url => {
                const page = await browsers.newPage(browser, headless)
                try {
                    return await collectHrefs(page, url)
                } finally {
                    await page.close()
                }
            }),
        )
        const pageChecks = await Promise.all(
            collectedHrefs.map(hrefs => checkHrefs(hrefs)),
        )
        if (opts.outputFile) {
            await writeFile(
                opts.outputFile,
                JSON.stringify(pageChecks, null, 4),
            )
        }
        return {
            good: pageChecks.every(pageCheck => pageCheck.good),
            pages: pageChecks,
        }
    } finally {
        await browsers.shutdown()
    }
}

interface CollectHrefsResult {
    url: string
    hrefs: Array<string>
}

async function collectHrefs(
    page: Page,
    url: string,
): Promise<CollectHrefsResult> {
    const parsedUrl = new URL(url)
    await page.goto(url)
    const baseHref = await getBaseHref(page)
    const anchors = await page.locator('a').all()
    const hrefs = await Promise.all(
        anchors.map(anchor => anchor.getAttribute('href')),
    )
    return {
        url,
        hrefs: hrefs
            .filter(href => href !== null)
            .map(href => rewriteHref(href, parsedUrl, baseHref)),
    }
}

async function checkHrefs(
    collectedHrefs: CollectHrefsResult,
): Promise<PageCheckResult> {
    const result: PageCheckResult['hrefs'] = []
    const headers = new Headers()
    headers.set('Accept', 'text/html')
    headers.set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    )
    await Promise.all(
        collectedHrefs.hrefs.map(async href => {
            let status: HrefCheckResult['status']
            try {
                const response = await fetch(href, {
                    method: 'GET',
                    headers,
                    redirect: 'follow',
                })
                status = response.status
            } catch (e: any) {
                status = 'err'
                if (e.message !== 'fetch failed') {
                    console.error(
                        `error GET request for ${href} referenced from ${collectedHrefs.url}: ${e.message}`,
                    )
                }
            }
            const good = status !== 'err' && status < 300 && status >= 200
            result.push({ status, href, good })
        }),
    )
    return {
        good: result.every(href => href.good),
        hrefs: result,
        url: collectedHrefs.url,
    }
}
