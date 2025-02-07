import type {Page} from 'playwright'
import {rewriteHref} from './url.js'

export async function findAllSameOriginAnchorHrefs(page: Page, baseHref: string | null): Promise<Array<string>> {
    const url = new URL(page.url())
    const anchorTags = await page.locator('a').all()
    const anchorHrefs = await Promise.all(anchorTags.map(anchorTag => {
        return anchorTag.getAttribute('href')
    }))
    return anchorHrefs
        .filter((anchorHref): anchorHref is string => {
            if (anchorHref === null || anchorHref.startsWith('#')) {
                return false
            }
            if (/^https?:\/\//.test(anchorHref)) {
                try {
                    const anchorUrl = new URL(anchorHref)
                    return url.protocol === anchorUrl.protocol && url.host === anchorUrl.host
                } catch (ignore) {
                    return false
                }
            }
            return true
        })
        .map(anchorHref => rewriteHref(anchorHref, url, baseHref))
}
