import path from 'node:path/posix'
import url from 'node:url'

export function rewriteHref(href: string, pageUrl: string, baseHref: string | null): string {
    if (/^https?:\/\//.test(href)) {
        return href
    }
    const parsedUrl = new URL(pageUrl)
    if (href.startsWith('/')) {
        return createUrl(parsedUrl.protocol, parsedUrl.host, href)
    } else if (baseHref == null) {
        if (parsedUrl.pathname === '/') {
            return createUrl(parsedUrl.protocol, parsedUrl.host, href)
        } else {
            const pagePath = parsedUrl.pathname.endsWith('/') ? parsedUrl.pathname.substring(0, parsedUrl.pathname.length - 1) : parsedUrl.pathname
            const subpath = pagePath.substring(0, pagePath.lastIndexOf('/'))
            return createUrl(parsedUrl.protocol, parsedUrl.host, path.join(subpath, href))
        }
    } else if (baseHref === '/') {
        return createUrl(parsedUrl.protocol, parsedUrl.host, href)
    } else if (/^https?:\/\//.test(baseHref)) {
        return path.join(baseHref, href)
    } else if (baseHref.endsWith('/')) {
        return createUrl(parsedUrl.protocol, parsedUrl.host, path.join(baseHref, href))
    } else {
        const subpath = baseHref.substring(0, baseHref.lastIndexOf('/'))
        return createUrl(parsedUrl.protocol, parsedUrl.host, path.join(subpath, href))
    }
}

function createUrl(protocol: string, host: string, pathname: string): string {
    return url.format({protocol, host, pathname})
}
