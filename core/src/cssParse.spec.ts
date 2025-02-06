import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {compareBreakpoints, type CssBreakpoint, parseCssForBreakpoints} from './cssParse.ts'

const test = (css: string, expected: Array<CssBreakpoint>) => {
    assert.deepEqual(parseCssForBreakpoints({
        url: 'https://eighty4.tech',
        css: [{content: css, source: 'inline'}],
    }).breakpoints, expected)
}

describe('parseCssForBreakpoints', () => {

    it('min-width: 1250px', () => {
        test('@media (min-width: 1250px) {* {background: cyan;}}', [{
            filename: 'https://eighty4.tech [inline#0]',
            lowerBound: {
                uom: 'px',
                value: 1250,
            },
            upperBound: undefined,
        }])
    })

    it('max-width: 1250px', () => {
        test('@media (max-width: 1250px) {* {background: cyan;}}', [{
            filename: 'https://eighty4.tech [inline#0]',
            lowerBound: undefined,
            upperBound: {
                uom: 'px',
                value: 1250,
            },
        }])
    })

    it('width > 800px', () => {
        test('@media (width > 800px) {* {background: cyan;}}', [{
            filename: 'https://eighty4.tech [inline#0]',
            lowerBound: {
                uom: 'px',
                value: 801,
            },
            upperBound: undefined,
        }])
    })

    it('width >= 800px', () => {
        test('@media (width >= 800px) {* {background: cyan;}}', [{
            filename: 'https://eighty4.tech [inline#0]',
            lowerBound: {
                uom: 'px',
                value: 800,
            },
            upperBound: undefined,
        }])
    })

    it('width < 800px', () => {
        test('@media (width < 800px) {* {background: cyan;}}', [{
            filename: 'https://eighty4.tech [inline#0]',
            lowerBound: undefined,
            upperBound: {
                uom: 'px',
                value: 799,
            },
        }])
    })

    it('width <= 800px', () => {
        test('@media (width <= 800px) {* {background: cyan;}}', [{
            filename: 'https://eighty4.tech [inline#0]',
            lowerBound: undefined,
            upperBound: {
                uom: 'px',
                value: 800,
            },
        }])
    })

    it('800px > width', () => {
        test('@media (800px > width) {* {background: cyan;}}', [{
            filename: 'https://eighty4.tech [inline#0]',
            lowerBound: undefined,
            upperBound: {
                uom: 'px',
                value: 799,
            },
        }])
    })

    it('800px >= width', () => {
        test('@media (800px >= width) {* {background: cyan;}}', [{
            filename: 'https://eighty4.tech [inline#0]',
            lowerBound: undefined,
            upperBound: {
                uom: 'px',
                value: 800,
            },
        }])
    })

    it('800px < width', () => {
        test('@media (800px < width) {* {background: cyan;}}', [{
            filename: 'https://eighty4.tech [inline#0]',
            lowerBound: {
                uom: 'px',
                value: 801,
            },
            upperBound: undefined,
        }])
    })

    it('800px <= width', () => {
        test('@media (800px <= width) {* {background: cyan;}}', [{
            filename: 'https://eighty4.tech [inline#0]',
            lowerBound: {
                uom: 'px',
                value: 800,
            },
            upperBound: undefined,
        }])
    })

    it('1250px >= width >= 500px', () => {
        test('@media (1250px >= width >= 500px) {*{background: cyan;}}', [{
            filename: 'https://eighty4.tech [inline#0]',
            lowerBound: {
                uom: 'px',
                value: 500,
            },
            upperBound: {
                uom: 'px',
                value: 1250,
            },
        }])
    })

    it('500px >= width >= 1250px', () => {
        test('@media (500px >= width >= 1250px) {*{background: cyan;}}', [])
    })

    it('500px <= width <= 1250px', () => {
        test('@media (500px <= width <= 1250px) {*{background: cyan;}}', [{
            filename: 'https://eighty4.tech [inline#0]',
            lowerBound: {
                uom: 'px',
                value: 500,
            },
            upperBound: {
                uom: 'px',
                value: 1250,
            },
        }])
    })

    it('1250px <= width <= 500px', () => {
        test('@media (1250px <= width <= 500px) {*{background: cyan;}}', [])
    })
})

describe('compareBreakpoints', () => {
    it('sorts on lower bound', () => {
        const breakpoints: Array<CssBreakpoint> = [{
            lowerBound: {value: 1250},
        }, {
            lowerBound: {value: 600},
        }, {
            lowerBound: {value: 900},
        }] as Array<CssBreakpoint>
        breakpoints.sort(compareBreakpoints)
        assert.equal(breakpoints[0].lowerBound?.value, 600)
        assert.equal(breakpoints[1].lowerBound?.value, 900)
        assert.equal(breakpoints[2].lowerBound?.value, 1250)
    })

    it('sorts on upper bound', () => {
        const breakpoints: Array<CssBreakpoint> = [{
            upperBound: {value: 1250},
        }, {
            upperBound: {value: 600},
        }, {
            upperBound: {value: 900},
        }] as Array<CssBreakpoint>
        breakpoints.sort(compareBreakpoints)
        assert.equal(breakpoints[0].upperBound?.value, 600)
        assert.equal(breakpoints[1].upperBound?.value, 900)
        assert.equal(breakpoints[2].upperBound?.value, 1250)
    })

    it('unbounded lower bound ordered first', () => {
        const breakpoints: Array<CssBreakpoint> = [{
            lowerBound: {value: 900},
            upperBound: {value: 1250},
        }, {
            upperBound: {value: 600},
        }, {
            upperBound: {value: 900},
        }] as Array<CssBreakpoint>
        breakpoints.sort(compareBreakpoints)
        assert.equal(breakpoints[0].lowerBound, undefined)
    })
})
