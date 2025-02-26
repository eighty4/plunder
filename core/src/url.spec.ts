import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { rewriteHref } from './url.ts'

describe('rewriteHref', () => {
    const testRewriteHref = ({
        href,
        pageUrl,
        baseHref,
        expectedResult,
    }: {
        href: string
        pageUrl: string
        baseHref: string | null
        expectedResult: string
    }) => {
        assert.equal(
            rewriteHref(href, new URL(pageUrl), baseHref),
            expectedResult,
        )
    }

    it('hash component', () =>
        testRewriteHref({
            href: '/search#empty',
            pageUrl: 'https://eighty4.tech',
            baseHref: null,
            expectedResult: 'https://eighty4.tech/search#empty',
        }))

    it('search component', () =>
        testRewriteHref({
            href: '/search?q=workflows',
            pageUrl: 'https://eighty4.tech',
            baseHref: null,
            expectedResult: 'https://eighty4.tech/search?q=workflows',
        }))

    it('absolute host href', () =>
        testRewriteHref({
            href: 'https://eighty4.tech/styles.css',
            pageUrl: 'https://binny.sh/',
            baseHref: null,
            expectedResult: 'https://eighty4.tech/styles.css',
        }))

    it('absolute path href', () =>
        testRewriteHref({
            href: '/styles.css',
            pageUrl: 'https://eighty4.tech/blog/learn-learn-learn',
            baseHref: null,
            expectedResult: 'https://eighty4.tech/styles.css',
        }))

    it('absolute path href with port', () =>
        testRewriteHref({
            href: '/styles.css',
            pageUrl: 'http://localhost:5173/blog/learn-learn-learn',
            baseHref: null,
            expectedResult: 'http://localhost:5173/styles.css',
        }))

    it('relative path href from host root path without trailing slash', () =>
        testRewriteHref({
            href: 'styles.css',
            pageUrl: 'https://eighty4.tech',
            baseHref: null,
            expectedResult: 'https://eighty4.tech/styles.css',
        }))

    it('relative path href from host root path with trailing slash', () =>
        testRewriteHref({
            href: 'styles.css',
            pageUrl: 'https://eighty4.tech/',
            baseHref: null,
            expectedResult: 'https://eighty4.tech/styles.css',
        }))

    it('relative path href from subpath without trailing slash without base href', () =>
        testRewriteHref({
            href: 'styles.css',
            pageUrl: 'https://eighty4.tech/blog/learn-learn-learn',
            baseHref: null,
            expectedResult: 'https://eighty4.tech/blog/styles.css',
        }))

    it('relative path href from subpath with trailing slash without base href', () =>
        testRewriteHref({
            href: 'styles.css',
            pageUrl: 'https://eighty4.tech/blog/learn-learn-learn/',
            baseHref: null,
            expectedResult: 'https://eighty4.tech/blog/styles.css',
        }))

    it('relative path href from subpath with trailing slash with base href for host root', () =>
        testRewriteHref({
            href: 'styles.css',
            pageUrl: 'https://eighty4.tech/blog/learn-learn-learn/',
            baseHref: '/',
            expectedResult: 'https://eighty4.tech/styles.css',
        }))

    it('relative path href from subpath with trailing slash with base href for subpath with trailing slash', () =>
        testRewriteHref({
            href: 'styles.css',
            pageUrl: 'https://eighty4.tech/blog/learn-learn-learn/',
            baseHref: '/assets/',
            expectedResult: 'https://eighty4.tech/assets/styles.css',
        }))

    it('relative path href from subpath with trailing slash with base href for subpath without trailing slash', () =>
        testRewriteHref({
            href: 'styles.css',
            pageUrl: 'https://eighty4.tech/blog/learn-learn-learn/',
            baseHref: '/pages/projects.html',
            expectedResult: 'https://eighty4.tech/pages/styles.css',
        }))
})
