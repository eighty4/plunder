import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, it } from 'node:test'
import {
    compareBreakpoints,
    compareMediaQueries,
    type CssBreakpoint,
    type CssMediaQuery,
    parseCssForMediaQueries,
} from './cssParse.ts'

const parseTest = (css: string, expected: Array<CssMediaQuery>) => {
    assert.deepEqual(
        parseCssForMediaQueries({
            url: 'https://eighty4.tech',
            css: [{ content: css, source: 'inline' }],
        }).mediaQueries,
        expected,
    )
}

describe('parseCssForMediaQueries', () => {
    it('min-width: 1250px', () => {
        parseTest('@media (min-width: 1250px) {* {background: cyan;}}', [
            {
                filename: 'https://eighty4.tech [inline#0]',
                code: {
                    line: 0,
                    column: 1,
                    startIndex: 8,
                    endIndex: 25,
                    excerpt: 'min-width: 1250px',
                },
                breakpoints: [
                    {
                        bound: 'lower',
                        dimension: {
                            uom: 'px',
                            value: 1250,
                        },
                    },
                ],
            },
        ])
    })

    it('max-width: 1250px', () => {
        parseTest('@media (max-width: 1250px) {* {background: cyan;}}', [
            {
                filename: 'https://eighty4.tech [inline#0]',
                code: {
                    line: 0,
                    column: 1,
                    startIndex: 8,
                    endIndex: 25,
                    excerpt: 'max-width: 1250px',
                },
                breakpoints: [
                    {
                        bound: 'upper',
                        dimension: {
                            uom: 'px',
                            value: 1250,
                        },
                    },
                ],
            },
        ])
    })

    it('width > 800px', () => {
        parseTest('@media (width > 800px) {* {background: cyan;}}', [
            {
                filename: 'https://eighty4.tech [inline#0]',
                code: {
                    line: 0,
                    column: 1,
                    startIndex: 8,
                    endIndex: 21,
                    excerpt: 'width > 800px',
                },
                breakpoints: [
                    {
                        bound: 'lower',
                        dimension: {
                            uom: 'px',
                            value: 801,
                        },
                    },
                ],
            },
        ])
    })

    it('width >= 800px', () => {
        parseTest('@media (width >= 800px) {* {background: cyan;}}', [
            {
                filename: 'https://eighty4.tech [inline#0]',
                code: {
                    line: 0,
                    column: 1,
                    startIndex: 8,
                    endIndex: 22,
                    excerpt: 'width >= 800px',
                },
                breakpoints: [
                    {
                        bound: 'lower',
                        dimension: {
                            uom: 'px',
                            value: 800,
                        },
                    },
                ],
            },
        ])
    })

    it('width < 800px', () => {
        parseTest('@media (width < 800px) {* {background: cyan;}}', [
            {
                filename: 'https://eighty4.tech [inline#0]',
                code: {
                    line: 0,
                    column: 1,
                    startIndex: 8,
                    endIndex: 21,
                    excerpt: 'width < 800px',
                },
                breakpoints: [
                    {
                        bound: 'upper',
                        dimension: {
                            uom: 'px',
                            value: 799,
                        },
                    },
                ],
            },
        ])
    })

    it('width <= 800px', () => {
        parseTest('@media (width <= 800px) {* {background: cyan;}}', [
            {
                filename: 'https://eighty4.tech [inline#0]',
                code: {
                    line: 0,
                    column: 1,
                    startIndex: 8,
                    endIndex: 22,
                    excerpt: 'width <= 800px',
                },
                breakpoints: [
                    {
                        bound: 'upper',
                        dimension: {
                            uom: 'px',
                            value: 800,
                        },
                    },
                ],
            },
        ])
    })

    it('800px > width', () => {
        parseTest('@media (800px > width) {* {background: cyan;}}', [
            {
                filename: 'https://eighty4.tech [inline#0]',
                code: {
                    line: 0,
                    column: 1,
                    startIndex: 8,
                    endIndex: 21,
                    excerpt: '800px > width',
                },
                breakpoints: [
                    {
                        bound: 'upper',
                        dimension: {
                            uom: 'px',
                            value: 799,
                        },
                    },
                ],
            },
        ])
    })

    it('800px >= width', () => {
        parseTest('@media (800px >= width) {* {background: cyan;}}', [
            {
                filename: 'https://eighty4.tech [inline#0]',
                code: {
                    line: 0,
                    column: 1,
                    startIndex: 8,
                    endIndex: 22,
                    excerpt: '800px >= width',
                },
                breakpoints: [
                    {
                        bound: 'upper',
                        dimension: {
                            uom: 'px',
                            value: 800,
                        },
                    },
                ],
            },
        ])
    })

    it('800px < width', () => {
        parseTest('@media (800px < width) {* {background: cyan;}}', [
            {
                filename: 'https://eighty4.tech [inline#0]',
                code: {
                    line: 0,
                    column: 1,
                    startIndex: 8,
                    endIndex: 21,
                    excerpt: '800px < width',
                },
                breakpoints: [
                    {
                        bound: 'lower',
                        dimension: {
                            uom: 'px',
                            value: 801,
                        },
                    },
                ],
            },
        ])
    })

    it('800px <= width', () => {
        parseTest('@media (800px <= width) {* {background: cyan;}}', [
            {
                filename: 'https://eighty4.tech [inline#0]',
                code: {
                    line: 0,
                    column: 1,
                    startIndex: 8,
                    endIndex: 22,
                    excerpt: '800px <= width',
                },
                breakpoints: [
                    {
                        bound: 'lower',
                        dimension: {
                            uom: 'px',
                            value: 800,
                        },
                    },
                ],
            },
        ])
    })

    it('1250px >= width >= 500px', () => {
        parseTest('@media (1250px >= width >= 500px) {*{background: cyan;}}', [
            {
                filename: 'https://eighty4.tech [inline#0]',
                code: {
                    line: 0,
                    column: 1,
                    startIndex: 8,
                    endIndex: 32,
                    excerpt: '1250px >= width >= 500px',
                },
                breakpoints: [
                    {
                        bound: 'lower',
                        dimension: {
                            uom: 'px',
                            value: 500,
                        },
                    },
                    {
                        bound: 'upper',
                        dimension: {
                            uom: 'px',
                            value: 1250,
                        },
                    },
                ],
            },
        ])
    })

    it('500px <= width <= 1250px', () => {
        parseTest('@media (500px <= width <= 1250px) {*{background: cyan;}}', [
            {
                filename: 'https://eighty4.tech [inline#0]',
                code: {
                    line: 0,
                    column: 1,
                    startIndex: 8,
                    endIndex: 32,
                    excerpt: '500px <= width <= 1250px',
                },
                breakpoints: [
                    {
                        bound: 'lower',
                        dimension: { uom: 'px', value: 500 },
                    },
                    { bound: 'upper', dimension: { uom: 'px', value: 1250 } },
                ],
            },
        ])
    })

    describe('conflicting bounds are ignored', () => {
        it('1250px <= width <= 500px', () => {
            parseTest(
                '@media (1250px <= width <= 500px) {*{background: cyan;}}',
                [],
            )
        })

        it('500px >= width >= 1250px', () => {
            parseTest(
                '@media (500px >= width >= 1250px) {*{background: cyan;}}',
                [],
            )
        })
    })

    describe('extract css excerpt', () => {
        it('newlines and column within line', () => {
            parseTest(
                '\n\n*{background: cyan;}@media (width > 800px) {*{background: teal;}}',
                [
                    {
                        filename: 'https://eighty4.tech [inline#0]',
                        code: {
                            line: 2,
                            column: 21,
                            endIndex: 43,
                            startIndex: 30,
                            excerpt: 'width > 800px',
                        },
                        breakpoints: [
                            {
                                bound: 'lower',
                                dimension: {
                                    uom: 'px',
                                    value: 801,
                                },
                            },
                        ],
                    },
                ],
            )
        })

        it('parens on line before media query', async () => {
            parseTest(
                '\n\n*html :where([style*=border-width]){background: cyan;}@media (width > 800px) {*{background: teal;}}',
                [
                    {
                        filename: 'https://eighty4.tech [inline#0]',
                        code: {
                            line: 2,
                            column: 55,
                            endIndex: 77,
                            startIndex: 64,
                            excerpt: 'width > 800px',
                        },
                        breakpoints: [
                            {
                                bound: 'lower',
                                dimension: {
                                    uom: 'px',
                                    value: 801,
                                },
                            },
                        ],
                    },
                ],
            )
        })

        it('screen param on media query', async () => {
            parseTest(
                '\n\n@media screen and (width > 800px) {*{background: teal;}}',
                [
                    {
                        filename: 'https://eighty4.tech [inline#0]',
                        code: {
                            line: 2,
                            column: 1,
                            endIndex: 34,
                            startIndex: 21,
                            excerpt: 'width > 800px',
                        },
                        breakpoints: [
                            {
                                bound: 'lower',
                                dimension: {
                                    uom: 'px',
                                    value: 801,
                                },
                            },
                        ],
                    },
                ],
            )
        })

        it('fixtures/incorrect_loc_column.css', async () => {
            const css = await readFile(
                path.join(
                    process.cwd(),
                    'fixtures',
                    'incorrect_loc_column.css',
                ),
            )
            parseTest(css.toString(), [
                {
                    filename: 'https://eighty4.tech [inline#0]',
                    code: {
                        line: 0,
                        column: 62,
                        startIndex: 71,
                        endIndex: 86,
                        excerpt: 'max-width:600px',
                    },
                    breakpoints: [
                        {
                            bound: 'upper',
                            dimension: {
                                uom: 'px',
                                value: 600,
                            },
                        },
                    ],
                },
            ])
        })
    })
})

