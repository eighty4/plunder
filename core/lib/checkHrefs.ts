import { writeFile } from 'node:fs/promises'
import type { Page } from 'playwright-core'
import { ZodError, z } from 'zod'
import { launchBrowser } from './playwrightProcess.ts'
import { getBaseHref, rewriteHref } from './url.ts'
import { installMissingBrowserDistributions } from './playwrightInstall.ts'

export interface CheckHrefsOptions {
    /**
     * Optionally write results of link checking to output file path relative to current directory.
     */
    outputFile?: string

    /**
     * URLs of webpages to perform link checking on.
     */
    urls: Array<string>
}

export class InvalidCheckHrefsOption {
    readonly invalidFields: Array<string>
    constructor(invalidFields: Array<string>) {
        this.invalidFields = invalidFields
    }
}

function validateCheckHrefsOptions(opts: CheckHrefsOptions) {
    try {
        z.object({
            outputFile: z.string().optional(),
            urls: z.array(z.string().url()),
        })
            .strict()
            .parse(opts)
    } catch (e: any) {
        if (e instanceof ZodError) {
            throw new InvalidCheckHrefsOption(
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
    await installMissingBrowserDistributions(new Set(['chromium']), true)
    const browser = await launchBrowser({ browser: 'chromium', headless: true })
    try {
        const collectedHrefs = await Promise.all(
            opts.urls.map(async url =>
                collectHrefs(await browser.newPage(), url),
            ),
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
        await browser.close()
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
    ).then(hrefs =>
        hrefs
            .filter(href => href !== null)
            .map(href => rewriteHref(href, parsedUrl, baseHref)),
    )
    await page.close()
    return { url, hrefs }
}

async function checkHrefs(
    collectedHrefs: CollectHrefsResult,
): Promise<PageCheckResult> {
    const result: PageCheckResult['hrefs'] = []
    const headers = new Headers()
    headers.set('Accept', 'text/html')
    headers.set('Accept-Encoding', 'gzip, deflate, br, zstd')
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
