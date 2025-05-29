import { isAbsolute, resolve } from 'node:path'
import type { Page } from 'playwright'

export type CaptureHook = (page: Page) => Promise<void>

// Error type used when error is thrown from capture hook fn.
export class CaptureHookError extends Error {
    cause: Error
    #specifier: string
    #url: string
    constructor(url: string, specifier: string, cause: Error) {
        super(`${cause.name}: ${cause.message}`, { cause })
        this.cause = cause
        this.name = this.constructor.name
        this.#specifier = specifier
        this.#url = url
    }
    get specifier(): string {
        return this.#specifier
    }
    get url(): string {
        return this.#url
    }
}

export async function resolveCaptureHook(
    specifier: string,
): Promise<CaptureHook> {
    const { path, fn } = resolveCaptureHookImport(specifier)
    let m
    try {
        m = await import(path)
    } catch (e: any) {
        throw new CaptureHookImportError(
            e instanceof SyntaxError ? 'IMPORT_SYNTAX_ERR' : 'IMPORT_NOT_FOUND',
            path,
            fn,
            specifier,
            e,
        )
    }
    if (
        !m[fn] ||
        (fn === 'default' && typeof m['module.exports'] === 'object')
    ) {
        throw new CaptureHookImportError(
            'EXPORT_NOT_FOUND',
            path,
            fn,
            specifier,
        )
    }
    if (typeof m[fn] !== 'function') {
        throw new CaptureHookImportError(
            'EXPORT_NOT_FUNCTION',
            path,
            fn,
            specifier,
            typeof m[fn],
        )
    }
    return async (page: Page) => {
        try {
            await m[fn](page)
        } catch (e: any) {
            throw new CaptureHookError(page.url(), specifier, e)
        }
    }
}

export type CaptureHookImport = {
    path: string
    fn: string
}

export type CaptureHookImportErrorCode =
    | 'IMPORT_NOT_FOUND'
    | 'IMPORT_SYNTAX_ERR'
    | 'EXPORT_NOT_FOUND'
    | 'EXPORT_NOT_FUNCTION'

export class CaptureHookImportError extends Error {
    cause?: Error | string
    #code: CaptureHookImportErrorCode
    #path: string
    #fn: string
    #specifier: string
    constructor(
        code: CaptureHookImportErrorCode,
        path: string,
        fn: string,
        specifier: string,
        cause?: Error | string,
    ) {
        super(`${code}: ${specifier}`, { cause })
        this.cause = cause
        this.name = this.constructor.name
        this.#code = code
        this.#path = path
        this.#fn = fn
        this.#specifier = specifier
    }
    get code(): CaptureHookImportErrorCode {
        return this.#code
    }
    get path(): string {
        return this.#path
    }
    get fn(): string {
        return this.#fn
    }
    get specifier(): string {
        return this.#specifier
    }
}

export function resolveCaptureHookImport(specifier: string): CaptureHookImport {
    if (specifier === null || typeof specifier !== 'string') {
        throw new TypeError('resolveCaptureHookImport arg must be a string')
    }
    const fnSuffixIndex = specifier.search(/#.*$/)
    let path =
        fnSuffixIndex === -1 ? specifier : specifier.substring(0, fnSuffixIndex)
    if (!isAbsolute(path)) {
        path = resolve(process.cwd(), path)
    }
    const fn =
        fnSuffixIndex === -1
            ? 'default'
            : specifier.substring(fnSuffixIndex + 1)
    return { path, fn }
}
