import {
    type MediaQuery,
    type ReturnedMediaQuery,
    transform,
} from 'lightningcss'
import type {FindCssResult} from './cssFind.js'

// todo convert rem to px
export type CssUom = 'px' | 'rem'

export interface CssDimension {
    uom: CssUom
    value: number
}

export interface CssBreakpoint {
    filename: string
    exact?: CssDimension
    lowerBound?: CssDimension
    upperBound?: CssDimension
}

export interface ParseCssResult {
    breakpoints: Array<CssBreakpoint>
    url: string;
}

export function parseCssForBreakpoints(
    foundCss: FindCssResult,
): ParseCssResult {
    let inlineI = 0
    return {
        url: foundCss.url,
        breakpoints: foundCss.css.flatMap((css) => {
            const filename = css.uri || `${foundCss.url} [inline#${inlineI++}]`
            const buffer = Buffer.from(css.content)
            return collectApplicableMediaQueries(filename, buffer)
        }),
    }
}

function collectApplicableMediaQueries(
    filename: string,
    code: Uint8Array,
): Array<CssBreakpoint> {
    const breakpoints: Array<CssBreakpoint> = []
    transform({
        code,
        filename,
        minify: false,
        visitor: {
            MediaQuery(
                query: MediaQuery,
            ): ReturnedMediaQuery | ReturnedMediaQuery[] | void {
                if (query.condition?.type === 'feature') {
                    if (query.condition?.value?.type === 'interval') {
                        const breakpoint = createCssBreakpointFromInterval(
                            filename,
                            query.condition?.value?.startOperator,
                            getCssDimension(query.condition?.value?.start),
                            query.condition?.value?.endOperator,
                            getCssDimension(query.condition?.value?.end))
                        if (breakpoint) {
                            breakpoints.push(breakpoint)
                        }
                    } else if (query.condition?.value?.type === 'range') {
                        const operator = query.condition?.value?.operator
                        const dimension = getCssDimension(query.condition?.value?.value)
                        breakpoints.push(createCssBreakpointFromRange(filename, operator, dimension))
                    }
                }
            },
        },
    })
    return breakpoints.sort(compareBreakpoints)
}

function getCssDimension(obj: any): CssDimension {
    if (obj?.type === 'length') {
        if (obj?.value?.type === 'value') {
            const uom = obj.value?.value?.unit
            if (uom !== 'px') {
                throw new Error()
            }
            const value = obj.value?.value?.value
            return {uom, value}
        }
    }
    throw new Error()
}

function createCssBreakpointFromInterval(
    filename: string,
    startOperator: any,
    startDimension: CssDimension,
    endOperator: any,
    endDimension: CssDimension,
): CssBreakpoint | undefined {
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
            filename,
            lowerBound,
            upperBound,
        }
    }
}

function createCssBreakpointFromRange(filename: string, operator: any, dimension: CssDimension): CssBreakpoint {
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
    return {
        filename,
        lowerBound,
        upperBound,
    }
}

export function compareBreakpoints(a: CssBreakpoint, b: CssBreakpoint): number {
    if (a.lowerBound && b.lowerBound) {
        const comparedLowerBounds = compareBounds(a.lowerBound, b.lowerBound)
        switch (comparedLowerBounds) {
            case 0:
                return compareBounds(a.upperBound, b.upperBound)
            default:
                return comparedLowerBounds
        }
    }
    if (!a.lowerBound && !b.lowerBound) {
        return compareBounds(a.upperBound, b.upperBound)
    }
    if (a.upperBound && b.upperBound) {
        return compareBounds(a.upperBound, b.upperBound)
    }
    return a.lowerBound ? 1 : -1
}

function compareBounds(a?: CssDimension, b?: CssDimension): number {
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
