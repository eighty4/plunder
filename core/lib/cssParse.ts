import {
    type Location2,
    type MediaQuery,
    type Rule,
    transform,
} from 'lightningcss'
import type { FindCssResult } from './cssFind.ts'

export interface ParseCssResult {
    mediaQueries: Array<CssMediaQuery>
    url: string
}

export interface CssMediaQuery {
    breakpoints: Array<CssBreakpoint>
    code: CssCodeExcerpt
    filename: string
}

export interface CssCodeExcerpt {
    // logical column number
    column: number
    // logical line number
    line: number
    // source file index of excerpt end
    endIndex: number
    // source file index of excerpt start
    startIndex: number
    excerpt: string
}

export interface CssBreakpoint {
    bound: 'exact' | 'lower' | 'upper'
    dimension: CssDimension
}

export interface CssDimension {
    uom: CssUom
    value: number
}

// todo convert rem to px
export type CssUom = 'px' | 'rem'

export function parseCssForMediaQueries(
    foundCss: FindCssResult,
): ParseCssResult {
    let inlineI = 0
    return {
        url: foundCss.url,
        mediaQueries: foundCss.css.flatMap(css => {
            const filename = css.uri || `${foundCss.url} [inline#${inlineI++}]`
            const buffer = Buffer.from(css.content)
            try {
                return collectApplicableMediaQueries(filename, buffer)
            } catch (e: any) {
                // todo capture css errors to write to plunder.json
                // throw new Error(`lightningcss error processing from webpage '${foundCss.url}'\n\nfilename:${e.fileName}\nsource:${e.source}\nlocation:${e.location}\ndata:${e.data}`)
                return []
            }
        }),
    }
}

function collectApplicableMediaQueries(
    filename: string,
    code: Uint8Array,
): Array<CssMediaQuery> {
    let location: Location2
    let excerpt: CssCodeExcerpt | null = null
    const mediaQueries: Array<CssMediaQuery> = []
    transform({
        code,
        filename,
        errorRecovery: true,
        minify: false,
        visitor: {
            Rule(rule: Rule): void {
                if (rule.type === 'media') {
                    location = rule.value.loc
                    excerpt = null
                    //excerpt = extractMediaQueryExcerpt(code, rule.value.loc)
                }
            },
            MediaQuery(query: MediaQuery): void {
                if (query.condition?.type === 'feature') {
                    if (query.condition?.value?.type === 'interval') {
                        const mediaQuery = createCssMediaQueryFromInterval(
                            excerpt === null
                                ? (excerpt = extractMediaQueryExcerpt(
                                      code,
                                      location,
                                  ))
                                : excerpt,
                            filename,
                            query.condition?.value?.startOperator,
                            getCssDimension(query.condition?.value?.start),
                            query.condition?.value?.endOperator,
                            getCssDimension(query.condition?.value?.end),
                        )
                        if (mediaQuery) {
                            mediaQueries.push(mediaQuery)
                        }
                    } else if (query.condition?.value?.type === 'range') {
                        const operator = query.condition?.value?.operator
                        const dimension = getCssDimension(
                            query.condition?.value?.value,
                        )
                        mediaQueries.push(
                            createCssMediaQueryFromRange(
                                excerpt === null
                                    ? (excerpt = extractMediaQueryExcerpt(
                                          code,
                                          location,
                                      ))
                                    : excerpt,
                                filename,
                                operator,
                                dimension,
                            ),
                        )
                    }
                }
            },
        },
    })
    return mediaQueries.sort(compareMediaQueries)
}

const LINE_BREAK = 10
const PAREN_LEFT = 40
const PAREN_RIGHT = 41
const AMPERSAND = 64

function extractMediaQueryExcerpt(
    code: Uint8Array,
    loc: Location2,
): CssCodeExcerpt {
    let index = 0
    let lineBreaks = loc.line
    while (lineBreaks > 0) {
        if (code.at(index) === LINE_BREAK) {
            lineBreaks--
        }
        index++
    }
    index += loc.column
    let excerptStart: number = -1
    let excerptEnd: number = -1
    let logicalParens: number = 0

    // large minified css loc for media query is offset by a couple chars
    let limitLocOffset = 3
    if (code.slice(index, index + 5).toString() !== 'media') {
        while (limitLocOffset && code.at(index) !== AMPERSAND) {
            limitLocOffset--
            index++
        }
        index++
        const wordAtIndex = code.slice(index, index + 5).toString()
        if (wordAtIndex !== 'media') {
            throw new Error(
                `${index} is not the start of @media and instead points to \`${wordAtIndex}\``,
            )
        }
    }

    while (index < code.length && excerptEnd === -1) {
        if (code.at(index) === PAREN_LEFT) {
            if (excerptStart === -1) {
                excerptStart = index + 1
            }
            logicalParens++
        }
        if (code.at(index) === PAREN_RIGHT) {
            logicalParens--
            if (logicalParens === 0) {
                excerptEnd = index
            }
        }
        index++
    }
    const excerpt = code.slice(excerptStart, excerptEnd).toString()
    return {
        column: loc.column,
        line: loc.line,
        startIndex: excerptStart,
        endIndex: excerptEnd,
        excerpt,
    }
}

