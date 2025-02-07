import path from 'node:path/posix'
import url from 'node:url'
import type {Page} from 'playwright'

export async function getBaseHref(page: Page): Promise<string | null> {
    const baseLocators = await page.locator('base').all()
    if (!baseLocators.length) {
        return null
    }
    const href = await baseLocators[0].getAttribute('href')
    if (!href) {
        return null
    }
    const trimmed = href.trim()
    if (/^https?:\/\//.test(trimmed)) {
        return trimmed
    } else if (!trimmed.startsWith('/')) {
        throw new Error('not sure how a <base href=""/> without a leading slash is used by browsers')
    } else {
        return trimmed
    }
}

export function rewriteHref(href: string, pageUrl: URL, baseHref: string | null): string {
    if (/^https?:\/\//.test(href)) {
        return href
    }
    if (href.startsWith('/')) {
        return createUrl(pageUrl.protocol, pageUrl.host, href)
    } else if (baseHref == null) {
        if (pageUrl.pathname === '/') {
            return createUrl(pageUrl.protocol, pageUrl.host, href)
        } else {
            const pagePath = pageUrl.pathname.endsWith('/') ? pageUrl.pathname.substring(0, pageUrl.pathname.length - 1) : pageUrl.pathname
            const subpath = pagePath.substring(0, pagePath.lastIndexOf('/'))
            return createUrl(pageUrl.protocol, pageUrl.host, path.join(subpath, href))
        }
    } else if (baseHref === '/') {
        return createUrl(pageUrl.protocol, pageUrl.host, href)
    } else if (/^https?:\/\//.test(baseHref)) {
        return path.join(baseHref, href)
    } else if (baseHref.endsWith('/')) {
        return createUrl(pageUrl.protocol, pageUrl.host, path.join(baseHref, href))
    } else {
        const subpath = baseHref.substring(0, baseHref.lastIndexOf('/'))
        return createUrl(pageUrl.protocol, pageUrl.host, path.join(subpath, href))
    }
}

function createUrl(protocol: string, host: string, pathname: string): string {
    return url.format({protocol, host, pathname})
}
