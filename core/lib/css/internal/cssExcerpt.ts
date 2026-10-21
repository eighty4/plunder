import type { Location2 } from 'lightningcss'

export type CssCodeExcerpt = {
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

const LINE_BREAK = 10
const AMPERSAND = 64
const PAREN_LEFT = 40
const PAREN_RIGHT = 41

export function extractCssCodeExcerpt(
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
            throw Error(
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