describe('compareBreakpoints', () => {
    it('sorts on lower bound', () => {
        const breakpoints: Array<CssBreakpoint> = [
            {
                bound: 'lower' as const,
                dimension: { uom: 'px' as const, value: 1250 },
            },
            {
                bound: 'lower' as const,
                dimension: { uom: 'px' as const, value: 600 },
            },
            {
                bound: 'lower' as const,
                dimension: { uom: 'px' as const, value: 900 },
            },
        ].sort(compareBreakpoints)
        assert.deepEqual(breakpoints[0], {
            bound: 'lower' as const,
            dimension: { uom: 'px' as const, value: 600 },
        })
        assert.deepEqual(breakpoints[1], {
            bound: 'lower' as const,
            dimension: { uom: 'px' as const, value: 900 },
        })
        assert.deepEqual(breakpoints[2], {
            bound: 'lower' as const,
            dimension: { uom: 'px' as const, value: 1250 },
        })
    })

    it('sorts on upper bound', () => {
        const breakpoints: Array<CssBreakpoint> = [
            {
                bound: 'upper' as const,
                dimension: { uom: 'px' as const, value: 1250 },
            },
            {
                bound: 'upper' as const,
                dimension: { uom: 'px' as const, value: 600 },
            },
            {
                bound: 'upper' as const,
                dimension: { uom: 'px' as const, value: 900 },
            },
        ].sort(compareBreakpoints)
        assert.deepEqual(breakpoints[0], {
            bound: 'upper' as const,
            dimension: { uom: 'px' as const, value: 600 },
        })
        assert.deepEqual(breakpoints[1], {
            bound: 'upper' as const,
            dimension: { uom: 'px' as const, value: 900 },
        })
        assert.deepEqual(breakpoints[2], {
            bound: 'upper' as const,
            dimension: { uom: 'px' as const, value: 1250 },
        })
    })

    it('upper bound sorted before lower bound', () => {
        const breakpoints = [
            {
                bound: 'lower' as const,
                dimension: { uom: 'px' as const, value: 900 },
            },
            {
                bound: 'upper' as const,
                dimension: { uom: 'px' as const, value: 1250 },
            },
        ].sort(compareBreakpoints)
        assert.deepEqual(breakpoints[0], {
            bound: 'upper' as const,
            dimension: { uom: 'px' as const, value: 1250 },
        })
        assert.deepEqual(breakpoints[1], {
            bound: 'lower' as const,
            dimension: { uom: 'px' as const, value: 900 },
        })
    })
})

