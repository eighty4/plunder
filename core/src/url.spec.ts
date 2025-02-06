import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {rewriteHref} from './url.ts'

describe('rewriteHref', () => {

    it('absolute host href', () => assert.equal(
        rewriteHref('https://eighty4.tech/styles.css', 'https://binny.sh/', null),
        'https://eighty4.tech/styles.css'
    ))

    it('absolute path href', () => assert.equal(
        rewriteHref('/styles.css', 'https://eighty4.tech/blog/learn-learn-learn', null),
        'https://eighty4.tech/styles.css'
    ))

    it('absolute path href with port', () => assert.equal(
        rewriteHref('/styles.css', 'http://localhost:5173/blog/learn-learn-learn', null),
        'http://localhost:5173/styles.css'
    ))

    it('relative path href from host root path without trailing slash', () => assert.equal(
        rewriteHref('styles.css', 'https://eighty4.tech', null),
        'https://eighty4.tech/styles.css'
    ))

    it('relative path href from host root path with trailing slash', () => assert.equal(
        rewriteHref('styles.css', 'https://eighty4.tech/', null),
        'https://eighty4.tech/styles.css'
    ))

    it('relative path href from subpath without trailing slash without base href', () => assert.equal(
        rewriteHref('styles.css', 'https://eighty4.tech/blog/learn-learn-learn', null),
        'https://eighty4.tech/blog/styles.css'
    ))

    it('relative path href from subpath with trailing slash without base href', () => assert.equal(
        rewriteHref('styles.css', 'https://eighty4.tech/blog/learn-learn-learn/', null),
        'https://eighty4.tech/blog/styles.css'
    ))

    it('relative path href from subpath with trailing slash with base href for host root', () => assert.equal(
        rewriteHref('styles.css', 'https://eighty4.tech/blog/learn-learn-learn/', '/'),
        'https://eighty4.tech/styles.css'
    ))

    it('relative path href from subpath with trailing slash with base href for subpath with trailing slash', () => assert.equal(
        rewriteHref('styles.css', 'https://eighty4.tech/blog/learn-learn-learn/', '/assets/'),
        'https://eighty4.tech/assets/styles.css'
    ))

    it('relative path href from subpath with trailing slash with base href for subpath without trailing slash', () => assert.equal(
        rewriteHref('styles.css', 'https://eighty4.tech/blog/learn-learn-learn/', '/pages/projects.html'),
        'https://eighty4.tech/pages/styles.css'
    ))

})
