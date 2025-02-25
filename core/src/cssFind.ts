import type { Locator, Page } from 'playwright'
import { rewriteHref } from './url.ts'

export interface FindCssResult {
    url: string
    css: Array<CssContent>
}

export interface CssContent {
    content: string
    source: 'link' | 'inline'
    uri?: string
}

export async function findAllCss(
    page: Page,
    baseHref: string | null,
): Promise<FindCssResult> {
    return {
        url: page.url(),
        css: (
            await Promise.all([
                locateLinkedCss(page, baseHref),
                locateInlineCss(page),
            ])
        ).flatMap(cc => cc),
    }
}

async function locateLinkedCss(
    page: Page,
    baseHref: string | null,
): Promise<Array<CssContent>> {
    const linkLocators = await page.locator('link').all()
    const linkedStylesheetsHrefs = (
        await Promise.all(linkLocators.map(resolveCssHref))
    ).filter(href => href !== null)
    if (!linkedStylesheetsHrefs.length) {
        return []
    } else {
        const pageUrl = new URL(page.url())
        const uris = linkedStylesheetsHrefs.map(href =>
            rewriteHref(href, pageUrl, baseHref),
        )
        return await Promise.all(
            uris.map(async uri => {
                return {
                    content: await fetch(uri).then(r => r.text()),
                    source: 'link',
                    uri,
                }
            }),
        )
    }
}

async function locateInlineCss(page: Page): Promise<Array<CssContent>> {
    const styleLocators = await page.locator('style').all()
    const css = await Promise.all(
        styleLocators.map(async styleLocator => await styleLocator.innerText()),
    )
    return css.map(content => ({
        content,
        source: 'inline',
    }))
}

async function resolveCssHref(link: Locator): Promise<string | null> {
    const linkRelAttr = await link.getAttribute('rel')
    if (linkRelAttr === 'stylesheet') {
        return await link.getAttribute('href')
    } else {
        return null
    }
}