describe('compareMediaQueries', () => {
    it('unbounded lower bound ordered first', () => {
        const mediaQueries: Array<CssMediaQuery> = [
            {
                filename: 'upper/lower',
                code: {
                    startIndex: 0,
                    endIndex: 1,
                    line: 0,
                    column: 1,
                    excerpt: '',
                },
                breakpoints: [
                    {
                        bound: 'lower' as const,
                        dimension: { uom: 'px' as const, value: 900 },
                    },
                    {
                        bound: 'upper' as const,
                        dimension: { uom: 'px' as const, value: 1250 },
                    },
                ],
            },
            {
                filename: 'lower upper',
                code: {
                    startIndex: 0,
                    endIndex: 1,
                    line: 0,
                    column: 1,
                    excerpt: '',
                },
                breakpoints: [
                    {
                        bound: 'upper' as const,
                        dimension: { uom: 'px' as const, value: 600 },
                    },
                ],
            },
            {
                filename: 'upper upper',
                code: {
                    startIndex: 0,
                    endIndex: 1,
                    line: 0,
                    column: 1,
                    excerpt: '',
                },
                breakpoints: [
                    {
                        bound: 'upper' as const,
                        dimension: { uom: 'px' as const, value: 900 },
                    },
                ],
            },
        ].sort(compareMediaQueries)
        assert.equal(
            mediaQueries[0].breakpoints.some(b => b.bound === 'lower'),
            false,
        )
    })
})
