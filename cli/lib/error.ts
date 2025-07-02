import ansi from './ansi.ts'

export function errorPrint(err: unknown, optParseError?: boolean): never {
    console.log(ansi.bold(ansi.red('error:')), err)
    if (optParseError) {
        console.log(`\nFor more information, try '${ansi.bold('--help')}'.`)
    }
    process.exit(1)
}
