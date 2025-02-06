import type {Page} from 'playwright'

export async function findAllSameOriginAnchorHrefs(page: Page): Promise<Array<string>> {
    const url = new URL(page.url())
    const anchorTags = await page.locator('a').all()
    const anchorHrefs = await Promise.all(anchorTags.map(anchorTag => {
        return anchorTag.getAttribute('href')
    }))
    return anchorHrefs.filter(anchorHref => {
        if (anchorHref !== null) {
            const anchorUrl = new URL(anchorHref)
            if (url.protocol === anchorUrl.protocol && url.host === anchorUrl.host) {
                return true
            }
        }
        return false
    }) as Array<string>
}
