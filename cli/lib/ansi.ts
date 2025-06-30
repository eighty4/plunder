export default {
    bold: (s: string) => `\u001b[1m${s}\u001b[0m`,
    underline: (s: string) => `\u001b[4m${s}\u001b[0m`,
    red: (s: number | string) => `\u001b[31m${s}\u001b[0m`,
    green: (s: number | string) => `\u001b[32m${s}\u001b[0m`,
    grey: (s: number | string) => `\u001b[90m${s}\u001b[0m`,
    rewriteLines: (n: number, s: string) => {
        let seq = ''
        for (let i = 0; i < n; i++) {
            seq += `\u001b[A`
        }
        console.log(seq + s)
    },
}
