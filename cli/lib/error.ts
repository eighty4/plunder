import ansi from './ansi.ts'

export function errorPrint(s: string, optParseError?: boolean): never {
    console.log(ansi.bold(ansi.red('error:')), s)
    if (optParseError) {
        console.log(`\nFor more information, try '${ansi.bold('--help')}'.`)
    }
    process.exit(1)
}