function getCssDimension(obj: any): CssDimension {
    if (obj?.type === 'length') {
        if (obj?.value?.type === 'value') {
            const uom = obj.value?.value?.unit
            if (uom !== 'px') {
                throw new Error()
            }
            const value = obj.value?.value?.value
            return { uom, value }
        }
    }
    throw new Error()
}

function createCssMediaQueryFromInterval(
    code: CssCodeExcerpt,
    filename: string,
    startOperator: any,
    startDimension: CssDimension,
    endOperator: any,
    endDimension: CssDimension,
): CssMediaQuery | undefined {
    let lowerBound: CssDimension | undefined
    let upperBound: CssDimension | undefined
    switch (startOperator) {
        case 'greater-than':
            startDimension.value--
            upperBound = startDimension
            break
        case 'greater-than-equal':
            upperBound = startDimension
            break
        case 'less-than':
            startDimension.value--
            lowerBound = startDimension
            break
        case 'less-than-equal':
            lowerBound = startDimension
            break
    }
    switch (endOperator) {
        case 'greater-than':
            endDimension.value--
            lowerBound = endDimension
            break
        case 'greater-than-equal':
            lowerBound = endDimension
            break
        case 'less-than':
            endDimension.value--
            upperBound = endDimension
            break
        case 'less-than-equal':
            upperBound = endDimension
            break
    }
    if (!lowerBound || !upperBound) {
        throw new Error()
    }
    if (lowerBound!.value < upperBound!.value) {
        return {
            code,
            filename,
            breakpoints: [
                { bound: 'lower', dimension: lowerBound },
                { bound: 'upper', dimension: upperBound },
            ],
        }
    }
}

function createCssMediaQueryFromRange(
    code: CssCodeExcerpt,
    filename: string,
    operator: any,
    dimension: CssDimension,
): CssMediaQuery {
    let lowerBound: CssDimension | undefined
    let upperBound: CssDimension | undefined
    switch (operator) {
        case 'greater-than':
            dimension.value++
            lowerBound = dimension
            break
        case 'greater-than-equal':
            lowerBound = dimension
            break
        case 'less-than':
            dimension.value--
            upperBound = dimension
            break
        case 'less-than-equal':
            upperBound = dimension
            break
    }
    const breakpoints: Array<CssBreakpoint> = []
    if (lowerBound) {
        breakpoints.push({
            bound: 'lower',
            dimension: lowerBound,
        })
    }
    if (upperBound) {
        breakpoints.push({
            bound: 'upper',
            dimension: upperBound,
        })
    }
    return {
        code,
        breakpoints,
        filename,
    }
}

type CompareResult = -1 | 0 | 1

export function compareMediaQueries(
    a: CssMediaQuery,
    b: CssMediaQuery,
): CompareResult {
    a.breakpoints.sort(compareBreakpoints)
    b.breakpoints.sort(compareBreakpoints)
    if (isMediaQueryUnbounded(a, 'lower')) {
        return -1
    } else {
    }
    return 0
}

function isMediaQueryUnbounded(
    mq: CssMediaQuery,
    bound: 'lower' | 'upper',
): boolean {
    return mq.breakpoints.every(b => b.bound !== bound)
}

export function compareBreakpoints(
    a: CssBreakpoint,
    b: CssBreakpoint,
): CompareResult {
    if (a.bound === b.bound) {
        return compareDimensions(a.dimension, b.dimension)
    } else if (a.bound === 'upper') {
        return -1
    } else {
        return 1
    }
}

export function compareDimensions(
    a?: CssDimension,
    b?: CssDimension,
): CompareResult {
    if (a && b) {
        if (a.value === b.value) {
            return 0
        } else if (a.value > b.value) {
            return 1
        } else {
            return -1
        }
    }
    return a ? 1 : -1
}
